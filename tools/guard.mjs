// Shared safety rules for building a deck that an agent wrote. Used by build.mjs, check.mjs, diagrams.mjs
// and export.mjs. The build may run outside the agent's sandbox, so the deck is treated as untrusted input:
//  - the deck folder, deck.html and the folders the build writes to must not be links or junctions;
//  - the browser may load only files whose real path is inside the deck folder.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const lower = (p) => (process.platform === 'win32' ? p.toLowerCase() : p);

// Resolves the deck folder to its real path, and refuses links and junctions on the paths the build uses.
export function deckRoot(arg) {
  if (!arg) throw new Error('Give the deck folder as the first argument.');
  const dir = path.resolve(arg);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new Error(`Not a folder: ${dir}`);
  return dir;
}

export function linkProblems(dir) {
  const problems = [];
  const isLink = (p) => {
    try { return fs.lstatSync(p).isSymbolicLink(); } catch { return false; }   // Node reports junctions as links too
  };
  for (const rel of ['', 'deck.html', 'out', 'out/bridge', 'out/html', 'out/diagrams', 'out/compare', 'out/pptx', 'out/deck.pptx', 'diagrams', 'fonts', 'assets']) {
    const p = path.join(dir, rel);
    if (isLink(p)) problems.push(`${rel || 'the deck folder'} is a link or junction`);
  }
  try {
    if (lower(fs.realpathSync.native(dir)) !== lower(dir)) problems.push('the deck folder path goes through a link or junction');
  } catch (e) { problems.push(`the deck folder can't be resolved: ${e.message}`); }
  return problems;
}

// Everything to check before a build: no links or junctions on the deck's paths or its diagrams,
// and a deck.html to build.
export function preflight(dir) {
  const problems = linkProblems(dir);
  if (!fs.existsSync(path.join(dir, 'deck.html'))) problems.push('deck.html not found');
  const dd = path.join(dir, 'diagrams');
  if (fs.existsSync(dd)) {
    for (const f of fs.readdirSync(dd).filter((f) => f.endsWith('.html'))) {
      if (fs.lstatSync(path.join(dd, f)).isSymbolicLink()) problems.push(`diagrams/${f} is a link`);
    }
  }
  return problems;
}

// Allows only requests for files whose real path is inside the deck folder. Everything else is blocked
// and recorded in `blocked`; the caller must fail if `blocked` isn't empty.
// `inlineImages` (export only): dom-to-pptx turns shapes into data:image/... URLs while it exports.
// A data: URL carries its own bytes, so it can't read a file or reach the network; nothing else is allowed.
export async function restrictRequests(page, dir, blocked, { inlineImages = false } = {}) {
  const root = lower(fs.realpathSync.native(dir)) + path.sep;
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    let ok = false;
    if (inlineImages && /^data:image\/(png|jpeg|gif|webp|svg\+xml)[;,]/i.test(url)) return req.continue();
    if (url.startsWith('file:')) {
      try {
        const real = lower(fs.realpathSync.native(fileURLToPath(url)));
        ok = real.startsWith(root) && fs.statSync(real).isFile();
      } catch { ok = false; }
    }
    if (ok) return req.continue();
    blocked.add(url.length > 200 ? url.slice(0, 200) + '...' : url);
    return req.abort();
  });
}

export function fileUrl(p) {
  return new URL(`file:///${path.resolve(p).replace(/\\/g, '/').replace(/^\/+/, '')}`).href;
}

export function findBrowser() {
  if (process.env.BROWSER_PATH && fs.existsSync(process.env.BROWSER_PATH)) return process.env.BROWSER_PATH;
  const candidates = {
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ],
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'],
    linux: ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
  }[process.platform] || [];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

// Launch arguments shared by every browser the build starts. File access is needed for the deck's own
// fonts and images; restrictRequests() keeps it inside the deck folder.
export const LAUNCH_ARGS = ['--allow-file-access-from-files', '--force-device-scale-factor=1', '--hide-scrollbars'];
