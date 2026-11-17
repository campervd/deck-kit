"""Writes one contact sheet of a deck's slides, in order, each labeled with its slide number.
Usage: python -I <kit>/tools/contact_sheet.py <deck folder>      (build.mjs runs it after the check)
Reads <deck>/out/html/NN.png and writes <deck>/out/<deck folder name>-contact-sheet.png.
Uses the kit's own pinned Pillow in <kit>/pylib (python -I ignores user site-packages).
"""
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "pylib"))
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

deck = os.path.abspath(sys.argv[1])
html = os.path.join(deck, "out", "html")
slides = sorted(f for f in os.listdir(html) if re.fullmatch(r"\d\d\.png", f)) if os.path.isdir(html) else []
if not slides:
    sys.exit("No slide PNGs in out/html: the check step must run first.")
cols, w, h, gap, label = 3, 640, 360, 24, 44
rows = (len(slides) + cols - 1) // cols
sheet = Image.new("RGB", (cols * w + (cols + 1) * gap, rows * (h + label) + (rows + 1) * gap), (128, 128, 128))
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.load_default(size=28)
except TypeError:
    font = ImageFont.load_default()
for i, name in enumerate(slides):
    r, c = divmod(i, cols)
    x, y = gap + c * (w + gap), gap + r * (h + label + gap)
    draw.text((x, y + 6), f"Slide {int(name[:2])}", fill="white", font=font)
    with Image.open(os.path.join(html, name)) as im:
        sheet.paste(im.convert("RGB").resize((w, h)), (x, y + label))
out = os.path.join(deck, "out", f"{os.path.basename(deck)}-contact-sheet.png")
sheet.save(out)
print(f"Contact sheet: out/{os.path.basename(out)} ({len(slides)} slides)")
