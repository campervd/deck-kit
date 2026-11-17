// Builds one deck. As a command: node <kit>/tools/build.mjs <deck folder>
// As a module: import { runBuild } from '<kit>/tools/build.mjs' (tools/build-deck.mjs does this).
//
// It never runs npm, and never runs anything from the deck folder: npm would read a .npmrc there, and
// Puppeteer loads a .puppeteerrc.cjs from its working folder. Every step is the kit's own script, by
// absolute path, run with the kit folder as working folder and the deck folder as an argument:
//   0. guard: the deck folder, deck.html and the output folders must not be links or junctions
//   1. diagram_layout.mjs  compute every diagrams/*.json spec into diagrams/<name>.html (positions in code)
//      diagrams.mjs   render and check diagrams/*.html, including their geometry
//   2. check.mjs      check every slide in the browser, save out/html PNGs
//      contact_sheet.py  all slides in order, numbered: out/<deck folder name>-contact-sheet.png (python -I)
//   3. export.mjs     write out/deck.pptx
//   4. check_pptx.py  the .pptx structure and embedded fonts (python -I)
//   5. render_pptx.py LibreOffice render and browser-vs-PowerPoint comparison (python -I)
// The browser steps load only files inside the deck folder (guard.mjs). Stops at the first step that fails.
import fs from 'fs';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { deckRoot, preflight } from './guard.mjs';

const tools = path.dirname(fileURLToPath(import.meta.url));
export const KIT = path.resolve(tools, '..');

// Runs the build. `logFd` (optional) is an open file the steps write to; without it they write to this
// process's console. A file handle, not a pipe, so it also works where pipes are blocked.
// Returns { code, browserBlocked }: code 0 passed, 4 refused before anything ran, 5 the browser could not
// start (browserBlocked is then true: the caller may fall back to the build bridge), other: a step failed.
export function runBuild(deckArg, { logFd = null } = {}) {
  const say = (s) => (logFd === null ? console.log(s) : fs.writeSync(logFd, s + '\n'));
  let deckDir;
  try { deckDir = deckRoot(deckArg); } catch (e) { say(`PROBLEM  build: ${e.message}`); return { code: 2, browserBlocked: false }; }

  const refused = preflight(deckDir);
  if (refused.length) {
    for (const p of refused) say(`PROBLEM  build refused: ${p}`);
    say('\nBuild refused: nothing was run.');
    return { code: 4, browserBlocked: false };
  }

  const pptx = path.join(deckDir, 'out', 'deck.pptx');
  const steps = [
    ['diagram layout', process.execPath, [path.join(tools, 'diagram_layout.mjs'), deckDir]],
    ['diagrams', process.execPath, [path.join(tools, 'diagrams.mjs'), deckDir]],
    ['check', process.execPath, [path.join(tools, 'check.mjs'), deckDir]],
    ['contact sheet', 'python', ['-I', path.join(tools, 'contact_sheet.py'), deckDir]],
    ['export', process.execPath, [path.join(tools, 'export.mjs'), deckDir]],
    ['pptx check', 'python', ['-I', path.join(tools, 'check_pptx.py'), pptx]],
    ['render', 'python', ['-I', path.join(tools, 'render_pptx.py'), pptx]],
  ];
  const stdio = logFd === null ? 'inherit' : ['ignore', logFd, logFd];
  for (const [name, exe, args] of steps) {
    say(`\n> ${name}`);
    const r = spawnSync(exe, args, { cwd: KIT, stdio, windowsHide: true });
    if (r.error) {
      say(`PROBLEM  build: ${name} could not start: ${r.error.message}`);
      return { code: r.error.code === 'EPERM' ? 5 : 2, browserBlocked: r.error.code === 'EPERM' };
    }
    if (r.status !== 0) {
      say(`\nBuild stopped at step "${name}" (exit ${r.status}).`);
      return { code: r.status || 1, browserBlocked: r.status === 5 };
    }
  }
  say('\nBuild passed.');
  return { code: 0, browserBlocked: false };
}

// Opens <deck>/out/build-log.txt for writing (UTF-8), refusing to write through a link or junction.
// Returns the file descriptor, or null with the reason printed.
export function openLog(deckArg) {
  const deckDir = path.resolve(deckArg);
  for (const rel of ['', 'out', 'out/build-log.txt']) {
    try {
      if (fs.lstatSync(path.join(deckDir, rel)).isSymbolicLink()) {
        console.log(`PROBLEM  build refused: ${rel || 'the deck folder'} is a link or junction`);
        return null;
      }
    } catch {}
  }
  fs.mkdirSync(path.join(deckDir, 'out'), { recursive: true });
  return fs.openSync(path.join(deckDir, 'out', 'build-log.txt'), 'w');
}

// As a command (bridge-lib.ps1 runs it this way, from the kit folder). With --log the build writes
// <deck>/out/build-log.txt itself, in UTF-8, the same way build-deck.mjs does.
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href.toLowerCase() === import.meta.url.toLowerCase()) {
  process.chdir(KIT);
  if (process.argv.includes('--log')) {
    const fd = openLog(process.argv[2]);
    if (fd === null) process.exit(4);
    let code;
    try { code = runBuild(process.argv[2], { logFd: fd }).code; } finally { fs.closeSync(fd); }
    process.exit(code);
  }
  process.exit(runBuild(process.argv[2]).code);
}
