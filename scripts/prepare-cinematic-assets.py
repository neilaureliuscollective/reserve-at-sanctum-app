"""Prepare lossless-in-content alpha cutouts from the founder's approved artwork.

The original product and logo pixels are copied into RGBA. Only the exterior
background gets an alpha matte; product labels and emblems are never redrawn.
"""

from collections import deque
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
APPROVED = ROOT / "public/images/approved"
OUTPUT = ROOT / "public/images/cinematic"
OUTPUT.mkdir(parents=True, exist_ok=True)


def seal(source: str, output: str, radius: float = .462):
    image = Image.open(APPROVED / source).convert("RGBA")
    w, h = image.size
    y, x = np.ogrid[:h, :w]
    cx, cy = (w - 1) / 2, (h - 1) / 2
    distance = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    r = min(w, h) * radius
    # The outer ring is circular; the four compass tips extend beyond it.
    alpha = np.clip((r + 3 - distance) / 7, 0, 1)
    for angle in (0, 90, 180, 270):
        if angle in (0, 180):
            across = abs(y - cy)
            along = abs(x - cx)
        else:
            across = abs(x - cx)
            along = abs(y - cy)
        # A tapered diamond around the tip, feathered at its edges.
        width = np.clip((min(w, h) * .045 - (along - r) * .75), 0, min(w, h) * .045)
        tip = np.clip((width - across) / 5, 0, 1) * np.clip((along - (r - 22)) / 8, 0, 1)
        pixels = np.asarray(image)
        gold = (pixels[:, :, 0] > pixels[:, :, 2] * 1.13) & (pixels[:, :, 0] > 64)
        tip *= gold
        alpha = np.maximum(alpha, tip)
    image.putalpha(Image.fromarray(np.uint8(alpha * 255)))
    image.save(OUTPUT / output, "WEBP", quality=94, method=6)


def product(source: str, output: str):
    image = Image.open(APPROVED / source).convert("RGB")
    data = np.asarray(image)
    h, w = data.shape[:2]
    # Flood the neutral studio surround from the edges. The original bottle
    # stays opaque, including its small lettering, highlights and label.
    bright = (np.min(data, axis=2) > 142) & ((np.max(data, axis=2) - np.min(data, axis=2)) < 45)
    background = np.zeros((h, w), dtype=bool)
    queue = deque()
    for x in range(0, w, 3):
        if bright[0, x]: queue.append((0, x))
        if bright[h - 1, x]: queue.append((h - 1, x))
    for y in range(0, h, 3):
        if bright[y, 0]: queue.append((y, 0))
        if bright[y, w - 1]: queue.append((y, w - 1))
    while queue:
        y, x = queue.popleft()
        if not (0 <= y < h and 0 <= x < w) or background[y, x] or not bright[y, x]:
            continue
        background[y, x] = True
        queue.extend(((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)))
    # Preserve only the connected central package silhouette. Reflections on
    # the floor below it have no place in the new dark product chamber.
    opaque = ~background
    center = data[:, int(w * .48):int(w * .52)]
    neutral = (np.min(center, axis=2) > 122) & ((np.max(center, axis=2) - np.min(center, axis=2)) < 38)
    for y in range(int(h * .72), h - 8):
        if neutral[y:y + 8].mean() > .8:
            opaque[y:] = False
            break
    mask = Image.fromarray(np.uint8(opaque) * 255).filter(ImageFilter.GaussianBlur(.65))
    rgba = image.convert("RGBA")
    rgba.putalpha(mask)
    bbox = mask.getbbox()
    if bbox:
        rgba = rgba.crop((max(0, bbox[0] - 10), max(0, bbox[1] - 10), min(w, bbox[2] + 10), min(h, bbox[3] + 10)))
    rgba.save(OUTPUT / output, "WEBP", quality=93, method=6)


seal("reserve-at-sanctum.webp", "reserve-seal.webp", .465)
seal("fix-it-shop.webp", "fix-it-seal.webp", .465)
seal("gent-ascend-collective.webp", "gent-ascend-seal.webp", .465)
for name in ("vitalis", "obsidian-wash", "obsidian-creme", "hydros", "ascend"):
    product(f"{name}.webp", f"{name}-cutout.webp")

# The two concept environment plates are versioned in public/images/cinematic.
# This script only regenerates cutouts from the committed approved artwork.
