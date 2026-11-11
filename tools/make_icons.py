# Draws the app icon: night-sky square, orange track arc, gold star flag.
import sys
from PIL import Image, ImageDraw
def icon(size):
    S = 4 * size
    im = Image.new("RGB", (S, S), "#F1E4D1")
    d = ImageDraw.Draw(im)
    u = S / 100
    for x, y, r in [(18, 16, .9), (80, 12, .7), (66, 30, .6), (12, 44, .6)]:
        d.ellipse([(x - r) * u, (y - r) * u, (x + r) * u, (y + r) * u], fill="#D0E6FD")
    # hill path
    d.ellipse([-30 * u, 62 * u, 130 * u, 160 * u], fill="#D0E6FD")
    # dashed path dots climbing to flag
    for i, (x, y) in enumerate([(22, 82), (34, 76), (46, 71), (58, 67)]):
        d.ellipse([(x - 3.2) * u, (y - 3.2) * u, (x + 3.2) * u, (y + 3.2) * u], fill="#f3c766")
    # flag pole + flag
    d.rounded_rectangle([68 * u, 28 * u, 72 * u, 70 * u], radius=2 * u, fill="#162660")
    d.polygon([(72 * u, 29 * u), (92 * u, 37 * u), (72 * u, 46 * u)], fill="#ef8a62")
    # GO node
    d.ellipse([24 * u, 30 * u, 56 * u, 62 * u], fill="#162660", outline="#162660", width=int(2.6 * u))
    # play triangle inside node
    d.polygon([(36 * u, 38 * u), (49 * u, 46 * u), (36 * u, 54 * u)], fill="#F1E4D1")
    return im.resize((size, size), Image.LANCZOS)
out = sys.argv[1]
for name, s in [("icon-192.png", 192), ("icon-512.png", 512), ("apple-touch-icon.png", 180)]:
    icon(s).save(f"{out}/{name}")
