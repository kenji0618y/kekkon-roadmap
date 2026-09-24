#!/usr/bin/env python3
"""Center-pad phase PNGs on a cream 1024 canvas with safe margins.

After letterbox trim, subject content sits flush to bitmap edges. Combined with
overflow:hidden + border-radius that reads as heads/hair cropped. This script
scales content to ~87% and centers it on #e8dfd0 so ~6.5% cream margin remains
on every side. Keeps 1024x1024 PNG. Does not touch src/data.
"""
from __future__ import annotations

from pathlib import Path
import argparse
from PIL import Image

TARGET = 1024
SCALE = 0.87
CREAM = (0xE8, 0xDF, 0xD0)


def safe_pad(image: Image.Image, scale: float = SCALE) -> Image.Image:
    rgb = image.convert("RGB")
    content_size = max(1, round(TARGET * scale))
    resized = rgb.resize((content_size, content_size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (TARGET, TARGET), CREAM)
    offset = (TARGET - content_size) // 2
    canvas.paste(resized, (offset, offset))
    return canvas


def content_top_gap(image: Image.Image, cream: tuple[int, int, int] = CREAM, tol: int = 14) -> int:
    rgb = image.convert("RGB")
    w, h = rgb.size
    for y in range(h):
        for x in range(0, w, 4):
            r, g, b = rgb.getpixel((x, y))
            if abs(r - cream[0]) > tol or abs(g - cream[1]) > tol or abs(b - cream[2]) > tol:
                return y
    return h


def process(path: Path, scale: float) -> tuple[int, int]:
    with Image.open(path) as before:
        before_gap = content_top_gap(before)
        result = safe_pad(before, scale=scale)
    after_gap = content_top_gap(result)
    result.save(path, format="PNG", optimize=True)
    return before_gap, after_gap


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "public" / "phases",
    )
    parser.add_argument("--scale", type=float, default=SCALE)
    args = parser.parse_args()
    paths = sorted(args.dir.glob("*.png"))
    if not paths:
        raise SystemExit(f"no PNGs in {args.dir}")
    print(f"safe-pad scale={args.scale} cream=#{CREAM[0]:02x}{CREAM[1]:02x}{CREAM[2]:02x} → {args.dir}")
    for path in paths:
        before_gap, after_gap = process(path, args.scale)
        print(f"  {path.name}: top_gap {before_gap} → {after_gap}")


if __name__ == "__main__":
    main()
