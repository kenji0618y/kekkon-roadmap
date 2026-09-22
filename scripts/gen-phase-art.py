#!/usr/bin/env python3
"""Generate coherent soft flat-vector phase illustrations for kekkon-roadmap."""
from __future__ import annotations

import math
import os
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageChops

OUT = Path(__file__).resolve().parents[1] / "public" / "phases"
SIZE = 1024  # square-ish as requested; UI object-fit:cover handles crop

# Desk UI palette
CREAM = (247, 243, 232)
CREAM_DEEP = (232, 223, 208)
PAPER = (255, 249, 237)
TEAL = (24, 54, 69)          # #183645
TEAL_MID = (37, 76, 85)      # #254c55
TEAL_SOFT = (92, 115, 122)   # #5c737a
TEAL_LIGHT = (183, 198, 203) # #b7c6cb
INK = (30, 45, 52)
CORAL = (167, 72, 55)        # #a74837
CORAL_SOFT = (172, 97, 80)
GOLD = (174, 145, 84)        # #ae9154
GOLD_SOFT = (211, 184, 128)
WOOD = (196, 168, 130)
WOOD_DARK = (150, 118, 85)
WHITE = (255, 253, 248)
LEAF = (111, 142, 118)
HAIR = (58, 48, 42)
SKIN = (232, 205, 180)
SKIN2 = (220, 188, 160)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def rgba(rgb, a=255):
    return (*rgb, a)


def washi_base(size=SIZE) -> Image.Image:
    """Warm cream washi with subtle fiber noise (vectorized)."""
    import numpy as np
    rng = np.random.default_rng(42)
    yy, xx = np.mgrid[0:size, 0:size]
    wave = (3 * np.sin((xx + yy) * 0.04) + 2 * np.cos((xx - yy) * 0.03)).astype(np.float32)
    n = rng.integers(-6, 7, size=(size, size), dtype=np.int16)
    r = np.clip(CREAM[0] + n + wave, 0, 255)
    g = np.clip(CREAM[1] + n + wave - 1, 0, 255)
    b = np.clip(CREAM[2] + n + wave - 2, 0, 255)
    dx = np.abs(xx - size / 2) / (size / 2)
    dy = np.abs(yy - size / 2) / (size / 2)
    edge = np.maximum(dx, dy)
    t = np.clip((edge - 0.82) / 0.18, 0, 1) * 0.35
    r = r * (1 - t) + CREAM_DEEP[0] * t
    g = g * (1 - t) + CREAM_DEEP[1] * t
    b = b * (1 - t) + CREAM_DEEP[2] * t
    arr = np.stack([r, g, b], axis=-1).astype(np.uint8)
    img = Image.fromarray(arr, "RGB")
    noise = rng.integers(120, 136, size=(size, size), dtype=np.uint8)
    noise_img = Image.fromarray(noise, "L").filter(ImageFilter.GaussianBlur(1.2))
    gray = Image.merge("RGB", (noise_img, noise_img, noise_img))
    img = Image.blend(img, gray, 0.015)
    return ImageEnhance.Contrast(img).enhance(1.02)

def draw_rounded_rect(draw, box, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def frame(draw, size=SIZE, pad=28):
    """Teal rounded frame with seigaiha corner accents."""
    # outer frame
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=36,
        outline=TEAL,
        width=10,
    )
    # inner thin line
    draw.rounded_rectangle(
        [pad + 16, pad + 16, size - pad - 16, size - pad - 16],
        radius=28,
        outline=TEAL_LIGHT,
        width=2,
    )
    # seigaiha corners (bottom)
    for cx, cy, flip in ((pad + 70, size - pad - 40, False), (size - pad - 70, size - pad - 40, True)):
        for i, r in enumerate((18, 30, 42)):
            bbox = [cx - r, cy - r // 2, cx + r, cy + r]
            draw.arc(bbox, 200 if not flip else 340, 340 if not flip else 200, fill=TEAL_MID, width=2)
    # soft cloud motifs top
    for cx, cy in ((pad + 90, pad + 70), (size - pad - 90, pad + 70)):
        draw.arc([cx - 28, cy - 10, cx - 4, cy + 10], 200, 340, fill=TEAL_LIGHT, width=2)
        draw.arc([cx - 16, cy - 16, cx + 16, cy + 6], 200, 340, fill=TEAL_LIGHT, width=2)
        draw.arc([cx + 4, cy - 10, cx + 28, cy + 10], 200, 340, fill=TEAL_LIGHT, width=2)


def petal(draw, x, y, scale=1.0, color=CORAL_SOFT):
    r = int(10 * scale)
    draw.ellipse([x - r, y - r // 2, x + r, y + r // 2], fill=(*color, 140) if len(color) == 3 else color)
    draw.ellipse([x - r // 2, y - r, x + r // 2, y + r], fill=(*CORAL, 100))


def draw_person(draw, cx, cy, *, female=True, scale=1.0, shirt=TEAL_MID, skirt=None, jacket=None, face_right=True):
    """Faceless 3/4-view minimal person; face_right=True looks toward +x."""
    s = scale
    ox = int(6 * s) if face_right else int(-6 * s)
    hr = int(36 * s)
    # head
    draw.ellipse([cx - hr + ox, cy - hr - int(72 * s), cx + hr + ox, cy - int(72 * s) + hr], fill=SKIN)
    # hair
    if female:
        draw.ellipse([cx - int(40 * s) + ox, cy - int(122 * s), cx + int(40 * s) + ox, cy - int(58 * s)], fill=HAIR)
        bx = cx + (int(8 * s) if face_right else int(-8 * s))
        draw.ellipse([bx - int(16 * s), cy - int(148 * s), bx + int(16 * s), cy - int(112 * s)], fill=HAIR)
        ex = cx + (int(30 * s) if face_right else int(-38 * s))
        draw.ellipse([ex, cy - int(72 * s), ex + int(8 * s), cy - int(64 * s)], fill=TEAL)
    else:
        draw.ellipse([cx - int(38 * s) + ox, cy - int(118 * s), cx + int(38 * s) + ox, cy - int(52 * s)], fill=HAIR)
        draw.rectangle([cx - int(36 * s) + ox, cy - int(92 * s), cx + int(36 * s) + ox, cy - int(58 * s)], fill=HAIR)
    # neck
    draw.rectangle([cx - int(11 * s), cy - int(74 * s), cx + int(11 * s), cy - int(42 * s)], fill=SKIN)
    top = cy - int(42 * s)
    bot = cy + int(88 * s)
    body_w = int(52 * s)
    if jacket:
        draw.rounded_rectangle([cx - body_w - 6, top, cx + body_w + 6, bot], radius=16, fill=jacket)
        draw.rounded_rectangle([cx - body_w + 8, top + 10, cx + body_w - 8, bot - 8], radius=10, fill=shirt)
        # lapel hint
        draw.line([cx, top + 12, cx, bot - 20], fill=TEAL, width=2)
    else:
        draw.rounded_rectangle([cx - body_w, top, cx + body_w, bot], radius=14, fill=shirt)
    if skirt:
        draw.polygon(
            [
                (cx - body_w - int(8 * s), bot - int(8 * s)),
                (cx + body_w + int(8 * s), bot - int(8 * s)),
                (cx + body_w + int(26 * s), bot + int(68 * s)),
                (cx - body_w - int(26 * s), bot + int(68 * s)),
            ],
            fill=skirt,
        )
    else:
        # pants
        pw = int(22 * s)
        draw.rounded_rectangle([cx - body_w + 4, bot - 4, cx - 4, bot + int(70 * s)], radius=8, fill=TEAL)
        draw.rounded_rectangle([cx + 4, bot - 4, cx + body_w - 4, bot + int(70 * s)], radius=8, fill=TEAL)
    arm_y = top + int(24 * s)
    aw = int(18 * s)
    draw.rounded_rectangle([cx - body_w - aw, arm_y, cx - body_w + 6, arm_y + int(75 * s)], radius=9, fill=jacket or shirt)
    draw.rounded_rectangle([cx + body_w - 6, arm_y, cx + body_w + aw, arm_y + int(75 * s)], radius=9, fill=jacket or shirt)


def desk_surface(draw, y, size=SIZE, color=WOOD):
    draw.rounded_rectangle([90, y, size - 90, y + 28], radius=6, fill=color)
    draw.rectangle([100, y + 28, size - 100, y + 36], fill=WOOD_DARK)


def stamp_mark(draw, x, y, r=28):
    draw.ellipse([x - r, y - r, x + r, y + r], outline=CORAL, width=4)
    draw.ellipse([x - r + 8, y - r + 8, x + r - 8, y + r - 8], outline=CORAL_SOFT, width=2)
    # abstract seal pattern (no readable text)
    draw.line([x - 8, y, x + 8, y], fill=CORAL, width=2)
    draw.line([x, y - 8, x, y + 8], fill=CORAL, width=2)


def doc_sheet(draw, x, y, w=120, h=160, stamp=True):
    draw.rounded_rectangle([x, y, x + w, y + h], radius=6, fill=WHITE, outline=TEAL_SOFT, width=2)
    for i in range(5):
        yy = y + 28 + i * 22
        draw.line([x + 16, yy, x + w - 16, yy], fill=TEAL_LIGHT, width=2)
    if stamp:
        stamp_mark(draw, x + w - 36, y + h - 40, r=18)


def plant(draw, x, y, scale=1.0):
    s = scale
    draw.ellipse([x - int(22 * s), y, x + int(22 * s), y + int(28 * s)], fill=WOOD)
    draw.ellipse([x - int(16 * s), y + 4, x + int(16 * s), y + int(20 * s)], fill=CREAM_DEEP)
    for dx, dy, r in [(-18, -18, 16), (0, -28, 18), (18, -16, 15), (-6, -8, 12)]:
        draw.ellipse(
            [x + int(dx * s) - int(r * s), y + int(dy * s) - int(r * s),
             x + int(dx * s) + int(r * s), y + int(dy * s) + int(r * s)],
            fill=LEAF,
        )


def finish(img: Image.Image) -> Image.Image:
    soft = img.filter(ImageFilter.SMOOTH_MORE)
    img = Image.blend(img, soft, 0.22)
    # flatten micro-noise for compression
    img = img.filter(ImageFilter.MedianFilter(size=3))
    return img.convert("RGB")


# ---------- scenes ----------

def scene_filing(variant=0):
    img = washi_base()
    d = ImageDraw.Draw(img, "RGBA")
    frame(d)
    # counter
    desk_surface(d, 620, color=WOOD)
    # city hall icon on counter front
    d.rounded_rectangle([430, 655, 594, 785], radius=8, fill=TEAL_MID)
    d.polygon([(440, 695), (512, 650), (584, 695)], fill=CREAM)
    # columns
    for cx in (455, 490, 525, 560):
        d.rectangle([cx, 700, cx + 14, 770], fill=CREAM)
    d.rectangle([448, 770, 576, 782], fill=CREAM)
    # couple
    draw_person(d, 340, 480, female=True, scale=1.05, shirt=PAPER, skirt=TEAL, face_right=True)
    draw_person(d, 680, 480, female=False, scale=1.05, shirt=PAPER, jacket=TEAL_MID, face_right=False)
    # shared form
    doc_sheet(d, 452, 500, w=120, h=140, stamp=True)
    # small heart mark (abstract, not wedding dress)
    d.ellipse([500, 512, 516, 528], fill=CORAL_SOFT)
    d.ellipse([510, 512, 526, 528], fill=CORAL_SOFT)
    d.polygon([(500, 520), (526, 520), (513, 538)], fill=CORAL)
    plant(d, 200, 590, 0.9)
    plant(d, 820, 590, 0.9)
    if variant == 1:
        # more papers
        doc_sheet(d, 200, 430, 90, 120, stamp=False)
        stamp_mark(d, 780, 560, 22)
    elif variant == 2:
        # clerk side silhouette
        d.rounded_rectangle([470, 300, 554, 420], radius=20, fill=TEAL_SOFT)
        d.ellipse([488, 250, 536, 300], fill=SKIN)
        d.ellipse([482, 235, 542, 275], fill=HAIR)
    elif variant == 3:
        # noren curtains
        for x0 in (120, 780):
            d.rectangle([x0, 160, x0 + 100, 320], fill=TEAL_MID)
            for i in range(3):
                d.line([x0 + 20 + i * 30, 170, x0 + 20 + i * 30, 310], fill=CREAM, width=3)
    return finish(img)


def scene_cohabit(variant=0):
    img = washi_base()
    d = ImageDraw.Draw(img, "RGBA")
    frame(d)
    # soft floor shadow
    d.ellipse([180, 760, 844, 860], fill=(*CREAM_DEEP, 180))
    # moving boxes (clear cardboard look)
    boxes = [(120, 560, 300, 740), (700, 540, 880, 720), (740, 460, 900, 560)]
    for (x0, y0, x1, y1) in boxes:
        d.rounded_rectangle([x0, y0, x1, y1], radius=6, fill=CREAM_DEEP, outline=WOOD_DARK, width=3)
        mid = (x0 + x1) // 2
        d.line([mid, y0, mid, y1], fill=WOOD_DARK, width=2)
        d.line([x0, y0 + 36, x1, y0 + 36], fill=WOOD_DARK, width=2)
        # tape
        d.rectangle([mid - 14, y0, mid + 14, y1], fill=(*GOLD_SOFT, 160))
    # apartment door behind
    d.rounded_rectangle([380, 200, 644, 700], radius=10, fill=WOOD, outline=TEAL, width=4)
    d.rounded_rectangle([410, 240, 614, 480], radius=6, fill=TEAL_LIGHT)
    d.ellipse([580, 520, 620, 560], fill=GOLD)
    # big keyring in foreground
    d.ellipse([470, 580, 554, 664], outline=TEAL, width=7)
    d.rounded_rectangle([504, 660, 520, 760], radius=3, fill=TEAL_MID)
    d.rounded_rectangle([490, 750, 534, 790], radius=5, fill=GOLD)
    d.ellipse([450, 600, 490, 640], outline=GOLD, width=4)
    d.ellipse([534, 600, 574, 640], outline=CORAL_SOFT, width=4)
    draw_person(d, 240, 360, female=True, scale=0.9, shirt=PAPER, skirt=TEAL_MID, face_right=True)
    draw_person(d, 790, 350, female=False, scale=0.9, shirt=CREAM, jacket=TEAL, face_right=False)
    if variant:
        plant(d, 330, 700, 0.75)
        plant(d, 690, 700, 0.65)
    return finish(img)


def scene_namechange():
    img = washi_base()
    d = ImageDraw.Draw(img, "RGBA")
    frame(d)
    desk_surface(d, 640, color=WOOD)
    # ID cards
    for i, x in enumerate((280, 520)):
        d.rounded_rectangle([x, 360, x + 220, 520], radius=12, fill=WHITE, outline=TEAL, width=3)
        d.rounded_rectangle([x + 20, 380, x + 90, 470], radius=8, fill=TEAL_LIGHT)
        d.ellipse([x + 35, 395, x + 75, 435], fill=SKIN)
        d.ellipse([x + 32, 385, x + 78, 415], fill=HAIR)
        for j in range(3):
            d.line([x + 110, 400 + j * 28, x + 200, 400 + j * 28], fill=TEAL_LIGHT, width=3)
        # rename arrow / strikethrough abstract
        if i == 0:
            d.line([x + 110, 455, x + 200, 455], fill=CORAL, width=3)
        else:
            stamp_mark(d, x + 170, 490, 16)
    # pen
    d.rounded_rectangle([780, 560, 800, 700], radius=4, fill=TEAL)
    d.polygon([(780, 560), (800, 560), (790, 540)], fill=GOLD)
    draw_person(d, 200, 250, female=True, scale=0.7, shirt=PAPER, skirt=TEAL)
    draw_person(d, 820, 250, female=False, scale=0.7, shirt=PAPER, jacket=TEAL_MID)
    return finish(img)


def scene_company():
    img = washi_base()
    d = ImageDraw.Draw(img, "RGBA")
    frame(d)
    # office desk
    desk_surface(d, 580, color=TEAL_MID)
    d.rounded_rectangle([160, 300, 420, 520], radius=10, fill=WHITE, outline=TEAL_SOFT, width=2)
    for i in range(6):
        d.line([190, 340 + i * 28, 390, 340 + i * 28], fill=TEAL_LIGHT, width=2)
    # HR person
    draw_person(d, 700, 400, female=True, scale=0.9, shirt=TEAL_LIGHT, skirt=TEAL)
    # employee
    draw_person(d, 300, 420, female=False, scale=0.9, shirt=PAPER, jacket=TEAL_MID)
    # laptop
    d.rounded_rectangle([560, 500, 760, 560], radius=6, fill=INK)
    d.rounded_rectangle([575, 455, 745, 505], radius=4, fill=TEAL_LIGHT)
    plant(d, 860, 520, 0.8)
    stamp_mark(d, 360, 480, 20)
    return finish(img)


def scene_pregnant(variant=0):
    img = washi_base()
    d = ImageDraw.Draw(img, "RGBA")
    frame(d)
    # clinic soft room
    d.rounded_rectangle([200, 280, 824, 700], radius=20, fill=PAPER, outline=TEAL_LIGHT, width=2)
    desk_surface(d, 560, color=WOOD)
    # maternity handbook (母子手帳 style abstract — no text)
    d.rounded_rectangle([430, 400, 590, 560], radius=10, fill=TEAL, outline=TEAL, width=2)
    d.rounded_rectangle([445, 420, 575, 540], radius=6, fill=CREAM)
    d.ellipse([490, 460, 530, 500], outline=CORAL, width=3)
    draw_person(d, 320, 380, female=True, scale=1.0, shirt=PAPER, skirt=TEAL_SOFT)
    # gentle bump suggestion via rounded torso already
    draw_person(d, 720, 380, female=False, scale=1.0, shirt=CREAM, jacket=TEAL_MID)
    plant(d, 180, 620, 0.85)
    if variant:
        # ultrasound monitor abstract
        d.rounded_rectangle([620, 300, 780, 420], radius=8, fill=INK)
        d.ellipse([660, 330, 740, 400], outline=TEAL_LIGHT, width=3)
    return finish(img)


def scene_prenatal():
    img = washi_base()
    d = ImageDraw.Draw(img, "RGBA")
    frame(d)
    # clinic counter
    desk_surface(d, 600, color=WOOD)
    d.rounded_rectangle([300, 320, 700, 520], radius=16, fill=WHITE, outline=TEAL_SOFT, width=3)
    # calendar / check marks abstract
    for r in range(3):
        for c in range(4):
            x = 340 + c * 80
            y = 360 + r * 50
            d.rounded_rectangle([x, y, x + 50, y + 36], radius=4, fill=CREAM_DEEP if (r + c) % 2 else PAPER)
            if (r * 4 + c) % 3 == 0:
                d.line([x + 12, y + 18, x + 22, y + 28], fill=LEAF, width=3)
                d.line([x + 22, y + 28, x + 40, y + 10], fill=LEAF, width=3)
    draw_person(d, 200, 420, female=True, scale=0.85, shirt=PAPER, skirt=TEAL)
    plant(d, 820, 560, 1.0)
    return finish(img)


def scene_birth(variant=0):
    img = washi_base()
    d = ImageDraw.Draw(img, "RGBA")
    frame(d)
    desk_surface(d, 650, color=WOOD)
    # bassinet / soft oval
    d.ellipse([360, 420, 664, 620], fill=PAPER, outline=TEAL_SOFT, width=3)
    d.ellipse([400, 450, 624, 590], fill=CREAM)
    # newborn minimal (faceless bundle)
    d.ellipse([460, 480, 560, 560], fill=SKIN)
    d.rounded_rectangle([440, 530, 580, 600], radius=20, fill=TEAL_LIGHT)
    # paperwork
    doc_sheet(d, 160, 400, 110, 150, stamp=True)
    if variant == 0:
        draw_person(d, 280, 300, female=True, scale=0.75, shirt=PAPER, skirt=TEAL)
        draw_person(d, 760, 300, female=False, scale=0.75, shirt=CREAM, jacket=TEAL_MID)
    else:
        # money theme: envelope abstract (no amounts)
        d.rounded_rectangle([700, 420, 860, 540], radius=8, fill=GOLD_SOFT, outline=GOLD, width=3)
        d.polygon([(700, 420), (780, 480), (860, 420)], fill=GOLD)
        draw_person(d, 780, 280, female=True, scale=0.7, shirt=PAPER, skirt=TEAL_MID)
    plant(d, 860, 620, 0.7)
    return finish(img)


def scene_allowance():
    img = washi_base()
    d = ImageDraw.Draw(img, "RGBA")
    frame(d)
    desk_surface(d, 620, color=WOOD)
    # notice letter
    d.rounded_rectangle([340, 280, 684, 560], radius=10, fill=WHITE, outline=TEAL, width=3)
    d.rectangle([340, 280, 684, 340], fill=TEAL_MID)
    for i in range(5):
        d.line([380, 380 + i * 28, 640, 380 + i * 28], fill=TEAL_LIGHT, width=2)
    stamp_mark(d, 600, 500, 24)
    # household figures
    draw_person(d, 200, 420, female=True, scale=0.8, shirt=PAPER, skirt=TEAL)
    draw_person(d, 820, 420, female=False, scale=0.8, shirt=CREAM, jacket=TEAL_MID)
    # small child silhouette
    d.ellipse([480, 640, 540, 700], fill=SKIN)
    d.ellipse([475, 625, 545, 665], fill=HAIR)
    d.rounded_rectangle([470, 695, 550, 780], radius=14, fill=CORAL_SOFT)
    return finish(img)


def scene_daycare(variant=0):
    img = washi_base()
    d = ImageDraw.Draw(img, "RGBA")
    frame(d)
    # building entrance
    d.rounded_rectangle([260, 240, 764, 720], radius=14, fill=CREAM_DEEP, outline=TEAL, width=4)
    d.polygon([(240, 280), (512, 160), (784, 280)], fill=TEAL_MID)
    # door
    d.rounded_rectangle([430, 420, 594, 720], radius=8, fill=WOOD, outline=TEAL, width=3)
    d.ellipse([560, 560, 580, 580], fill=GOLD)
    # window
    d.rounded_rectangle([300, 360, 400, 480], radius=6, fill=TEAL_LIGHT)
    d.rounded_rectangle([624, 360, 724, 480], radius=6, fill=TEAL_LIGHT)
    # parent + child
    draw_person(d, 180, 480, female=True, scale=0.85, shirt=PAPER, skirt=TEAL)
    d.ellipse([150, 620, 210, 680], fill=SKIN)
    d.ellipse([145, 605, 215, 645], fill=HAIR)
    d.rounded_rectangle([140, 675, 220, 760], radius=12, fill=LEAF)
    if variant:
        plant(d, 850, 600, 1.0)
    return finish(img)


def scene_infant():
    img = washi_base()
    d = ImageDraw.Draw(img, "RGBA")
    frame(d)
    # play mat
    d.ellipse([220, 480, 804, 780], fill=PAPER, outline=TEAL_LIGHT, width=3)
    # toddler sitting
    d.ellipse([450, 420, 570, 540], fill=SKIN)
    d.ellipse([445, 400, 575, 470], fill=HAIR)
    d.rounded_rectangle([430, 520, 590, 640], radius=30, fill=TEAL_SOFT)
    d.ellipse([400, 600, 470, 670], fill=SKIN)  # hand
    d.ellipse([550, 600, 620, 670], fill=SKIN)
    # blocks
    colors = [TEAL, CORAL_SOFT, GOLD, LEAF]
    for i, (x, y) in enumerate([(300, 560), (340, 600), (700, 560), (660, 610)]):
        d.rounded_rectangle([x, y, x + 50, y + 50], radius=6, fill=colors[i])
    draw_person(d, 200, 300, female=True, scale=0.7, shirt=PAPER, skirt=TEAL)
    draw_person(d, 820, 300, female=False, scale=0.7, shirt=CREAM, jacket=TEAL_MID)
    return finish(img)


def scene_preschool():
    img = washi_base()
    d = ImageDraw.Draw(img, "RGBA")
    frame(d)
    # low table
    desk_surface(d, 560, color=WOOD)
    # crayons / paper
    d.rounded_rectangle([360, 400, 664, 540], radius=8, fill=WHITE, outline=TEAL_SOFT, width=2)
    d.arc([420, 440, 520, 520], 20, 160, fill=CORAL, width=4)
    d.arc([500, 430, 620, 510], 200, 340, fill=TEAL, width=4)
    for i, col in enumerate([CORAL, TEAL, GOLD, LEAF, CORAL_SOFT]):
        d.rounded_rectangle([280 + i * 30, 620, 295 + i * 30, 700], radius=3, fill=col)
    # child standing
    d.ellipse([470, 220, 550, 300], fill=SKIN)
    d.ellipse([465, 205, 555, 265], fill=HAIR)
    d.rounded_rectangle([450, 295, 570, 430], radius=18, fill=LEAF)
    draw_person(d, 200, 350, female=True, scale=0.75, shirt=PAPER, skirt=TEAL)
    return finish(img)


def scene_home(variant=0):
    img = washi_base()
    d = ImageDraw.Draw(img, "RGBA")
    frame(d)
    # house
    d.polygon([(220, 420), (512, 180), (804, 420)], fill=TEAL_MID)
    d.rounded_rectangle([280, 420, 744, 740], radius=8, fill=CREAM_DEEP, outline=TEAL, width=4)
    d.rounded_rectangle([450, 520, 574, 740], radius=6, fill=WOOD)
    d.ellipse([540, 620, 560, 640], fill=GOLD)
    d.rounded_rectangle([320, 500, 420, 600], radius=4, fill=TEAL_LIGHT)
    d.rounded_rectangle([604, 500, 704, 600], radius=4, fill=TEAL_LIGHT)
    if variant == 0:
        draw_person(d, 180, 560, female=True, scale=0.7, shirt=PAPER, skirt=TEAL)
        draw_person(d, 840, 560, female=False, scale=0.7, shirt=CREAM, jacket=TEAL_MID)
    else:
        # mortgage docs
        doc_sheet(d, 150, 500, 130, 170, stamp=True)
        doc_sheet(d, 740, 500, 130, 170, stamp=False)
        d.rounded_rectangle([400, 760, 624, 820], radius=6, fill=WHITE, outline=TEAL_SOFT, width=2)
        for i in range(3):
            d.line([420, 780 + i * 12, 600, 780 + i * 12], fill=TEAL_LIGHT, width=2)
    plant(d, 512, 780, 0.6)
    return finish(img)


def scene_money(variant=0):
    img = washi_base()
    d = ImageDraw.Draw(img, "RGBA")
    frame(d)
    desk_surface(d, 600, color=WOOD)
    # ledger / notebook
    d.rounded_rectangle([300, 320, 724, 560], radius=12, fill=WHITE, outline=TEAL, width=3)
    d.rectangle([300, 320, 360, 560], fill=TEAL_MID)
    for i in range(6):
        d.line([390, 360 + i * 30, 690, 360 + i * 30], fill=TEAL_LIGHT, width=2)
    # coins abstract (no amounts)
    for i, x in enumerate((220, 280, 340)):
        d.ellipse([x, 640, x + 50, 690], fill=GOLD_SOFT, outline=GOLD, width=3)
    # calculator abstract
    d.rounded_rectangle([760, 420, 880, 580], radius=8, fill=INK)
    for r in range(3):
        for c in range(3):
            d.rounded_rectangle([775 + c * 32, 450 + r * 36, 800 + c * 32, 472 + r * 36], radius=3, fill=TEAL_LIGHT)
    draw_person(d, 200, 250, female=True, scale=0.7, shirt=PAPER, skirt=TEAL)
    if variant:
        draw_person(d, 820, 250, female=False, scale=0.7, shirt=CREAM, jacket=TEAL_MID)
        # family piggy abstract
        d.ellipse([480, 620, 600, 720], fill=CORAL_SOFT)
        d.ellipse([560, 640, 600, 680], fill=CORAL)
    return finish(img)


def scene_hedge(variant=0):
    img = washi_base()
    d = ImageDraw.Draw(img, "RGBA")
    frame(d)
    desk_surface(d, 640, color=WOOD)
    # folder stack
    colors = [TEAL, TEAL_MID, TEAL_SOFT]
    for i, col in enumerate(colors):
        y = 340 + i * 40
        d.rounded_rectangle([280, y, 720, y + 160], radius=10, fill=col if i < 2 else WHITE, outline=TEAL, width=2)
    # shield / umbrella abstract (protection, calm)
    d.polygon([(512, 380), (620, 430), (620, 520), (512, 580), (404, 520), (404, 430)], fill=LEAF, outline=TEAL, width=3)
    d.ellipse([470, 450, 554, 520], fill=CREAM)
    if variant:
        # legal scales abstract (not scary)
        d.line([200, 400, 200, 600], fill=TEAL, width=4)
        d.line([150, 400, 250, 400], fill=TEAL, width=4)
        d.ellipse([130, 430, 190, 490], outline=GOLD, width=3)
        d.ellipse([210, 430, 270, 490], outline=GOLD, width=3)
        d.line([800, 380, 860, 620], fill=TEAL_SOFT, width=3)
        doc_sheet(d, 760, 420, 100, 140, stamp=True)
    draw_person(d, 180, 250, female=True, scale=0.65, shirt=PAPER, skirt=TEAL_MID)
    draw_person(d, 840, 250, female=False, scale=0.65, shirt=CREAM, jacket=TEAL)
    return finish(img)


def scene_prep():
    img = washi_base()
    d = ImageDraw.Draw(img, "RGBA")
    frame(d)
    desk_surface(d, 600, color=WOOD)
    # health checklist clipboard
    d.rounded_rectangle([360, 260, 664, 560], radius=12, fill=WHITE, outline=TEAL, width=3)
    d.ellipse([490, 240, 534, 280], fill=TEAL_MID)  # clip
    for i in range(5):
        y = 320 + i * 40
        d.rounded_rectangle([400, y, 430, y + 28], radius=4, outline=TEAL_SOFT, width=2)
        if i < 3:
            d.line([406, y + 14, 414, y + 22], fill=LEAF, width=3)
            d.line([414, y + 22, 426, y + 8], fill=LEAF, width=3)
        d.line([450, y + 14, 620, y + 14], fill=TEAL_LIGHT, width=2)
    # stethoscope abstract
    d.ellipse([200, 420, 280, 500], outline=TEAL, width=5)
    d.arc([180, 380, 300, 520], 200, 340, fill=TEAL, width=5)
    d.ellipse([720, 440, 800, 520], fill=CORAL_SOFT)
    draw_person(d, 512, 700, female=True, scale=0.55, shirt=PAPER, skirt=TEAL)
    return finish(img)


def scene_stamp_board(variant=0):
    img = washi_base()
    d = ImageDraw.Draw(img, "RGBA")
    frame(d)
    # notebook / hanko board matching Amity desk
    d.rounded_rectangle([180, 200, 844, 820], radius=18, fill=PAPER, outline=TEAL, width=5)
    d.rectangle([180, 200, 240, 820], fill=TEAL_MID)
    # grid of stamp circles
    cols, rows = (4, 5) if variant == 0 else (5, 4)
    ox, oy = 300, 260
    gap_x, gap_y = 120, 100
    for r in range(rows):
        for c in range(cols):
            x = ox + c * gap_x
            y = oy + r * gap_y
            d.rounded_rectangle([x - 40, y - 30, x + 40, y + 40], radius=8, fill=CREAM_DEEP, outline=TEAL_LIGHT, width=2)
            filled = (r * cols + c) % 3 != 2
            if filled:
                stamp_mark(d, x, y + 5, 18)
            else:
                d.ellipse([x - 18, y - 13, x + 18, y + 23], outline=TEAL_LIGHT, width=2)
    # hanko stick
    d.rounded_rectangle([780, 700, 820, 860], radius=4, fill=WOOD_DARK)
    d.ellipse([770, 670, 830, 710], fill=CORAL)
    return finish(img)


SCENES = {
    "gen-filing.png": lambda: scene_filing(0),
    "lux-filing.png": lambda: scene_filing(1),
    "phase0-filing.png": lambda: scene_filing(2),
    "rm-filing.png": lambda: scene_filing(3),
    "gen-cohabit.png": lambda: scene_cohabit(0),
    "lux-cohabit.png": lambda: scene_cohabit(1),
    "phase0b-cohabit.png": lambda: scene_cohabit(1),
    "rm-namechange.png": scene_namechange,
    "rm-company.png": scene_company,
    "gen-pregnant.png": lambda: scene_pregnant(0),
    "lux-pregnant.png": lambda: scene_pregnant(1),
    "phase2-pregnant.png": lambda: scene_pregnant(0),
    "rm-prenatal.png": scene_prenatal,
    "gen-birth.png": lambda: scene_birth(0),
    "lux-birth.png": lambda: scene_birth(0),
    "phase3-birth.png": lambda: scene_birth(0),
    "rm-birth-money.png": lambda: scene_birth(1),
    "rm-allowance.png": scene_allowance,
    "gen-daycare.png": lambda: scene_daycare(0),
    "rm-daycare.png": lambda: scene_daycare(1),
    "phase4-infant.png": scene_infant,
    "phase5-preschool.png": scene_preschool,
    "lux-home.png": lambda: scene_home(0),
    "phase6-home.png": lambda: scene_home(0),
    "rm-mortgage.png": lambda: scene_home(1),
    "lux-money.png": lambda: scene_money(0),
    "gen-money-family.png": lambda: scene_money(1),
    "phase7-hedge.png": lambda: scene_hedge(0),
    "phase8-divorce-hedge.png": lambda: scene_hedge(1),
    "phase1-prep.png": scene_prep,
    "gen-stamp-board.png": lambda: scene_stamp_board(0),
    "gen-stamp-grid.png": lambda: scene_stamp_board(1),
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    existing = sorted(p.name for p in OUT.glob("*.png"))
    missing = [n for n in existing if n not in SCENES]
    extra = [n for n in SCENES if n not in existing]
    if missing:
        raise SystemExit(f"No generator for: {missing}")
    print(f"Generating {len(SCENES)} illustrations → {OUT}")
    for name, fn in SCENES.items():
        print(f"  {name} ...", flush=True)
        im = fn()
        # also export 1280x720 landscape crop-friendly version? User asked 1024 square.
        # Keep square; UI uses object-fit cover.
        path = OUT / name
        im.save(path, "PNG", optimize=True, compress_level=9)
        print(f"    saved {path.stat().st_size} bytes {im.size}")
    print("done", len(SCENES))


if __name__ == "__main__":
    main()
