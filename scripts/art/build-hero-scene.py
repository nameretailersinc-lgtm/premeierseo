"""Builds public/home-hero/scene.webp from the approved homepage mockup.

Crops the desk scene, blurs out the stat cards baked into the mockup (real HTML cards sit on top),
removes the sliver of search button at the left edge, and fades the left edge to transparent
so it blends into the hero background.
Usage: python scripts/art/build-hero-scene.py <mockup.png>
"""
import sys
from PIL import Image, ImageDraw, ImageFilter

src = Image.open(sys.argv[1]).convert("RGB")
X0, Y0, X1, Y1 = 930, 82, 1942, 607  # scene box in mockup pixels (below header, above category strip)
scene = src.crop((X0, Y0, X1, Y1)).convert("RGBA")
W, H = scene.size
blur = scene.filter(ImageFilter.GaussianBlur(38))


def patch(box, feather=24):
    """Replace a rectangle with the blurred scene, feathered at the edges."""
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).rounded_rectangle(box, radius=28, fill=255)
    m = m.filter(ImageFilter.GaussianBlur(feather))
    scene.paste(blur, (0, 0), m)


patch((1665 - X0 - 10, 128 - Y0 - 8, 1910 - X0 + 10, 472 - Y0 + 10))  # baked stat cards
patch((-40, 455 - Y0, 1000 - X0, 525 - Y0), feather=16)  # tail of the search button

# Fade the left edge to transparent
alpha = Image.new("L", (W, H), 255)
d = ImageDraw.Draw(alpha)
fade = 170
for x in range(fade):
    d.line([(x, 0), (x, H)], fill=int(255 * (x / fade) ** 1.6))
# soften the bottom edge where the category strip overlaps
for y in range(40):
    yy = H - 40 + y
    for_alpha = int(255 * (1 - y / 40) ** 1.2)
    d.line([(fade, yy), (W, yy)], fill=for_alpha)
alpha = alpha.filter(ImageFilter.GaussianBlur(2))
r, g, b, a = scene.split()
from PIL import ImageChops

scene.putalpha(ImageChops.multiply(a, alpha))
scene.save("public/home-hero/scene.webp", "WEBP", quality=86, method=6)
print("scene.webp", scene.size)
