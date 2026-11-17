"""Checks an exported .pptx before anyone opens it. Usage: python -I tools/check_pptx.py <deck>/out/deck.pptx

Fails (exit 1) unless:
  - it is a valid zip, and every .xml and .rels part parses as XML;
  - every part has a content type in [Content_Types].xml (an Override, or a Default for its extension);
  - every internal relationship target exists, and there are no external relationships;
  - p:sldIdLst ids are unique and in range (256 to 2147483647), and each points to an existing slide part;
  - every typeface used by text on the slides is in p:embeddedFontLst, with each style used
    (regular, bold, italic, bold italic), and each embedded font part exists.
LibreOffice ignores embedded fonts, so its render can't show a missing one: this check does.
Standard library only.
"""
import posixpath
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "ct": "http://schemas.openxmlformats.org/package/2006/content-types",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}
R_ID = "{%s}id" % NS["r"]
STYLE_TAG = {"": "regular", "b": "bold", "i": "italic", "bi": "boldItalic"}


def rels_path(part):
    d, f = posixpath.split(part)
    return posixpath.join(d, "_rels", f + ".rels")


def main():
    path = sys.argv[1]
    problems = []
    try:
        z = zipfile.ZipFile(path)
    except (zipfile.BadZipFile, OSError) as e:
        print(f"PROBLEM  pptx: not a valid zip: {e}")
        return 1
    bad = z.testzip()
    if bad:
        problems.append(f"corrupt zip member: {bad}")
    names = {n for n in z.namelist() if not n.endswith("/")}

    xml = {}
    for n in sorted(names):
        if n.endswith(".xml") or n.endswith(".rels"):
            try:
                xml[n] = ET.fromstring(z.read(n))
            except ET.ParseError as e:
                problems.append(f"{n} is not valid XML: {e}")

    # Content types.
    ct = xml.get("[Content_Types].xml")
    if ct is None:
        problems.append("[Content_Types].xml is missing")
    else:
        defaults = {d.get("Extension", "").lower() for d in ct.findall("ct:Default", NS)}
        overrides = {o.get("PartName", "").lstrip("/") for o in ct.findall("ct:Override", NS)}
        for n in sorted(names - {"[Content_Types].xml"}):
            ext = n.rsplit(".", 1)[-1].lower() if "." in n else ""
            if n not in overrides and ext not in defaults:
                problems.append(f"{n} has no content type")

    # Relationships: internal targets exist, nothing external.
    rel_targets = {}
    for n, root in xml.items():
        if not n.endswith(".rels"):
            continue
        src_dir = posixpath.dirname(posixpath.dirname(n))
        for r in root.findall("rel:Relationship", NS):
            target = r.get("Target", "")
            if r.get("TargetMode") == "External":
                problems.append(f"{n}: external relationship {r.get('Id')} -> {target}")
                continue
            resolved = target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join(src_dir, target))
            rel_targets[(n, r.get("Id"))] = resolved
            if resolved not in names:
                problems.append(f"{n}: relationship {r.get('Id')} points to a missing part {resolved}")

    def target(part, rid):
        return rel_targets.get((rels_path(part), rid))

    pres_name = "ppt/presentation.xml"
    pres = xml.get(pres_name)
    if pres is None:
        problems.append("ppt/presentation.xml is missing")
        return report(problems)

    # Slide ids.
    ids = []
    slides = []
    for s in pres.findall("p:sldIdLst/p:sldId", NS):
        try:
            sid = int(s.get("id"))
        except (TypeError, ValueError):
            problems.append(f"slide id {s.get('id')!r} is not a number")
            continue
        if not 256 <= sid <= 2147483647:
            problems.append(f"slide id {sid} is out of range")
        ids.append(sid)
        t = target(pres_name, s.get(R_ID))
        if not t or t not in names:
            problems.append(f"slide id {sid} points to no slide part")
        else:
            slides.append(t)
    if len(ids) != len(set(ids)):
        problems.append("slide ids are not unique")
    if not slides:
        problems.append("the presentation has no slides")

    # Theme fonts, for runs that name +mj-lt / +mn-lt or no typeface at all.
    major = minor = None
    for n, root in xml.items():
        if n.startswith("ppt/theme/") and n.endswith(".xml"):
            mj = root.find(".//a:majorFont/a:latin", NS)
            mn = root.find(".//a:minorFont/a:latin", NS)
            major = major or (mj.get("typeface") if mj is not None else None)
            minor = minor or (mn.get("typeface") if mn is not None else None)

    # Typefaces and styles used by visible text on the slides.
    used = {}
    for part in slides:
        root = xml.get(part)
        if root is None:
            continue
        for run in root.iter("{%s}r" % NS["a"]):
            t = run.find("a:t", NS)
            if t is None or not (t.text or "").strip():
                continue
            rpr = run.find("a:rPr", NS)
            b = rpr is not None and rpr.get("b") in ("1", "true")
            i = rpr is not None and rpr.get("i") in ("1", "true")
            latin = rpr.find("a:latin", NS) if rpr is not None else None
            face = latin.get("typeface") if latin is not None else "+mn-lt"
            face = {"+mj-lt": major, "+mn-lt": minor}.get(face, face)
            if not face:
                problems.append(f"{part}: text with no typeface and no theme font")
                continue
            used.setdefault(face, set()).add(("b" if b else "") + ("i" if i else ""))

    # Embedded fonts.
    embedded = {}
    for ef in pres.findall("p:embeddedFontLst/p:embeddedFont", NS):
        font = ef.find("p:font", NS)
        face = font.get("typeface") if font is not None else None
        styles = {}
        for tag in ("regular", "bold", "italic", "boldItalic"):
            el = ef.find(f"p:{tag}", NS)
            if el is not None:
                t = target(pres_name, el.get(R_ID))
                styles[tag] = t
                if not t or t not in names:
                    problems.append(f"embedded font {face} {tag} points to no font part")
        if face:
            embedded[face] = styles
    for face, styles in sorted(used.items()):
        if face not in embedded:
            problems.append(f'typeface "{face}" is used on slides but not embedded')
            continue
        for s in sorted(styles):
            tag = STYLE_TAG[s]
            if tag not in embedded[face]:
                problems.append(f'typeface "{face}" is used in {tag} but that style is not embedded')

    print(f"pptx: {len(slides)} slides, {len(names)} parts, typefaces used: "
          + ", ".join(f"{f} ({'/'.join(STYLE_TAG[s] for s in sorted(st))})" for f, st in sorted(used.items())))
    return report(problems)


def report(problems):
    for p in problems:
        print(f"PROBLEM  pptx: {p}")
    print("pptx check: " + (f"{len(problems)} problem(s)." if problems else "OK."))
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
