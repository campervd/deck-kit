// The agent's build command. Run it from the deck folder:
//   node tools/build-deck.mjs        (give the command a timeout of at least 300 seconds)
// It runs the kit's hardened build directly, in this process: working folder = the kit folder, the kit's
// own tools by absolute path, this deck folder as the argument (see the kit's tools/build.mjs). Full access
// is the expected setup for your agent: it can start Chrome, so this is all it needs.
// Only if the browser can't start here (inside a sandbox such as Codex's on Windows: "spawn EPERM") does it fall back
// to the build bridge, and only then does it print the one command that starts bridge.ps1.
// Writes out/build-log.txt and prints the result. Exit code: 0 passed; 3 no bridge answered; 4 refused;
// other: the failing step's code.
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { kitRoot, printSummary, requestBuild } from './request-build.mjs';

const deckDir = path.resolve(process.argv[2] || process.cwd());
const kit = kitRoot();
if (!kit) {
  console.log('PROBLEM  build: the kit folder was not found above this deck. Keep the deck in <kit>\\decks\\<name>.');
  process.exit(2);
}

const started = Date.now();
process.chdir(kit);
const { runBuild, openLog } = await import(pathToFileURL(path.join(kit, 'tools', 'build.mjs')).href);
const fd = openLog(deckDir);   // never writes the log through a link or junction
if (fd === null) process.exit(4);
let result;
try { result = runBuild(deckDir, { logFd: fd }); } finally { fs.closeSync(fd); }

if (result.browserBlocked) {
  console.log('The browser can\'t start here (a sandbox blocks it). Asking the build bridge to build outside the sandbox...');
  process.exit(await requestBuild(deckDir));
}
printSummary(deckDir, result.code, Math.round((Date.now() - started) / 1000));
process.exit(result.code);
