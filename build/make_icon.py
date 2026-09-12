"""Draw the Focus Desk icon and build the PNG and macOS icns from it.

The icon is three rounded squares at 1:0.52:0.29 of each other on one dark
ground: an outlined frame with two cards inside it, so the same shape reads at
three zoom steps. It is drawn here rather than exported from an image so the
geometry and colours can be edited as code.

Coordinates are on the 1024 icon grid; the body is the 824 square macOS leaves
for the icon itself.
"""

from pathlib import Path
import subprocess
import tempfile

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent.parent
PNG = ROOT / "build" / "icon.png"
ICNS = ROOT / "build" / "icon.icns"

GROUND = "#1a1d2b"
INK = "#f2efe9"
ACCENT = "#e9a23b"

# Drawn at 4x and scaled down: PIL has no antialiasing of its own.
SCALE = 4
SIZE = 1024

SIZES = {
    "icon_16x16.png": 16,
    "icon_16x16@2x.png": 32,
    "icon_32x32.png": 32,
    "icon_32x32@2x.png": 64,
    "icon_128x128.png": 128,
    "icon_128x128@2x.png": 256,
    "icon_256x256.png": 256,
    "icon_256x256@2x.png": 512,
    "icon_512x512.png": 512,
    "icon_512x512@2x.png": 1024,
}


def box(x, y, width, height):
    """A PIL box on the 1024 grid, scaled up for drawing."""
    return [x * SCALE, y * SCALE, (x + width) * SCALE - 1, (y + height) * SCALE - 1]


def draw_icon() -> Image.Image:
    icon = Image.new("RGBA", (SIZE * SCALE, SIZE * SCALE), (0, 0, 0, 0))
    pen = ImageDraw.Draw(icon)

    pen.rounded_rectangle(box(100, 100, 824, 824), radius=185 * SCALE, fill=GROUND)
    # The frame's stroke is centred on a 580 square, so the band runs 195..249.
    pen.rounded_rectangle(
        box(195, 195, 634, 634), radius=139 * SCALE, outline=INK, width=54 * SCALE
    )
    # 20 clear of the frame's inner edge (249..775) on every side, 18 between them.
    pen.rounded_rectangle(box(269, 455, 300, 300), radius=58 * SCALE, fill=INK)
    pen.rounded_rectangle(box(587, 269, 168, 168), radius=32 * SCALE, fill=ACCENT)

    return icon.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def main() -> None:
    icon = draw_icon()
    icon.save(PNG, optimize=True)

    with tempfile.TemporaryDirectory(suffix=".iconset") as directory:
        iconset = Path(directory)
        for name, size in SIZES.items():
            icon.resize((size, size), Image.Resampling.LANCZOS).save(iconset / name, optimize=True)
        subprocess.run(["iconutil", "-c", "icns", str(iconset), "-o", str(ICNS)], check=True)

    print(f"wrote {PNG}")
    print(f"wrote {ICNS}")


if __name__ == "__main__":
    main()
