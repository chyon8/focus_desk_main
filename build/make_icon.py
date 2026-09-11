"""Build the Focus Desk PNG and macOS icon from the selected card concept."""

from pathlib import Path
import subprocess
import tempfile

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "design-ref" / "icon-concepts" / "01-cards.png"
PNG = ROOT / "build" / "icon.png"
ICNS = ROOT / "build" / "icon.icns"

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


def clean_source() -> Image.Image:
    icon = Image.open(SOURCE).convert("RGBA").resize((1024, 1024), Image.Resampling.LANCZOS)
    alpha = icon.getchannel("A")
    # Image generation left isolated alpha=1 pixels outside the visible tile.
    alpha = alpha.point(lambda value: 0 if value <= 1 else value)
    icon.putalpha(alpha)
    return icon


def main() -> None:
    icon = clean_source()
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
