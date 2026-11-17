// Exports <deck>/deck.html to <deck>/out/deck.pptx with dom-to-pptx, inside the same guard as the check.
// Usage: node <kit>/tools/export.mjs <deck folder>   (build.mjs runs it from the kit folder)
//
// It replaces the dom-to-pptx-exporter command line, which had no request filter, turned off Chrome's
// own sandbox (--no-sandbox) and used a copy of the library from the page if the page defined one.
// Here: Chrome keeps its sandbox, the browser may load only files inside the deck folder (plus the
// data:image/ URLs the library makes from shapes, which carry their own bytes); any other request fails
// the export. The library is always the kit's own copy, injected from node_modules.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import { deckRoot, restrictRequests, fileUrl, findBrowser, LAUNCH_ARGS } from './guard.mjs';

const kit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const deckDir = deckRoot(process.argv[2]);
const html = path.join(deckDir, 'deck.html');
const out = path.join(deckDir, 'out', 'deck.pptx');
const bundle = path.join(kit, 'node_modules', 'dom-to-pptx', 'dist', 'dom-to-pptx.bundle.js');
if (!fs.existsSync(bundle)) {
  console.error(`dom-to-pptx bundle not found at ${bundle}. Run setup.ps1.`);
  process.exit(2);
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
  process.exit(5);
}

const blocked = new Set();
let buffer;
try {
  const page = await browser.newPage();
  await restrictRequests(page, deckDir, blocked, { inlineImages: true });   // the library's own data:image/ URLs
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(fileUrl(html), { waitUntil: 'networkidle0' });
  await page.addScriptTag({ content: fs.readFileSync(bundle, 'utf8') });
  const dataUrl = await page.evaluate(async () => {
    const lib = window.domToPptx;
    if (!lib || !lib.exportToPptx) throw new Error('dom-to-pptx did not load.');
    const slides = Array.from(document.querySelectorAll('.slide'));
    if (!slides.length) throw new Error('No elements with class "slide".');
    const blob = await lib.exportToPptx(slides, { title: 'Deck', width: 13.333, height: 7.5, includePseudoElements: true, skipDownload: true });
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  });
  buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
} catch (err) {
  console.error(`Export failed: ${err.message.split('\n')[0]}`);
  for (const u of blocked) console.log(`PROBLEM  export: request blocked (only files inside the deck folder may load): ${u}`);
  await browser.close();
  process.exit(1);
}
await browser.close();

if (blocked.size) {
  for (const u of blocked) console.log(`PROBLEM  export: request blocked (only files inside the deck folder may load): ${u}`);
  console.log('Export refused: the page asked for files outside the deck folder. out/deck.pptx was not written.');
  process.exit(1);
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, buffer);
console.log(`Export complete: out/deck.pptx (${Math.round(buffer.length / 1024)} KB)`);
