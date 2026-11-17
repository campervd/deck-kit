"""Test helper for hardening.ps1: write two broken copies of a good .pptx, to prove check_pptx.py catches them.
Usage: python -I make_bad_pptx.py <good.pptx> <outdir>
  no-face.pptx:  the first embedded font face is removed from presentation.xml (a typeface used but not embedded)
  no-bold.pptx:  the bold style of the first embedded face that has one is removed (a style used but not embedded)
Works for any design: it reads the font names from the file instead of assuming them.
"""
import re
import sys
import zipfile
from pathlib import Path

src, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
FONT = re.compile(r"<p:embeddedFont>.*?</p:embeddedFont>", re.S)


def rewrite(name, change):
    with zipfile.ZipFile(src) as zin, zipfile.ZipFile(out / name, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "ppt/presentation.xml":
                text = data.decode("utf-8")
                new = change(text)
                assert new != text, f"{name}: nothing changed"
                data = new.encode("utf-8")
            zout.writestr(item, data)
    print(f"wrote {out / name}")


def drop_first_face(t):
    return FONT.sub("", t, count=1)


def drop_first_bold(t):
    for m in FONT.finditer(t):
        block = m.group(0)
        if "<p:bold " in block:
            return t[: m.start()] + re.sub(r"<p:bold [^>]*/>", "", block, count=1) + t[m.end():]
    return t


rewrite("no-face.pptx", drop_first_face)
rewrite("no-bold.pptx", drop_first_bold)
