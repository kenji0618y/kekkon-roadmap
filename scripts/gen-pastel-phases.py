#!/usr/bin/env python3
"""Generate pastel watercolor phase cards via xAI Imagine edits + style reference."""
from __future__ import annotations

import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "phases"
STYLE = ROOT / "style-ref.jpg"
KEY_PATH = Path("/tmp/.xai_key")
MODEL = "grok-imagine-image"  # solid quality/cost; edits with reference
MAX_WORKERS = 4

STYLE_PREFIX = """Soft watercolor / pastel hand-drawn illustration matching this Grok lifestyle-flyer reference exactly (NOT flat vector, NOT photoreal, NOT teal flat art).
Warm cream / off-white textured paper background.
Muted pastels only: sage/mint green, dusty pink, pale yellow, light blue, soft brown sketched outlines.
Gentle smiling simple faces OK (dot eyes, soft curve smile). Warm nurturing dual-income lifestyle-magazine / municipal pamphlet vibe.
Textured fuzzy crayon / watercolor edges; soft irregular fills.
Composition: single calm square scene suitable as a phase card (~1024).

STRICT FORBIDDEN: wedding dress, chapel, ceremony, confetti, celebration balloons, 寿 kanji, any readable yen amounts, 30万, 60万, currency symbols, barcode-like numbers, photorealism, hard black outlines, flat solid vector shapes.
Papers/books may show only abstract scribble lines — NO readable letters, NO kanji, NO digits.
"""

# filename -> scene theme (unique enough so related cards still feel like one set)
THEMES: dict[str, str] = {
    "gen-filing.png": "Calm dual-income couple at a municipal desk reviewing marriage-registration paperwork, sage sprout accent, coffee cup, open notebook with scribble lines.",
    "lux-filing.png": "Soft overhead view of neat municipal forms stacked on cream paper desk with sage leaf, stamp pad (no readable ink text), gentle couple silhouettes at edge.",
    "phase0-filing.png": "Couple standing politely at a soft city-hall counter window, clerk handing a blank form with scribble lines, mint plant on counter, warm calm mood.",
    "rm-filing.png": "Hands gently arranging filing folders and a soft clipboard on washi desk, dusty pink binder, sage paperclip icons, nurturing office-life vibe.",
    "gen-cohabit.png": "Couple unpacking a small apartment together — cardboard box, houseplant, soft sofa, pale yellow lamp, mint curtains; cozy dual-income cohabitation.",
    "lux-cohabit.png": "Shared breakfast at a tiny table: toast, steaming cups, morning light, window with soft city hints; gentle smiles, home-together mood.",
    "phase0b-cohabit.png": "Couple hanging a small framed picture and watering a sage plant in a new rented room; warm cream walls, soft brown furniture outlines.",
    "rm-namechange.png": "Soft scene of name-seal (inkan) and blank name-change form with scribble lines on desk, couple discussing calmly, no readable text, municipal procedure mood.",
    "rm-company.png": "Two colleagues / partners reviewing workplace leave papers at a soft office desk with mint sticky notes (blank scribbles), calm dual-income work life — NOT a wedding.",
    "gen-pregnant.png": "Expectant parent resting with partner on a sofa, soft belly, pale yellow blanket, dusty pink heart accent, warm prenatal calm (no medical gore).",
    "lux-pregnant.png": "Prenatal checkup waiting mood: soft clinic chair, partner holding hand, mint sprout icon, gentle smiles, lifestyle pamphlet feel.",
    "phase2-pregnant.png": "Couple walking slowly in a park with sage trees, soft sky, pale yellow sun, pregnant silhouette, nurturing stroll.",
    "rm-prenatal.png": "Health-prep desk: maternal handbook with scribble lines, vitamins bottle (no labels), calendar with blank boxes, soft sage accents.",
    "gen-birth.png": "Newborn wrapped in soft blanket in parent's arms, partner nearby with gentle smile, pale blue accents, hospital-room calm — no clinical harshness.",
    "lux-birth.png": "Family first moment: tiny baby feet, soft stuffed bear, dusty pink blanket folds, cream paper background, tender watercolor.",
    "phase3-birth.png": "Parents with newborn in a quiet room, soft window light, mint plant, warm brown outlines, peaceful birth-stage card.",
    "rm-birth-money.png": "Calm money-planning for newborn stage: soft piggy bank, blank ledger with scribble lines, baby rattle, sage leaves — NO yen digits.",
    "rm-allowance.png": "Child allowance paperwork mood: soft envelope, blank form scribbles, family of three silhouette, mint checkmark icon (no numbers).",
    "gen-daycare.png": "Parent dropping toddler at daycare: soft cubbies, backpack, building blocks, sage wall accents, gentle teacher wave.",
    "rm-daycare.png": "Daycare courtyard: children with simple faces playing with pastel balls, soft fence, pale yellow sun, nurturing care vibe.",
    "phase4-infant.png": "Infant stage: baby on play mat with soft toys, parent sitting nearby reading a blank-scribble book, dusty pink mobile.",
    "phase5-preschool.png": "Preschool morning: child with mint backpack, parent waving at soft school gate, pale blue sky, warm routine.",
    "lux-home.png": "Looking at a modest home exterior with soft red-brown roof, couple holding hands, sage garden, calm housing stage.",
    "phase6-home.png": "Cozy living room of a small family home: sofa, houseplant, soft lamp, child toys in corner, warm domestic watercolor.",
    "rm-mortgage.png": "Housing loan consult mood: couple at table with blank floor-plan sketch (no numbers), soft calculator with blank screen, mint house icon.",
    "lux-money.png": "Family budget talk: couple and soft coins/jar (no yen marks), notebook with scribble lines, pale yellow lamp, calm planning.",
    "gen-money-family.png": "Dual-income family money rhythm: shared calendar, blank spreadsheet scribbles, coffee, sage plant, cooperative mood.",
    "phase7-hedge.png": "Life hedge / insurance calm: soft umbrella icon in sage, family under gentle rain clouds turning to pale sun, protective nurturing vibe.",
    "phase8-divorce-hedge.png": "Careful contingency planning (NOT a fight): two calm adults at separate soft desks connected by a gentle bridge of paper, mint sprout of hope — respectful, no drama.",
    "phase1-prep.png": "Marriage prep without ceremony: checklist clipboard with scribble lines, health forms, couple planning at kitchen table, pale yellow mug.",
    "gen-stamp-board.png": "Stamp-rally board illustration: soft grid of empty rounded stamp squares on cream paper, sage corner leaves, dusty pink wax-seal doodle (blank), lifestyle flyer layout.",
    "gen-stamp-grid.png": "Soft 4x4 stamp grid on washi paper with empty circles waiting for stamps, mint leaf decorations, pale yellow accents, no text.",
}


def load_key() -> str:
    return KEY_PATH.read_text().strip()


def style_data_url() -> str:
    b64 = base64.b64encode(STYLE.read_bytes()).decode()
    return f"data:image/jpeg;base64,{b64}"


def generate_one(filename: str, theme: str, style_url: str, key: str, retries: int = 3) -> tuple[str, str]:
    prompt = f"{STYLE_PREFIX}\nScene theme: {theme}\n"
    body = {
        "model": MODEL,
        "prompt": prompt,
        "aspect_ratio": "1:1",
        "response_format": "b64_json",
        "image": {"url": style_url, "type": "image_url"},
    }
    data = json.dumps(body).encode()
    last_err = ""
    for attempt in range(retries):
        req = urllib.request.Request(
            "https://api.x.ai/v1/images/edits",
            data=data,
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                payload = json.loads(resp.read())
            item = payload["data"][0]
            if "b64_json" in item and item["b64_json"]:
                raw = base64.b64decode(item["b64_json"])
            else:
                with urllib.request.urlopen(item["url"], timeout=60) as img:
                    raw = img.read()
            dest = OUT / filename
            dest.write_bytes(raw)
            return filename, f"OK {len(raw)} bytes"
        except urllib.error.HTTPError as e:
            last_err = e.read().decode("utf-8", "replace")[:300]
            time.sleep(2 + attempt * 3)
        except Exception as e:
            last_err = f"{type(e).__name__}: {e}"
            time.sleep(2 + attempt * 3)
    return filename, f"FAIL {last_err}"


def main() -> int:
    if not STYLE.exists():
        print("missing style-ref.jpg", file=sys.stderr)
        return 1
    key = load_key()
    style_url = style_data_url()
    # remove test file if present
    test = OUT / "_test-filing.png"
    if test.exists():
        test.unlink()
    items = list(THEMES.items())
    print(f"Generating {len(items)} images with model={MODEL} workers={MAX_WORKERS}")
    ok = fail = 0
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futs = {ex.submit(generate_one, fn, theme, style_url, key): fn for fn, theme in items}
        for fut in as_completed(futs):
            fn, msg = fut.result()
            print(f"{fn}: {msg}")
            if msg.startswith("OK"):
                ok += 1
            else:
                fail += 1
    print(f"DONE ok={ok} fail={fail}")
    return 0 if fail == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
