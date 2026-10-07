"""Build optimised WebP illustrations from the design exports in public/.

The exports are PNG crops with opaque near-white backgrounds; some carry their file name
baked into a strip at the bottom. This script removes that strip, trims to the artwork,
pads to a square and writes public/illustrations/<name>.webp.

Run once after adding or changing exports:  python scripts/build-illustrations.py
"""

from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parent.parent / "public"
OUT = ROOT / "illustrations"

# Exports whose file name is printed under the artwork.
LABELLED = {f"{n:02d}.png" for n in range(23, 27)} | {f"image tools/{n:02d}.png" for n in range(15, 27)}

# name -> (source, output size in px, square?)
ICON = 192
JOBS: dict[str, tuple[str, int, bool]] = {
    # Heroes
    "hero-home": ("01.png", 640, False),
    "hero-text": ("texttool/01.png", 496, False),
    "hero-image": ("image tools/01.png", 560, False),
    "hero-perf": ("texttool/21.png", 560, False),
    "band-dark": ("23_dark_section_tools_illustration.png", 640, False),
    # Category marks
    "cat-text-tools": ("texttool/03.png", ICON, True),
    "cat-binary-tools": ("texttool/04.png", ICON, True),
    "cat-free-seo-tools": ("texttool/05.png", ICON, True),
    "cat-imaging-tools": ("texttool/06.png", ICON, True),
    "cat-development-tools": ("texttool/07.png", ICON, True),
    "cat-traffic-performance-tools": ("texttool/08.png", ICON, True),
    "cat-pdf-tools": ("texttool/09.png", ICON, True),
    "cat-calculator-tools": ("texttool/10.png", ICON, True),
    "cat-other-tools": ("texttool/11.png", ICON, True),
    # Generic
    "search": ("texttool/02.png", 320, True),
    "upload": ("texttool/22.png", ICON, True),
    "privacy": ("texttool/26.png", ICON, True),
    "code-browser": ("texttool/18.png", ICON, True),
    # Tools (root exports)
    "word-counter": ("texttool/12.png", ICON, True),
    "merge-pdf": ("texttool/14.png", ICON, True),
    "compress-pdf": ("texttool/15.png", ICON, True),
    "json-viewer": ("texttool/19.png", ICON, True),
    "word-to-pdf": ("texttool/20.png", ICON, True),
    "case-converter": ("texttool/24.png", ICON, True),
    # Image tools
    "compress-jpg-image": ("image tools/02.png", ICON, True),
    "compress-png-image": ("image tools/03.png", ICON, True),
    "image-compressor": ("image tools/04.png", ICON, True),
    "photo-resizer-in-kb": ("image tools/05.png", ICON, True),
    "reduce-image-size-in-kb": ("image tools/06.png", ICON, True),
    "compress-image-to-20kb": ("image tools/07.png", ICON, True),
    "compress-jpeg-to-30kb": ("image tools/08.png", ICON, True),
    "compress-image-to-50kb": ("image tools/09.png", ICON, True),
    "compress-jpeg-to-100kb": ("image tools/10.png", ICON, True),
    "compress-jpeg-to-200kb": ("image tools/11.png", ICON, True),
    "compress-image-to-1mb": ("image tools/12.png", ICON, True),
    "free-crop-image-online": ("image tools/13.png", ICON, True),
    "image-resizer": ("image tools/14.png", ICON, True),
    "heic-to-jpg-converter": ("image tools/15.png", ICON, True),
    "jpg-to-png-converter": ("image tools/16.png", ICON, True),
    "jpg-to-svg-converter": ("image tools/17.png", ICON, True),
    "png-to-jpg-converter": ("image tools/18.png", ICON, True),
    "webp-to-png": ("image tools/19.png", ICON, True),
    "avif-to-jpg-converter": ("image tools/20.png", ICON, True),
    "favicon-generator": ("image tools/21.png", ICON, True),
    "video-to-gif": ("image tools/22.png", ICON, True),
    "image-editor": ("image tools/23.png", ICON, True),
    "image-convert": ("image tools/24.png", ICON, True),
    "image-upload": ("image tools/25.png", ICON, True),
    "image-magic": ("image tools/26.png", ICON, True),
}

def drop_label(im: Image.Image) -> Image.Image:
    """Cut away the printed file name: walk up from the bottom past the label, then past the gap."""
    g = im.convert("L")
    w, h = g.size
    px = g.load()

    def has_ink(y: int) -> bool:
        return any(px[x, y] < 200 for x in range(0, w, 2))

    y = h - 1
    while y > h // 2 and not has_ink(y):
        y -= 1
    while y > h // 2 and has_ink(y):  # the label (and any grey bar behind it)
        y -= 1
    while y > h // 2 and not has_ink(y):  # the gap above the label
        y -= 1
    return im.crop((0, 0, w, y + 4))


def trim(im: Image.Image, pad: float, threshold: int = 10) -> Image.Image:
    """Crop to the artwork. A higher threshold ignores the faint glow so small icons fill their box."""
    bg = Image.new("RGB", im.size, (255, 255, 255))
    diff = ImageChops.difference(im.convert("RGB"), bg).convert("L").point(lambda v: 255 if v > threshold else 0)
    box = diff.getbbox() or (0, 0, *im.size)
    im = im.crop(box)
    m = round(max(im.size) * pad)
    out = Image.new("RGB", (im.width + 2 * m, im.height + 2 * m), (255, 255, 255))
    out.paste(im.convert("RGB"), (m, m))
    return feather(out, 0.1 if threshold > 10 else 0.05)


def feather(im: Image.Image, edge: float) -> Image.Image:
    """Fade the outer edge to white so a cropped glow never shows a hard edge."""
    w, h = im.size
    e = max(1, round(min(w, h) * edge))
    mask = Image.new("L", (w, h), 0)
    inner = Image.new("L", (w - 2 * e, h - 2 * e), 255)
    mask.paste(inner, (e, e))
    mask = mask.filter(ImageFilter.GaussianBlur(e / 2))
    white = Image.new("RGB", (w, h), (255, 255, 255))
    return Image.composite(im, white, mask)


def square(im: Image.Image) -> Image.Image:
    s = max(im.size)
    out = Image.new("RGB", (s, s), (255, 255, 255))
    out.paste(im, ((s - im.width) // 2, (s - im.height) // 2))
    return out


def flatten(im: Image.Image) -> Image.Image:
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
        bg.alpha_composite(im)
        return bg.convert("RGB")
    return im.convert("RGB")


def save(im: Image.Image, name: str, size: int, sq: bool) -> None:
    if sq:
        im = square(im)
        target = (size, size)
    else:
        target = (size, round(im.height * size / im.width))
    upscale = target[0] > im.width
    im = im.resize(target, Image.LANCZOS)
    if upscale:
        im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
    im.save(OUT / f"{name}.webp", "WEBP", quality=86, method=6)


def main() -> None:
    OUT.mkdir(exist_ok=True)
    for name, (src, size, sq) in JOBS.items():
        im = flatten(Image.open(ROOT / src))
        if src in LABELLED:
            im = drop_label(im)
        dark = name == "band-dark"
        if not dark:
            im = trim(im, 0.06, 40) if sq else trim(im, 0.02)
        save(im, name, size, sq)
    print(f"wrote {len(JOBS)} files to {OUT}")


if __name__ == "__main__":
    main()
