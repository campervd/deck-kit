// Checks deck.html in a real browser before export, and saves a PNG of every slide.
// Usage: node <kit>/tools/check.mjs <deck folder>   (build.mjs runs it from the kit folder)
// Writes <deck>/out/html/NN.png, out/html/all.png (every slide on one sheet) and out/check-report.json.
// The browser may load only files inside the deck folder (guard.mjs); any other request fails the check.
// Exit code 1 means problems to fix. Warnings are printed but don't fail the check.
//
// What it measures (rules from quality-spec.md; nothing here is specific to one design):
//  - every .slide is 1920 x 1080 and has speaker notes in a <template data-pptx-notes> inside it
//  - nothing crosses the outer margin (from design.md, 96 to 144 px; data-bleed elements are exempt)
//  - no element's content overflows it, no text spills out of its box or touches the box's edge
//  - no text overlaps other text, sits under another shape, or touches a connector line
//  - every font face used is loaded (no browser-faked bold or italic); weights 400 and 700 only
//  - text contrast: 4.5:1, or 3:1 for text 36 px and up
//  - finish: every content slide has filled or outlined components covering 12% or more of the content area
//  - warnings: off-palette colors (not in design.md), more than 7 type sizes, headlines not aligned
//    across content slides, paths typed as "A -> B -> C", more than 60 words on a slide, text under 24 px,
//    content that leaves the bottom 35% or more of the content area empty
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { deckRoot, restrictRequests, fileUrl, findBrowser, LAUNCH_ARGS } from './guard.mjs';

const deckDir = deckRoot(process.argv[2]);
const htmlPath = path.join(deckDir, 'deck.html');
const outDir = path.join(deckDir, 'out', 'html');

if (!fs.existsSync(htmlPath)) {
  console.error(`Not found: ${htmlPath}`);
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });
// Old images are cleared only after the browser has started (below), so a failed launch never loses them.

// The design's palette and margin come from design.md.
const designPath = path.join(deckDir, 'design.md');
let palette = null;
let SAFE = 96;
const early = [];
if (fs.existsSync(designPath)) {
  const design = fs.readFileSync(designPath, 'utf8');
  const hex = design.match(/#[0-9a-fA-F]{6}\b/g) || [];
  palette = [...new Set(hex.map((h) => h.toLowerCase()))];
  if (!palette.length) early.push({ slide: 0, issue: 'design.md lists no #RRGGBB colors, so colors cannot be checked.' });
  const m = design.match(/outer margin[^0-9\n]{0,40}(\d{2,3})\s*px/i);
  if (m && +m[1] >= 96 && +m[1] <= 144) SAFE = +m[1];
  else early.push({ slide: 0, issue: `design.md gives no outer margin between 96 and 144 px (write e.g. "Outer margin: 120 px"). Checking against ${SAFE} px.` });
} else {
  early.push({ slide: 0, issue: 'design.md not found. Write it before building (see AGENTS.md).' });
}
const designText = fs.existsSync(designPath) ? fs.readFileSync(designPath, 'utf8').toLowerCase() : '';

// Record the margin and palette each build; warn when design.md changed them since the last one,
// so a design isn't quietly edited to make a check pass.
const snapPath = path.join(deckDir, 'out', 'design-snapshot.json');
if (palette) {
  try {
    const prev = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
    if (prev.margin !== SAFE) early.push({ slide: 0, issue: `design.md changed the outer margin from ${prev.margin}px to ${SAFE}px since the last build. Only change the design on purpose, and say why in out/review.md.` });
    const added = palette.filter((c) => !prev.palette.includes(c));
    const removed = prev.palette.filter((c) => !palette.includes(c));
    if (added.length || removed.length) early.push({ slide: 0, issue: `design.md changed its colors since the last build (added ${added.join(', ') || 'none'}; removed ${removed.join(', ') || 'none'}). Say why in out/review.md.` });
  } catch {}
}

const executablePath = findBrowser();
if (!executablePath) {
  console.error('No Chrome or Edge found. Install one, or set BROWSER_PATH to its .exe.');
  process.exit(2);
}

// Runs inside the page, once per slide, with that slide scrolled into view.
function checkSlide({ index, SAFE, palette, designText }) {
  const problems = [];
  const warnings = [];
  const slide = document.querySelectorAll('.slide')[index];
  slide.scrollIntoView();
  const n = index + 1;

  const label = (el) => {
    const t = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
    const cls = el.getAttribute && el.getAttribute('class');
    const tag = el.tagName.toLowerCase() + (cls ? '.' + cls.trim().split(/\s+/).join('.') : '');
    return t ? `${tag} "${t.slice(0, 50)}"` : tag;
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const parseColor = (c) => {
    const m = c && c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : parseFloat(m[4]) };
  };
  const toHex = (c) => '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('');
  const isBox = (el) => {
    if (el instanceof SVGElement) return false;
    const cs = getComputedStyle(el);
    const bg = parseColor(cs.backgroundColor);
    const border = ['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== 'none');
    return (bg && bg.a > 0) || border || cs.backgroundImage !== 'none';
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const blend = (top, under) => ({
    r: Math.round(top.r * top.a + under.r * (1 - top.a)),
    g: Math.round(top.g * top.a + under.g * (1 - top.a)),
    b: Math.round(top.b * top.a + under.b * (1 - top.a)),
    a: 1,
  });
  // The color actually behind a point: stack the backgrounds found there, top to bottom.
  const backgroundAt = (x, y, self) => {
    const stack = document.elementsFromPoint(x, y).filter((e) => e !== self && !(e instanceof SVGElement));
    const layers = [];
    for (const e of stack) {
      const c = parseColor(getComputedStyle(e).backgroundColor);
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a >= 1) break;
      }
    }
    let col = { r: 255, g: 255, b: 255, a: 1 };
    for (const c of layers.reverse()) col = blend(c, col);
    return col;
  };
  const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const inside = (a, b, tol = 1.5) => a.left >= b.left - tol && a.right <= b.right + tol && a.top >= b.top - tol && a.bottom <= b.bottom + tol;
  const grow = (r, d) => ({ left: r.left - d, right: r.right + d, top: r.top - d, bottom: r.bottom + d });

  const s = slide.getBoundingClientRect();
  if (Math.abs(s.width - 1920) > 1 || Math.abs(s.height - 1080) > 1)
    problems.push({ slide: n, issue: `Slide is ${Math.round(s.width)} x ${Math.round(s.height)}, must be 1920 x 1080.` });
  // The exporter reads notes from elements inside the slide, not from the slide's own attribute.
  const noteText = [...slide.querySelectorAll('[data-pptx-notes]')]
    .map((e) => (e.tagName === 'TEMPLATE' ? e.content.textContent : e.textContent) || '')
    .join(' ')
    .trim();
  if (!noteText)
    problems.push({ slide: n, issue: 'Missing speaker notes. Put them inside the slide as <template data-pptx-notes>...</template>.' });
  if (slide.scrollHeight > slide.clientHeight + 1 || slide.scrollWidth > slide.clientWidth + 1)
    problems.push({ slide: n, issue: 'Content overflows the slide.' });

  const pattern = (slide.getAttribute('data-pattern') || '').trim();
  if (!pattern) warnings.push({ slide: n, issue: 'No data-pattern on the slide (name the pattern from design.md).' });
  else if (designText && !designText.includes(pattern.toLowerCase().replace(/[-_]/g, ' ')) && !designText.includes(pattern.toLowerCase()))
    warnings.push({ slide: n, issue: `Pattern "${pattern}" isn't described in design.md.` });

  const safe = { left: s.left + SAFE, right: s.right - SAFE, top: s.top + SAFE, bottom: s.bottom - SAFE };
  const els = [...slide.querySelectorAll('*')].filter(visible);
  const boxes = els.filter(isBox);
  const connectors = els.filter((el) => {
    const r = el.getBoundingClientRect();
    const thin = Math.min(r.width, r.height);
    if (el instanceof SVGSVGElement) return thin <= 48;
    return isBox(el) && thin <= 6 && !(el.innerText || '').trim();
  });
  const textRuns = []; // {el, rect, size}
  const faces = []; // {family, weight, style}
  let words = 0;
  let metaCount = 0;

  for (const el of els) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    // data-bleed lets a shape touch the slide edge on purpose. A diagram image never bleeds: its labels and
    // frames stay inside the margin like any other content.
    const diagramImg = el instanceof HTMLImageElement && (/^(\.\/)?diagrams\//.test(el.getAttribute('src') || '') || !!el.closest('[data-diagram]'));
    if ((!el.closest('[data-bleed]') || diagramImg) && !inside(r, safe))
      problems.push({ slide: n, issue: `Crosses the ${SAFE}px outer margin: ${label(el)}` });

    // Display fonts at tight line-heights draw a little past their line box; allow for that, not for real overflow.
    const blockish = !['inline', 'contents'].includes(cs.display) && el.clientHeight > 0;
    const slackY = Math.max(2, parseFloat(cs.fontSize) * 0.3);
    if (blockish && !(el instanceof SVGElement) && (el.scrollHeight > el.clientHeight + slackY || el.scrollWidth > el.clientWidth + 2))
      problems.push({ slide: n, issue: `Content overflows its box: ${label(el)}` });

    const own = [...el.childNodes].filter((c) => c.nodeType === 3 && c.textContent.trim());
    if (!own.length) {
      if (palette) {
        for (const prop of ['backgroundColor', 'borderTopColor', 'borderLeftColor']) {
          if (prop !== 'backgroundColor' && !(parseFloat(cs[prop.replace('Color', 'Width')]) > 0)) continue;
          const c = parseColor(cs[prop]);
          if (c && c.a > 0 && !palette.includes(toHex(c))) warnings.push({ slide: n, issue: `Color ${toHex(c)} (${prop}) isn't in design.md: ${label(el)}` });
        }
      }
      continue;
    }
    if (el instanceof SVGElement) {
      problems.push({ slide: n, issue: `Text inside an SVG won't convert; put it in an HTML element: ${label(el)}` });
      continue;
    }

    const family = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    const weight = parseInt(cs.fontWeight, 10);
    const size = parseFloat(cs.fontSize);
    faces.push({ family, weight, style: cs.fontStyle });
    if (weight !== 400 && weight !== 700) problems.push({ slide: n, issue: `font-weight ${weight}; use 400 or 700 (PowerPoint has only regular and bold): ${label(el)}` });
    if (cs.fontStyle === 'italic' && weight === 700) problems.push({ slide: n, issue: `Bold italic isn't in the font library: ${label(el)}` });
    // Everything the audience reads is 24 px or more. Only meta text (page numbers, eyebrow labels),
    // marked data-role="meta", may go down to 20 px, and at most 3 such elements per slide.
    if (size < 20) problems.push({ slide: n, issue: `Text under 20px (${size}px): ${label(el)}` });
    else if (size < 24) {
      if (el.closest('[data-role="meta"]')) metaCount++;
      else problems.push({ slide: n, issue: `Readable text under 24px (${size}px): ${label(el)}. Only page numbers and eyebrow labels may be smaller; mark them data-role="meta".` });
    }

    const text = own.map((t) => t.textContent).join(' ');
    words += text.trim().split(/\s+/).filter((w) => /\w/.test(w)).length;
    if ((text.match(/[\u2190-\u2193\u21D2\u27F5\u27F6\u279C\u2794]/g) || []).length >= 2 || (text.match(/->|=>/g) || []).length >= 2)
      warnings.push({ slide: n, issue: `A path typed as text; draw it as boxes and connectors instead: ${label(el)}` });

    const fg = parseColor(cs.color);
    if (palette && fg && !palette.includes(toHex(fg))) warnings.push({ slide: n, issue: `Color ${toHex(fg)} (text) isn't in design.md: ${label(el)}` });

    for (const node of own) {
      const range = document.createRange();
      range.selectNodeContents(node);
      // Glyph boxes are taller than a tight line-height; trim them to the line box.
      const lh = parseFloat(cs.lineHeight);
      for (const rr of range.getClientRects()) {
        if (!(rr.width > 0 && rr.height > 0)) continue;
        let { left, right, top, bottom } = rr;
        if (lh > 0 && rr.height > lh) {
          const mid = (top + bottom) / 2;
          top = mid - lh / 2;
          bottom = mid + lh / 2;
        }
        textRuns.push({ el, rect: { left, right, top, bottom }, size, weight });
      }
    }
  }

  // Contrast, measured against what is actually behind the text.
  const seenContrast = new Set();
  for (const t of textRuns) {
    if (seenContrast.has(t.el)) continue;
    seenContrast.add(t.el);
    const fg = parseColor(getComputedStyle(t.el).color);
    if (!fg) continue;
    const cx = (t.rect.left + t.rect.right) / 2;
    const cy = (t.rect.top + t.rect.bottom) / 2;
    if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) continue;
    const bg = backgroundAt(cx, cy, t.el);
    const cr = ratio(fg.a < 1 ? blend(fg, bg) : fg, bg);
    const need = t.size >= 36 ? 3 : 4.5;
    if (cr < need) problems.push({ slide: n, issue: `Contrast ${cr.toFixed(2)}:1, needs ${need}:1 (${toHex(fg)} on ${toHex(bg)}): ${label(t.el)}` });
  }

  // Text stays inside the nearest box it sits in, with room to breathe.
  for (const t of textRuns) {
    const host = boxes.filter((b) => b.contains(t.el)).pop();
    if (!host) continue;
    const hr = host.getBoundingClientRect();
    const hcs = getComputedStyle(host);
    const inner = {
      left: hr.left + parseFloat(hcs.borderLeftWidth),
      right: hr.right - parseFloat(hcs.borderRightWidth),
      top: hr.top + parseFloat(hcs.borderTopWidth),
      bottom: hr.bottom - parseFloat(hcs.borderBottomWidth),
    };
    if (!inside(t.rect, hr)) {
      problems.push({ slide: n, issue: `Text spills out of its box: ${label(t.el)} in ${label(host)}` });
      continue;
    }
    const gap = Math.min(t.rect.left - inner.left, inner.right - t.rect.right, t.rect.top - inner.top, inner.bottom - t.rect.bottom);
    if (gap < 4) problems.push({ slide: n, issue: `Text touches the edge of its box (${Math.max(0, gap).toFixed(0)}px); add padding: ${label(t.el)} in ${label(host)}` });
    else if (gap < 8) warnings.push({ slide: n, issue: `Text sits ${gap.toFixed(0)}px from the edge of its box: ${label(t.el)} in ${label(host)}` });
  }

  // Text must not overlap other text, sit under a later shape, or touch a connector.
  for (let a = 0; a < textRuns.length; a++) {
    const A = textRuns[a];
    for (let b = a + 1; b < textRuns.length; b++) {
      const B = textRuns[b];
      if (A.el === B.el || A.el.contains(B.el) || B.el.contains(A.el)) continue;
      if (inter(A.rect, B.rect) > 6) problems.push({ slide: n, issue: `Text overlaps: ${label(A.el)} and ${label(B.el)}` });
    }
    for (const box of boxes) {
      if (box.contains(A.el) || A.el.contains(box)) continue;
      const boxIsLater = A.el.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING;
      if (boxIsLater && inter(A.rect, box.getBoundingClientRect()) > 6)
        problems.push({ slide: n, issue: `Text covered by another shape: ${label(A.el)} under ${label(box)}` });
    }
    for (const c of connectors) {
      if (c.contains(A.el) || A.el.contains(c)) continue;
      if (inter(grow(A.rect, 6), c.getBoundingClientRect()) > 0)
        problems.push({ slide: n, issue: `A connector or icon touches text (keep 8px clear): ${label(A.el)} and ${label(c)}` });
    }
  }

  const isOpening = /cover|statement|title|section/i.test(pattern);
  if (!isOpening && words > 60) warnings.push({ slide: n, issue: `${words} words on the slide; aim for 60 or fewer.` });

  // Finish (quality-spec.md 5a): a content slide needs drawn components (cards, chips, step rows, diagram boxes), not only
  // text and hairlines, and its content should use the slide's height. Opening slides are exempt.
  // A component is filled (a color other than the slide's) or outlined on all four sides; a one-sided rule doesn't count.
  const zone = (safe.right - safe.left) * (safe.bottom - safe.top);
  const slideBg = parseColor(getComputedStyle(slide).backgroundColor);
  const sameColor = (a, b) => a && b && a.r === b.r && a.g === b.g && a.b === b.b;
  const comps = boxes.filter((el) => {
    const r = el.getBoundingClientRect();
    if (el === slide || Math.min(r.width, r.height) <= 6 || r.width * r.height >= zone * 0.6) return false;
    const cs = getComputedStyle(el);
    const bg = parseColor(cs.backgroundColor);
    const filled = bg && bg.a > 0 && !sameColor(bg, slideBg);
    const outlined = ['Top', 'Right', 'Bottom', 'Left'].every((d) => parseFloat(cs[`border${d}Width`]) > 0 && cs[`border${d}Style`] !== 'none');
    return filled || outlined;
  });
  // Placed images (diagram PNGs from diagrams/, supplied assets) count as components too.
  const imgs = els.filter((el) => el instanceof HTMLImageElement);
  for (const im of imgs) {
    const r = im.getBoundingClientRect();
    const src = im.getAttribute('src') || '';
    if (!im.complete || !im.naturalWidth) problems.push({ slide: n, issue: `Image did not load: ${src}` });
    // A diagram PNG is rendered at 2x of its designed size. It must be shown at exactly that size, width and
    // height: smaller shrinks its 24 px labels, and a different height stretches or squashes it.
    else if (/^(\.\/)?diagrams\//.test(src) && (Math.abs(im.naturalWidth / 2 - r.width) > Math.max(4, r.width * 0.02) || Math.abs(im.naturalHeight / 2 - r.height) > Math.max(4, r.height * 0.02)))
      problems.push({ slide: n, issue: `Diagram ${src} is designed ${Math.round(im.naturalWidth / 2)} x ${Math.round(im.naturalHeight / 2)}px but shown ${Math.round(r.width)} x ${Math.round(r.height)}px. Show it at exactly its designed size (the build prints it), or change the diagram's width in its .json.` });
    // Any other image keeps its own aspect ratio: never stretched or squashed (quality-spec.md, section 6b).
    else if (Math.abs((r.width / r.height) / (im.naturalWidth / im.naturalHeight) - 1) > 0.02)
      problems.push({ slide: n, issue: `Image ${src} is stretched: its own shape is ${im.naturalWidth} x ${im.naturalHeight}, shown ${Math.round(r.width)} x ${Math.round(r.height)}px. Keep its aspect ratio.` });
    else if (im.naturalWidth < r.width * 1.5)
      warnings.push({ slide: n, issue: `Image ${src} is ${im.naturalWidth}px wide, shown at ${Math.round(r.width)}px; render it at 2x so it stays sharp.` });
    // A placed image may not overlap any other element on the slide: no covered card edges or text.
    // Its own containers (ancestors) and a frame that holds the whole image are fine.
    if (/^(\.\/)?diagrams\//.test(src) || im.closest('[data-diagram]')) {
      for (const o of [...comps, ...textRuns.map((t) => t.el)]) {
        if (o === im || o.contains(im) || im.contains(o)) continue;
        const or = o.getBoundingClientRect();
        const iw = Math.min(r.right, or.right) - Math.max(r.left, or.left);
        const ih = Math.min(r.bottom, or.bottom) - Math.max(r.top, or.top);
        if (iw > 1 && ih > 1 && !inside(r, or)) {
          problems.push({ slide: n, issue: `Diagram image ${src} overlaps ${label(o)} by ${Math.round(iw)} x ${Math.round(ih)} px. Move or resize so they don't touch.` });
          break;
        }
      }
    }
  }
  // Connectors and arrows sit centered between the two components they join (quality-spec.md, section 6).
  // An arrow is a small drawn element with no text: a thin bar, a CSS triangle, or a small SVG. Pieces
  // close together along one line (a shaft and its head) form one arrow. The two components it joins are
  // the nearest ones on either side of it that share its row (or column). The arrow's center must match the
  // center of the gap between them, across the gap and along it, within 2 px; its pieces must touch.
  const hasText = (el) => !!(el.innerText || '').trim();
  const joinable = comps.filter((c) => { const r = c.getBoundingClientRect(); return hasText(c) && r.width >= 120 && r.height >= 64; });
  const arrowParts = els.filter((el) => {
    if (el instanceof HTMLImageElement || hasText(el) || el.closest('[data-role="meta"]')) return false;
    if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) return false;
    if (!(el instanceof SVGSVGElement) && !isBox(el)) return false;
    const r = el.getBoundingClientRect();
    return Math.max(r.width, r.height) <= 240 && Math.min(r.width, r.height) <= 48;
  }).filter((el, _, all) => !all.some((o) => o !== el && o.contains(el)));
  const groups = [];
  for (const el of arrowParts) {
    const r = el.getBoundingClientRect();
    const g = groups.find((G) => {
      const b = G.rect;
      const dx = Math.max(0, Math.max(b.left, r.left) - Math.min(b.right, r.right));
      const dy = Math.max(0, Math.max(b.top, r.top) - Math.min(b.bottom, r.bottom));
      const sameRow = Math.abs((b.top + b.bottom) / 2 - (r.top + r.bottom) / 2) <= 4 && dy === 0;
      const sameCol = Math.abs((b.left + b.right) / 2 - (r.left + r.right) / 2) <= 4 && dx === 0;
      return (sameRow && dx <= 64) || (sameCol && dy <= 64);
    });
    if (g) { g.parts.push(el); g.rect = { left: Math.min(g.rect.left, r.left), right: Math.max(g.rect.right, r.right), top: Math.min(g.rect.top, r.top), bottom: Math.max(g.rect.bottom, r.bottom) }; }
    else groups.push({ parts: [el], rect: { left: r.left, right: r.right, top: r.top, bottom: r.bottom } });
  }
  for (const g of groups) {
    const a = g.rect, acx = (a.left + a.right) / 2, acy = (a.top + a.bottom) / 2;
    // Only components in the arrow's own container: a dot inside a card joins things in that card.
    const home = comps.filter((c) => c !== slide && !arrowParts.includes(c) && c.contains(g.parts[0])).pop() || slide;
    const free = joinable.filter((c) => c !== home && home.contains(c) && !c.contains(g.parts[0]));
    const overlapY = (r) => Math.min(r.bottom, a.bottom) - Math.max(r.top, a.top);
    const overlapX = (r) => Math.min(r.right, a.right) - Math.max(r.left, a.left);
    const near = (list, key) => list.sort((p, q) => key(p) - key(q))[0];
    const rects = free.map((c) => ({ c, r: c.getBoundingClientRect() }));
    const horiz = a.right - a.left >= a.bottom - a.top;
    let A = null, B = null;
    for (const dir of horiz ? ['h', 'v'] : ['v', 'h']) {
      if (dir === 'h') {
        A = near(rects.filter((x) => x.r.right <= a.left + 2 && overlapY(x.r) > 0), (x) => a.left - x.r.right);
        B = near(rects.filter((x) => x.r.left >= a.right - 2 && overlapY(x.r) > 0), (x) => x.r.left - a.right);
      } else {
        A = near(rects.filter((x) => x.r.bottom <= a.top + 2 && overlapX(x.r) > 0), (x) => a.top - x.r.bottom);
        B = near(rects.filter((x) => x.r.top >= a.bottom - 2 && overlapX(x.r) > 0), (x) => x.r.top - a.bottom);
      }
      if (A && B) { g.dir = dir; break; }
    }
    if (!(A && B)) continue;
    const what = `${g.parts.map(label).join(' + ')} between ${label(A.c)} and ${label(B.c)}`;
    let across, along;
    if (g.dir === 'h') {
      across = acx - (A.r.right + B.r.left) / 2;
      along = acy - (Math.max(A.r.top, B.r.top) + Math.min(A.r.bottom, B.r.bottom)) / 2;
    } else {
      across = acy - (A.r.bottom + B.r.top) / 2;
      along = acx - (Math.max(A.r.left, B.r.left) + Math.min(A.r.right, B.r.right)) / 2;
    }
    if (Math.abs(across) > 2 || Math.abs(along) > 2)
      problems.push({ slide: n, issue: `Connector off-center between the two elements it joins (${Math.round(Math.abs(across))} px ${g.dir === 'h' ? 'left/right' : 'up/down'}, ${Math.round(Math.abs(along))} px ${g.dir === 'h' ? 'up/down' : 'left/right'}): ${what}. Center it in the gap, both ways.` });
    const ps = g.parts.map((p) => p.getBoundingClientRect()).sort((p, q) => (g.dir === 'h' ? p.left - q.left : p.top - q.top));
    for (let i = 1; i < ps.length; i++) {
      const gap = g.dir === 'h' ? ps[i].left - ps[i - 1].right : ps[i].top - ps[i - 1].bottom;
      if (gap > 4) { problems.push({ slide: n, issue: `The pieces of a connector don't touch (${Math.round(gap)} px apart): ${what}. Join the arrow head to its line.` }); break; }
    }
  }

  // One icon or marker per entry. An entry is a list item or the nearest component (card, row, chip).
  // Markers: a symbol glyph set as its own text (✓ • → ★ …), a ::before/::after with content or a drawn
  // shape, a list bullet, or a small SVG or image. The same marker twice in one entry fails.
  const markerOf = [];
  const symbolOnly = /^[\p{So}\p{Sm}•‣▪-◿←-⇿✓-✘★☆*+\-–—·]{1,2}$/u;
  const norm = (t) => (/[✓✔☑√]/.test(t) ? 'check mark' : `"${t}"`);
  const entryOf = (el) => el.closest('li') || comps.filter((c) => c !== slide && c.contains(el)).pop() || null;
  for (const el of [slide, ...els]) {
    if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) continue;
    const own = [...el.childNodes].filter((c) => c.nodeType === 3 && c.textContent.trim()).map((c) => c.textContent.trim()).join('');
    if (own && symbolOnly.test(own)) markerOf.push({ el, id: norm(own), how: 'text' });
    if (!(el instanceof SVGElement)) {
      for (const pseudo of ['::before', '::after']) {
        const ps = getComputedStyle(el, pseudo);
        if (ps.content === 'none' || ps.content === 'normal' || ps.display === 'none') continue;
        const txt = ps.content.replace(/^["']|["']$/g, '').trim();
        if (txt) markerOf.push({ el, id: norm(txt), how: pseudo });
        else if (parseFloat(ps.width) > 0 && parseFloat(ps.height) > 0 && (parseColor(ps.backgroundColor)?.a > 0 || ps.backgroundImage !== 'none' || parseFloat(ps.borderTopWidth) > 0))
          markerOf.push({ el, id: `drawn ${pseudo} shape`, how: pseudo });
      }
      const cs = getComputedStyle(el);
      if (cs.display === 'list-item' && cs.listStyleType !== 'none') markerOf.push({ el, id: `list bullet (${cs.listStyleType})`, how: 'bullet' });
    }
    if ((el instanceof SVGSVGElement || el instanceof HTMLImageElement) && el !== slide) {
      const r = el.getBoundingClientRect();
      if (r.width <= 64 && r.height <= 64 && !arrowParts.includes(el)) markerOf.push({ el, id: el instanceof HTMLImageElement ? `image ${el.getAttribute('src')}` : `icon ${el.innerHTML.replace(/\s+/g, '').slice(0, 200)}`, how: 'icon' });
    }
  }
  const byEntry = new Map();
  for (const m of markerOf) {
    const e = entryOf(m.el);
    if (!e) continue;
    if (!byEntry.has(e)) byEntry.set(e, []);
    byEntry.get(e).push(m);
  }
  for (const [e, ms] of byEntry) {
    const seen = new Map();
    for (const m of ms) seen.set(m.id, (seen.get(m.id) || 0) + 1);
    for (const [id, count] of seen) {
      if (count < 2) continue;
      const shown = id.startsWith('icon ') ? 'the same icon' : id;
      problems.push({ slide: n, issue: `One entry shows ${shown} ${count} times (${ms.filter((m) => m.id === id).map((m) => m.how).join(', ')}): ${label(e)}. Keep one icon or marker per entry.` });
    }
  }

  const outer = [...comps, ...imgs].filter((el, _, all) => !all.some((o) => o !== el && o.contains(el)));
  const coverage = outer.reduce((a, el) => { const r = el.getBoundingClientRect(); return a + r.width * r.height; }, 0) / zone;

  if (metaCount > 3) problems.push({ slide: n, issue: `${metaCount} small meta labels (under 24px); at most 3 per slide.` });

  // A large card should be filled top to bottom: its text, images and child components (plus 24 px
  // padding) must span at least 60% of its height. A tall card with a line of text at the top looks
  // unfinished. Text set to one side of a wide card is fine. Opening slides are exempt.
  for (const c of isOpening ? [] : comps) {
    const r = c.getBoundingClientRect();
    if (r.width * r.height < 90000 || r.height < 160) continue;
    if (getComputedStyle(c).borderTopStyle === 'dashed') continue; // screenshot placeholders are empty on purpose
    const inner = [...textRuns.filter((t) => c.contains(t.el)).map((t) => t.rect),
      ...[...c.querySelectorAll('*')].filter((e) => e instanceof HTMLImageElement || e instanceof SVGSVGElement || comps.includes(e)).map((e) => e.getBoundingClientRect())];
    if (!inner.length) continue;
    const bb = inner.reduce((a, b) => ({ left: Math.min(a.left, b.left), right: Math.max(a.right, b.right), top: Math.min(a.top, b.top), bottom: Math.max(a.bottom, b.bottom) }));
    const used = (Math.min(r.bottom, bb.bottom + 24) - Math.max(r.top, bb.top - 24)) / r.height;
    if (used < 0.6)
      problems.push({ slide: n, issue: `Card is mostly empty (content spans ${Math.round(used * 100)}% of its height, need 60%): ${label(c)}. Make the card shorter or its content larger; never stretch a card to fill space.` });
  }

  // Covers and statements carry the deck's biggest type (quality-spec.md, section 2).
  if (/cover|statement/i.test(pattern)) {
    const h = [...slide.querySelectorAll('h1')].filter(visible)[0];
    if (h && parseFloat(getComputedStyle(h).fontSize) < 96)
      problems.push({ slide: n, issue: `The ${/cover/i.test(pattern) ? 'cover title' : 'statement'} is ${parseFloat(getComputedStyle(h).fontSize)}px; use 96 to 160px.` });
  }
  // Empty bands: merge the vertical extents of components, images and readable text (24 px and up),
  // and find the largest empty band between them or below them. One caption at the bottom doesn't hide
  // an empty middle.
  const spans = [...comps, ...imgs].map((el) => el.getBoundingClientRect()).map((r) => [r.top, r.bottom]);
  for (const t of textRuns) if (t.size >= 24) spans.push([t.rect.top, t.rect.bottom]);
  const clipped = spans.map(([a, b]) => [Math.max(a, safe.top), Math.min(b, safe.bottom)]).filter(([a, b]) => b > a).sort((p, q) => p[0] - q[0]);
  let gapTop = safe.top, gapSize = 0, reach = null;
  for (const [a, b] of clipped) {
    if (reach !== null && a - reach > gapSize) { gapSize = a - reach; gapTop = reach; }
    reach = reach === null ? b : Math.max(reach, b);
  }
  if (reach !== null && safe.bottom - reach > gapSize) { gapSize = safe.bottom - reach; gapTop = reach; }
  const emptyBand = gapSize / (safe.bottom - safe.top);
  if (!isOpening && coverage < 0.12)
    problems.push({ slide: n, issue: `Reads as text on a page: filled or outlined components cover ${Math.round(coverage * 100)}% of the content area; need 12% or more (quality-spec.md, section 5a). Opening slides (pattern with cover, title, statement or section) are exempt.` });
  if (!isOpening && emptyBand > 0.22)
    problems.push({ slide: n, issue: `An empty band ${Math.round(gapSize)}px tall (${Math.round(emptyBand * 100)}% of the content area) from y=${Math.round(gapTop - s.top)}. Make the content larger, move it to use the space, or add a drawn element that carries content (quality-spec.md, section 4).` });
  const h1s = [...slide.querySelectorAll('h1')].filter(visible);
  if (h1s.length !== 1) warnings.push({ slide: n, issue: `Slide has ${h1s.length} <h1> elements; use one for the headline.` });
  const h = h1s[0] && h1s[0].getBoundingClientRect();
  return {
    problems,
    warnings,
    faces,
    sizes: textRuns.map((t) => t.size),
    headline: h && !isOpening ? { left: Math.round(h.left - s.left), top: Math.round(h.top - s.top) } : null,
    pattern,
  };
}

let browser;
try {
  browser = await puppeteer.launch({
  headless: true,
  executablePath,
  args: LAUNCH_ARGS,
  });
} catch (err) {
  console.error(`The browser could not start here: ${err.message.split('\n')[0]}`);
  console.error('Nothing in out/ was changed. If you are an agent in a sandbox, do not retry or work around this:');
  console.error('build with node tools/build-deck.mjs: it falls back to the build bridge outside the sandbox.');
  process.exit(5);
}
for (const f of fs.readdirSync(outDir)) if (f.endsWith('.png') || f.endsWith('.html')) fs.unlinkSync(path.join(outDir, f));
if (palette) fs.writeFileSync(snapPath, JSON.stringify({ margin: SAFE, palette }, null, 2));
const report = { slides: 0, problems: [...early.filter((e) => /not found/.test(e.issue))], warnings: early.filter((e) => !/not found/.test(e.issue)), patterns: [] };
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  // The deck must be self-contained: only files inside the deck folder load. Anything else is blocked and fails.
  const external = new Set();
  await restrictRequests(page, deckDir, external);
  await page.goto(fileUrl(htmlPath), { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);

  const count = await page.$$eval('.slide', (els) => els.length);
  report.slides = count;
  if (!count) report.problems.push({ slide: 0, issue: 'No elements with class "slide" found.' });

  const faces = [];
  const sizes = new Set();
  const heads = [];
  for (let i = 0; i < count; i++) {
    const r = await page.evaluate(checkSlide, { index: i, SAFE, palette, designText });
    report.problems.push(...r.problems);
    report.warnings.push(...r.warnings);
    faces.push(...r.faces);
    r.sizes.forEach((x) => sizes.add(Math.round(x)));
    if (r.headline) heads.push({ slide: i + 1, ...r.headline });
    report.patterns.push({ slide: i + 1, pattern: r.pattern });
  }

  // Every face used must be a real loaded font file, not one the browser fakes.
  const loaded = await page.evaluate(() =>
    [...document.fonts].filter((f) => f.status === 'loaded').map((f) => ({ family: f.family.replace(/["']/g, ''), weight: String(f.weight), style: f.style }))
  );
  const seen = new Set();
  for (const f of faces) {
    const key = `${f.family}|${f.weight}|${f.style}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const ok = loaded.some((l) => l.family === f.family && +l.weight === f.weight && l.style === f.style);
    if (!ok) report.problems.push({ slide: 0, issue: `Font "${f.family}" ${f.weight} ${f.style} isn't loaded from fonts/fonts.css; the browser would fake it and PowerPoint would substitute it.` });
  }
  if (sizes.size > 7) report.warnings.push({ slide: 0, issue: `${sizes.size} different text sizes (${[...sizes].sort((a, b) => b - a).join(', ')}); keep the scale to 7 or fewer.` });
  const spread = (k) => Math.max(...heads.map((h) => h[k])) - Math.min(...heads.map((h) => h[k]));
  if (heads.length > 1 && (spread('left') > 4 || spread('top') > 4))
    report.warnings.push({ slide: 0, issue: `Headlines move between content slides: ${heads.map((h) => `slide ${h.slide} at x${h.left} y${h.top}`).join('; ')}. Put them in one place.` });

  for (const u of external) report.problems.push({ slide: 0, issue: `Request blocked (only files inside the deck folder may load): ${u}` });

  const handles = await page.$$('.slide');
  for (let i = 0; i < handles.length; i++) {
    await handles[i].screenshot({ path: path.join(outDir, `${String(i + 1).padStart(2, '0')}.png`) });
  }

  // One sheet with every slide, to judge the deck as a whole.
  if (handles.length) {
    const cols = 3;
    const rows = Math.ceil(handles.length / cols);
    const imgs = handles.map((_, i) => `<img src="${String(i + 1).padStart(2, '0')}.png">`).join('');
    const sheet = path.join(outDir, 'sheet.html');
    fs.writeFileSync(sheet, `<!doctype html><style>body{margin:0;background:#808080;display:grid;grid-template-columns:repeat(${cols},640px);gap:16px;padding:16px;width:${cols * 640 + (cols + 1) * 16}px}img{width:640px;height:360px;display:block}</style>${imgs}`);
    const p2 = await browser.newPage();
    await restrictRequests(p2, deckDir, external);
    await p2.setViewport({ width: cols * 640 + (cols + 1) * 16, height: rows * 360 + (rows + 1) * 16, deviceScaleFactor: 1 });
    await p2.goto(fileUrl(sheet), { waitUntil: 'load' });
    await p2.screenshot({ path: path.join(outDir, 'all.png'), fullPage: true });
    fs.unlinkSync(sheet);
  }
} finally {
  await browser.close();
}

const dedupe = (list) => [...new Map(list.map((p) => [p.slide + '|' + p.issue, p])).values()];
report.problems = dedupe(report.problems);
report.warnings = dedupe(report.warnings);
fs.writeFileSync(path.join(deckDir, 'out', 'check-report.json'), JSON.stringify(report, null, 2));
console.log(`Browser: ${executablePath}`);
console.log(`Slides: ${report.slides}. Screenshots: out/html/NN.png and out/html/all.png. Margin checked: ${SAFE}px.`);
for (const p of report.problems) console.log(`PROBLEM  slide ${p.slide}: ${p.issue}`);
for (const w of report.warnings) console.log(`warning  slide ${w.slide}: ${w.issue}`);
console.log(report.problems.length ? `\n${report.problems.length} problem(s) to fix.` : '\nNo problems found.');
process.exit(report.problems.length ? 1 : 0);
