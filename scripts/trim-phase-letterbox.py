#!/usr/bin/env python3
"""Trim cream letterbox rows and cover-fit phase art to 1024x1024.

A row is considered letterbox when at least 92% of its pixels have
luminance >= 232 and RGB channel spread <= 28. Tiny detections (<2% of
an edge) are retained so a scene is never over-cropped; every image is
then cover-fitted with centered LANCZOS resampling.
"""
from pathlib import Path
import argparse
from PIL import Image
import numpy as np

TARGET = 1024
CREAM_FRACTION = 0.92
MIN_BAR_FRACTION = 0.02
INSET = 3


def cream_rows(image: Image.Image) -> np.ndarray:
    rgb = np.asarray(image.convert("RGB"), dtype=np.uint8)
    luminance = rgb.mean(axis=2)
    spread = rgb.max(axis=2) - rgb.min(axis=2)
    return ((luminance >= 232) & (spread <= 28)).mean(axis=1) >= CREAM_FRACTION


def edge_bars(image: Image.Image) -> tuple[int, int]:
    rows = cream_rows(image)
    top = 0
    while top < len(rows) and rows[top]:
        top += 1
    bottom = 0
    while bottom < len(rows) - top and rows[-1 - bottom]:
        bottom += 1
    return top, bottom


def cover_fit(image: Image.Image) -> Image.Image:
    width, height = image.size
    scale = max(TARGET / width, TARGET / height)
    size = (max(TARGET, round(width * scale)), max(TARGET, round(height * scale)))
    resized = image.resize(size, Image.Resampling.LANCZOS)
    left = (resized.width - TARGET) // 2
    top = (resized.height - TARGET) // 2
    return resized.crop((left, top, left + TARGET, top + TARGET))


def trim_and_fit(image: Image.Image, top: int, bottom: int) -> Image.Image:
    """Inset a detected band and cover-fit it, centered, to the target square."""
    width, height = image.size
    crop_top = min(height - 1, top + INSET) if top else 0
    crop_bottom = max(crop_top + 1, height - bottom - INSET) if bottom else height
    if crop_bottom <= crop_top:
        crop_top, crop_bottom = top, height - bottom
    return cover_fit(image.crop((0, crop_top, width, crop_bottom)))


def process(path: Path) -> tuple[int, int, int, int]:
    original = Image.open(path).convert("RGB")
    before_top, before_bottom = edge_bars(original)
    height = original.height
    top = before_top if before_top / height >= MIN_BAR_FRACTION else 0
    bottom = before_bottom if before_bottom / height >= MIN_BAR_FRACTION else 0
    result = trim_and_fit(original, top, bottom)

    # Cover-fitting can expose a new, centered cream edge in a few especially
    # sparse illustrations. Remove only another meaningful (>=2%) detector
    # result; smaller residuals are retained to avoid cropping scene content.
    for _ in range(8):
        residual_top, residual_bottom = edge_bars(result)
        top = residual_top if residual_top / TARGET >= MIN_BAR_FRACTION else 0
        bottom = residual_bottom if residual_bottom / TARGET >= MIN_BAR_FRACTION else 0
        if not top and not bottom:
            break
        result = trim_and_fit(result, top, bottom)

    result.save(path, format="PNG")
    return before_top, before_bottom, *edge_bars(result)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", type=Path, default=Path("public/phases"))
    args = parser.parse_args()
    paths = sorted(args.directory.glob("*.png"))
    if len(paths) != 32:
        raise SystemExit(f"expected 32 phase PNGs, found {len(paths)}")

    print("file,before_top,before_bottom,after_top,after_bottom")
    for path in paths:
        bt, bb, at, ab = process(path)
        print(f"{path.name},{bt},{bb},{at},{ab}")


if __name__ == "__main__":
    main()
