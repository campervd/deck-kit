// Renders each complex diagram, built on its own as diagrams/<name>.html, to diagrams/<name>.png at 2x,
// and checks it. deck.html then places the PNG: <img src="diagrams/<name>.png" style="width:Wpx;height:Hpx">.
// Usage: node <kit>/tools/diagrams.mjs <deck folder>   (build.mjs runs it first, from the kit folder)
//
// A diagram file links ../fonts/fonts.css, uses only design.md's colors and fonts, and has one root
// element <div class="diagram" style="width:Wpx;height:Hpx"> sized exactly as it will appear on the slide.
// It writes out/diagrams/<name>.png (a copy, for review) and out/diagrams/report.json.
// The browser may load only files inside the deck folder (guard.mjs); any other request is a problem.
// Exit code 1 means problems to fix. Exit code 5 means the browser could not start; nothing was changed.
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { deckRoot, restrictRequests, fileUrl, findBrowser, LAUNCH_ARGS } from './guard.mjs';

const deckDir = deckRoot(process.argv[2]);
const dir = path.join(deckDir, 'diagrams');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.html')).sort() : [];
if (!files.length) {
  console.log('No diagrams/*.html: nothing to render.');
  process.exit(0);
}

const executablePath = findBrowser();
if (!executablePath) {
  console.error('No Chrome or Edge found. Install one, or set BROWSER_PATH to its .exe.');
  process.exit(2);
}

let browser;
try {
  browser = await puppeteer.launch({ executablePath, headless: true, args: LAUNCH_ARGS });
} catch (err) {
  console.error(`The browser could not start here: ${err.message.split('\n')[0]}`);
  console.error('Nothing was changed. If you are an agent in a sandbox, do not retry or work around this:');
  console.error('build with node tools/build-deck.mjs: it falls back to the build bridge outside the sandbox.');
  process.exit(5);
}

// Runs inside the page: the same text rules as the slides, applied to the diagram.
function checkDiagram() {
  const problems = [];
  const root = document.querySelector('.diagram');
  if (!root) return { problems: ['No element with class "diagram".'] };
  const rr = root.getBoundingClientRect();
  const label = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''} "${(el.innerText || '').trim().slice(0, 40)}"`;
  const visible = (el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  const isBox = (el) => { const cs = getComputedStyle(el); const bg = cs.backgroundColor; return (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) || parseFloat(cs.borderTopWidth) > 0; };
  const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  if (root.scrollWidth > root.clientWidth + 1 || root.scrollHeight > root.clientHeight + 1) problems.push('Content overflows the diagram.');
  const runs = [];
  for (const el of [root, ...root.querySelectorAll('*')].filter(visible)) {
    if (el instanceof SVGElement) {
      if (el instanceof SVGTextElement) problems.push(`Text inside SVG; put labels in HTML elements: ${label(el)}`);
      continue;
    }
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.left < rr.left - 1 || r.right > rr.right + 1 || r.top < rr.top - 1 || r.bottom > rr.bottom + 1) problems.push(`Outside the diagram's box: ${label(el)}`);
    if (el.scrollHeight > el.clientHeight + parseFloat(cs.fontSize) * 0.3 || el.scrollWidth > el.clientWidth + 2) problems.push(`Content overflows its box: ${label(el)}`);
    const own = [...el.childNodes].filter((c) => c.nodeType === 3 && c.textContent.trim());
    if (!own.length) continue;
    const size = parseFloat(cs.fontSize);
    if (size < 20) problems.push(`Text under 20px (${size}px): ${label(el)}`);
    else if (size < 24 && !el.closest('[data-role="meta"]')) problems.push(`Readable text under 24px (${size}px): ${label(el)}`);
    for (const node of own) {
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const t of range.getClientRects()) if (t.width > 0 && t.height > 0) runs.push({ el, rect: t });
    }
    // Text inside a box keeps 8 px from the box's edge.
    const host = [el, ...ancestors(el)].find((a) => a !== root && isBox(a));
    if (host) {
      const h = host.getBoundingClientRect();
      for (const node of own) {
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const t of range.getClientRects()) {
          const gap = Math.min(t.left - h.left, h.right - t.right, t.top - h.top, h.bottom - t.bottom);
          if (t.width > 0 && gap < 8) { problems.push(`Text sits ${Math.max(0, Math.round(gap))}px from the edge of its box: ${label(el)}`); break; }
        }
      }
    }
  }
  for (let i = 0; i < runs.length; i++)
    for (let j = i + 1; j < runs.length; j++)
      if (runs[i].el !== runs[j].el && inter(runs[i].rect, runs[j].rect) > 4) problems.push(`Text overlaps: ${label(runs[i].el)} and ${label(runs[j].el)}`);

  // --- Geometry (quality-spec.md 6a): measured, so it doesn't depend on how the diagram was made.
  const all = [...root.querySelectorAll('*')].filter(visible).filter((e) => !(e instanceof SVGElement) || e instanceof SVGSVGElement);
  const rect = (e) => e.getBoundingClientRect();
  const cx = (r) => (r.left + r.right) / 2;
  const role = (e) => e.getAttribute('data-role') || '';
  const ownText = (e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const contains = (a, b, tol = 1) => b.left >= a.left - tol && b.right <= a.right + tol && b.top >= a.top - tol && b.bottom <= a.bottom + tol;
  // A box without a label: a filled or outlined box at least 48 x 32 px with no text anywhere in its area.
  for (const e of all) {
    if (e === root || ['segment', 'arrow', 'slice'].includes(role(e)) || e instanceof SVGSVGElement || !isBox(e)) continue;
    const r = rect(e);
    if (r.width < 48 || r.height < 32) continue;
    if (e.querySelector('img,svg')) continue;
    const hasText = runs.some((t) => cx(t.rect) >= r.left && cx(t.rect) <= r.right && (t.rect.top + t.rect.bottom) / 2 >= r.top && (t.rect.top + t.rect.bottom) / 2 <= r.bottom);
    if (!hasText) problems.push(`Box without a label (${Math.round(r.width)} x ${Math.round(r.height)} px at x ${Math.round(r.left - rr.left)}, y ${Math.round(r.top - rr.top)}): every box says what it is.`);
  }
  // The slice a mark belongs to: the data-role="slice" with its data-col, or the smallest box around it.
  const sliceOf = (e) => {
    const col = e.getAttribute('data-col');
    if (col !== null) { const s = root.querySelector(`[data-role="slice"][data-col="${col}"]`); if (s) return s; }
    const r = rect(e);
    return all.filter((o) => o !== e && o !== root && isBox(o) && contains(rect(o), r) && rect(o).width > r.width * 1.5)
      .sort((a, b) => rect(a).width * rect(a).height - rect(b).width * rect(b).height)[0] || null;
  };
  const handoffs = all.filter((e) => role(e) === 'handoff' || (ownText(e) && /^\s*hand-?off\s*$/i.test(e.textContent)));
  for (const h of handoffs) {
    const hr = rect(h), hx = cx(hr);
    const s = sliceOf(h);
    if (s && Math.abs(hx - cx(rect(s))) > 1.5) problems.push(`Handoff off-center in its slice by ${Math.round(hx - cx(rect(s)))} px: center it.`);
    // The line above and the line below the handoff, in its column.
    const lines = all.filter((o) => o !== h && (role(o) === 'segment' || (o instanceof SVGSVGElement && rect(o).width <= 40) || (!ownText(o) && rect(o).width <= 8 && rect(o).height >= 8)))
      .filter((o) => Math.abs(cx(rect(o)) - hx) <= 4);
    const above = lines.filter((o) => rect(o).bottom <= hr.top + 2).sort((a, b) => rect(b).bottom - rect(a).bottom)[0];
    const below = lines.filter((o) => rect(o).top >= hr.bottom - 2).sort((a, b) => rect(a).top - rect(b).top)[0];
    if (!above || !below) problems.push(`Handoff has a line ${above ? 'above but not below' : below ? 'below but not above' : 'neither above nor below'}: draw equal lines on both sides.`);
    else {
      const a = rect(above).height, b = rect(below).height;
      if (Math.abs(a - b) > 2) problems.push(`Unequal lines around a handoff: ${Math.round(a)} px above, ${Math.round(b)} px below. Center the handoff between the boxes.`);
      for (const [o, where] of [[above, 'above'], [below, 'below']]) if (Math.abs(cx(rect(o)) - hx) > 1.5) problems.push(`The line ${where} a handoff is off its center by ${Math.round(cx(rect(o)) - hx)} px.`);
    }
  }
  // Slice labels are centered in their slice.
  for (const l of all.filter((e) => role(e) === 'label' && e.getAttribute('data-col') !== null)) {
    const s = sliceOf(l);
    if (s && Math.abs(cx(rect(l)) - cx(rect(s))) > 1.5) problems.push(`Label "${l.innerText.trim().slice(0, 30)}" off-center in its slice by ${Math.round(cx(rect(l)) - cx(rect(s)))} px.`);
  }
  return { problems: [...new Set(problems)], width: Math.round(rr.width), height: Math.round(rr.height), text: root.innerText || '' };
  function ancestors(el) { const a = []; for (let p = el.parentElement; p && p !== root.parentElement; p = p.parentElement) a.push(p); return a; }
}

// Diagram words come from the content (quality-spec.md, section 8): every word of 3 or more letters, and every
// number (except zero-padded step numbers such as 01), in a diagram must appear in content.md. A plural or singular form counts, and so does the same word
// written as two words or with a hyphen ("handoff" = "hand off" = "hand-off"). Before content.md exists (a deck
// that starts from a brief, before Step 0), there is nothing to compare with, so the check is skipped.
const contentPath = path.join(deckDir, 'content.md');
const contentWords = (() => {
  if (!fs.existsSync(contentPath)) return null;
  const words = fs.readFileSync(contentPath, 'utf8').toLowerCase().replace(/[’']/g, '').match(/[\p{L}\p{N}]+/gu) || [];
  const set = new Set(words);
  for (let i = 0; i + 1 < words.length; i++) set.add(words[i] + words[i + 1]);
  return set;
})();
const SMALL = new Set(['and', 'the', 'for', 'with', 'from', 'into', 'onto', 'per', 'via', 'its', 'our', 'your', 'not', 'but', 'then', 'than', 'each', 'one', 'all', 'any']);
function missingWords(text) {
  if (!contentWords) return [];
  const known = (w) => contentWords.has(w) || contentWords.has(w.replace(/(es|s)$/, '')) || contentWords.has(w + 's') || contentWords.has(w + 'es');
  const words = (text.toLowerCase().replace(/[’']/g, '').match(/[\p{L}\p{N}]+/gu) || [])
    // Zero-padded index numbers (01, 02 ...) number steps in the layout; they are not facts.
    .filter((w) => (/^\p{N}+$/u.test(w) || w.length >= 3) && !SMALL.has(w) && !/^0\d$/.test(w));
  return [...new Set(words.filter((w) => !known(w)))];
}

const outDir = path.join(deckDir, 'out', 'diagrams');
fs.mkdirSync(outDir, { recursive: true });
const report = [];
let total = 0;
const blocked = new Set();
const page = await browser.newPage();
await restrictRequests(page, deckDir, blocked);
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
for (const f of files) {
  const name = f.replace(/\.html$/, '');
  await page.goto(fileUrl(path.join(dir, f)), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const r = await page.evaluate(checkDiagram);
  const missing = missingWords(r.text || '');
  if (missing.length) r.problems.push(`Words not in content.md: ${missing.join(', ')}. A diagram uses only the content's words; change the label, or the content if the person agrees.`);
  delete r.text;
  const el = await page.$('.diagram');
  if (el) {
    await el.screenshot({ path: path.join(dir, `${name}.png`), omitBackground: true });
    fs.copyFileSync(path.join(dir, `${name}.png`), path.join(outDir, `${name}.png`));
  }
  report.push({ diagram: name, ...r });
  total += r.problems.length;
  console.log(`Diagram ${name}: ${r.width || '?'} x ${r.height || '?'} px -> diagrams/${name}.png (2x)`);
  for (const p of r.problems) console.log(`PROBLEM  diagram ${name}: ${p}`);
}
await browser.close();
for (const u of blocked) {
  console.log(`PROBLEM  diagrams: request blocked (only files inside the deck folder may load): ${u}`);
  total++;
}
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
if (total) {
  console.log(`\n${total} diagram problem(s) to fix.`);
  process.exit(1);
}
console.log('Diagrams OK.');
