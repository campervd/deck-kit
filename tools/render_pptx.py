"""Render an exported .pptx back to images and compare it with the browser screenshots.

Usage: python -I <kit>/tools/render_pptx.py <deck>/out/deck.pptx   (build.mjs runs it)

Needs LibreOffice (soffice), plus pypdfium2 and pillow, which setup.ps1 installs into <kit>/pylib.
Run with python -I (isolated): it ignores user site-packages and the current folder, so the kit
loads only its own pinned packages from pylib.
Writes:
  out/pptx/NN.png      each PowerPoint slide as LibreOffice draws it
  out/compare/NN.png   browser (left) and PowerPoint (right) side by side
  out/compare/all.png  every comparison on one sheet
Prints a difference score per slide. A high score means the PowerPoint
version drifted from the HTML (text rewrapped, shapes moved, font swapped).
Also checks slide count and that every slide has speaker notes.
"""
import glob
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "pylib"))
try:
    import pypdfium2 as pdfium  # Google's PDFium (the PDF engine in Chrome), BSD/Apache licensed
    from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageStat
except ImportError:
    sys.exit("Missing Python packages in the kit's pylib folder. Run setup.ps1.")

W, H = 1920, 1080
DIFF_LIMIT = 6.0  # mean per-pixel difference (0-255) above which a slide needs a look


def find_soffice():
    for name in ("soffice", "soffice.exe", "libreoffice"):
        p = shutil.which(name)
        if p:
            return p
    for p in (r"C:\Program Files\LibreOffice\program\soffice.exe",
              r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
              "/Applications/LibreOffice.app/Contents/MacOS/soffice"):
        if os.path.exists(p):
            return p
    return None


def pptx_facts(path):
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        slides = sorted(n for n in names if re.fullmatch(r"ppt/slides/slide\d+\.xml", n))
        notes = []
        for n in sorted(x for x in names if re.fullmatch(r"ppt/notesSlides/notesSlide\d+\.xml", x)):
            xml = z.read(n).decode("utf8", "ignore")
            text = " ".join(re.findall(r"<a:t>([^<]*)</a:t>", xml))
            notes.append(len(text.strip()) > 20)
    return len(slides), notes


def main():
    pptx = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "out/deck.pptx")
    if not os.path.exists(pptx):
        sys.exit(f"Not found: {pptx}. The export step must run first.")
    out = os.path.dirname(pptx)
    soffice = find_soffice()
    if not soffice:
        sys.exit("LibreOffice not found. Install it (winget install -e --id TheDocumentFoundation.LibreOffice) and rerun.")

    n_slides, notes = pptx_facts(pptx)
    problems = []
    html_pngs = sorted(glob.glob(os.path.join(out, "html", "[0-9][0-9].png")))
    if html_pngs and len(html_pngs) != n_slides:
        problems.append(f"PowerPoint has {n_slides} slides but the HTML had {len(html_pngs)}.")
    if sum(notes) < n_slides:
        problems.append(f"Only {sum(notes)} of {n_slides} slides have speaker notes in the .pptx.")

    # LibreOffice needs its own profile dir so it runs while another copy is open.
    with tempfile.TemporaryDirectory() as tmp:
        profile = "file:///" + os.path.join(tmp, "lo-profile").replace("\\", "/").lstrip("/")
        subprocess.run([soffice, f"-env:UserInstallation={profile}", "--headless", "--convert-to", "pdf",
                        "--outdir", tmp, pptx], check=True, capture_output=True, timeout=300)
        pdf = os.path.join(tmp, os.path.splitext(os.path.basename(pptx))[0] + ".pdf")
        pptx_dir = os.path.join(out, "pptx")
        os.makedirs(pptx_dir, exist_ok=True)
        for f in glob.glob(os.path.join(pptx_dir, "*.png")):
            os.remove(f)
        doc = pdfium.PdfDocument(pdf)
        for i in range(len(doc)):
            page = doc[i]
            scale = W / page.get_width()
            page.render(scale=scale).to_pil().save(os.path.join(pptx_dir, f"{i + 1:02d}.png"))
            page.close()
        doc.close()

    cmp_dir = os.path.join(out, "compare")
    os.makedirs(cmp_dir, exist_ok=True)
    sheets = []
    print(f"Slides: {n_slides}. PowerPoint renders: out/pptx/NN.png")
    for i in range(n_slides):
        name = f"{i + 1:02d}.png"
        right = Image.open(os.path.join(out, "pptx", name)).convert("RGB").resize((W, H))
        hp = os.path.join(out, "html", name)
        if not os.path.exists(hp):
            continue
        left = Image.open(hp).convert("RGB").resize((W, H))
        score = sum(ImageStat.Stat(ImageChops.difference(left, right)).mean) / 3
        pair = Image.new("RGB", (W * 2 + 40, H + 70), "white")
        pair.paste(left, (0, 70))
        pair.paste(right, (W + 40, 70))
        d = ImageDraw.Draw(pair)
        try:
            font = ImageFont.load_default(size=40)
        except TypeError:
            font = ImageFont.load_default()
        d.text((10, 14), f"Slide {i + 1}: browser (HTML)", fill="black", font=font)
        d.text((W + 50, 14), f"PowerPoint export, difference {score:.1f}", fill="black", font=font)
        pair.save(os.path.join(cmp_dir, name))
        sheets.append(pair.resize((pair.width // 4, pair.height // 4)))
        flag = "  <-- check this slide" if score > DIFF_LIMIT else ""
        print(f"slide {i + 1}: difference {score:.1f}{flag}")
    if sheets:
        sw, sh = sheets[0].size
        cols = 2
        rows = (len(sheets) + cols - 1) // cols
        sheet = Image.new("RGB", (sw * cols, sh * rows), "white")
        for k, im in enumerate(sheets):
            sheet.paste(im, ((k % cols) * sw, (k // cols) * sh))
        sheet.save(os.path.join(cmp_dir, "all.png"))
        print("Side by side: out/compare/NN.png and out/compare/all.png")
    else:
        print("No browser screenshots in out/html, so no comparison. The check step must run first.")
    for p in problems:
        print("PROBLEM  " + p)
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
