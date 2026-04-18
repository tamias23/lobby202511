#!/usr/bin/env python3
"""
Regenerate all Android launcher icons from logo_master.svg.
Run from /home/mat/Bureau/lobby202511/new_main/frontend/ with the project .venv active.
"""

import os
import cairosvg
from PIL import Image
import io

SVG_PATH = os.path.join(os.path.dirname(__file__), "src/assets/logo_master.svg")
RES_DIR  = os.path.join(os.path.dirname(__file__), "android/app/src/main/res")

# Android icon sizes (px) per density bucket
# ic_launcher, ic_launcher_round, ic_launcher_foreground all get the same image
DENSITIES = {
    "mipmap-mdpi":    48,
    "mipmap-hdpi":    72,
    "mipmap-xhdpi":   96,
    "mipmap-xxhdpi":  144,
    "mipmap-xxxhdpi": 192,
}

def svg_to_png_bytes(svg_path: str, size: int) -> bytes:
    return cairosvg.svg2png(
        url=svg_path,
        output_width=size,
        output_height=size,
    )

def make_round_png(png_bytes: bytes, size: int) -> bytes:
    """Apply a circular mask to produce ic_launcher_round."""
    img = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    img = img.resize((size, size), Image.LANCZOS)

    mask = Image.new("L", (size, size), 0)
    from PIL import ImageDraw
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size - 1, size - 1), fill=255)

    result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    result.paste(img, (0, 0), mask)

    buf = io.BytesIO()
    result.save(buf, format="PNG")
    return buf.getvalue()

def write(path: str, data: bytes):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)
    print(f"  wrote {os.path.relpath(path)}")

print(f"Source SVG: {SVG_PATH}")

for density, size in DENSITIES.items():
    print(f"\n[{density}] {size}x{size}px")
    png_bytes = svg_to_png_bytes(SVG_PATH, size)

    square_path = os.path.join(RES_DIR, density, "ic_launcher.png")
    write(square_path, png_bytes)

    fg_path = os.path.join(RES_DIR, density, "ic_launcher_foreground.png")
    write(fg_path, png_bytes)

    round_bytes = make_round_png(png_bytes, size)
    round_path = os.path.join(RES_DIR, density, "ic_launcher_round.png")
    write(round_path, round_bytes)

print("\nDone. Now run: npx cap sync android && cd android && ./gradlew assembleDebug")
