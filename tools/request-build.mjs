// Asks the build bridge (run-deck.ps1 or bridge.ps1, running outside the agent's sandbox) to build a
// deck with the kit's tools, waits for it, and prints the result. tools/build-deck.mjs calls this only when
// the browser can't start where the agent runs; you can also run it yourself from the deck folder:
//   node tools/request-build.mjs        (give the command a timeout of at least 300 seconds)
// Exit code: the build's exit code; 3 if no bridge answered; 4 if the bridge refused the deck.
// The request carries no commands: the bridge only ever runs the kit's fixed build.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

// The kit folder is the nearest folder above this script that has bridge.ps1 and tools/build.mjs.
export function kitRoot() {
  let d = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(d, 'bridge.ps1')) && fs.existsSync(path.join(d, 'tools', 'build.mjs'))) return d;
    d = path.dirname(d);
  }
  return null;
}

export function bridgeCommand() {
  const kit = kitRoot();
  return `powershell -ExecutionPolicy Bypass -File "${kit ? path.join(kit, 'bridge.ps1') : '<kit folder>\\bridge.ps1'}"`;
}

// Prints the result of a build from <deck>/out/build-log.txt.
export function printSummary(deckDir, code, seconds) {
  const logPath = path.join(deckDir, 'out', 'build-log.txt');
  const log = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
  const lines = log.split(/\r?\n/);
  const problems = lines.filter((l) => /^PROBLEM/.test(l));
  const warnings = lines.filter((l) => /^warning/.test(l));
  const diffs = lines.filter((l) => /difference .*check this slide/.test(l));
  const stopped = lines.filter((l) => /^Build stopped|^Build refused/.test(l));
  console.log(`Build ${code === 0 ? 'PASSED' : 'FAILED'} in ${seconds}s. ${problems.length} problem(s), ${warnings.length} warning(s).`);
  for (const l of [...problems, ...warnings, ...diffs, ...stopped].slice(0, 80)) console.log(l);
  console.log('Full log: out/build-log.txt. New images: out/html/, out/diagrams/, out/compare/ (if the build got that far).');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Asks the bridge to build deckDir; returns the exit code (3 when no bridge answered).
export async function requestBuild(deckDir) {
  const dir = path.join(deckDir, 'out', 'bridge');
  fs.mkdirSync(dir, { recursive: true });
  // If an earlier request timed out while building, wait for that one instead of asking again.
  const pendingFile = path.join(dir, 'pending.txt');
  const pending = fs.existsSync(pendingFile) ? fs.readFileSync(pendingFile, 'utf8').trim() : '';
  try { fs.unlinkSync(pendingFile); } catch {}
  const id = pending || `${Date.now()}`;
  const req = path.join(dir, `request-${id}.json`);
  const res = path.join(dir, `result-${id}.json`);
  if (!pending) fs.writeFileSync(req, JSON.stringify({ id, requested: new Date().toISOString() }));
  console.log(pending ? `Still waiting for build ${id}...` : `Build requested (${id}). Waiting for the build bridge...`);

  const started = Date.now();
  const LIMIT = 280_000;
  let picked = !!pending;
  while (Date.now() - started < LIMIT) {
    if (fs.existsSync(res)) {
      const r = JSON.parse(fs.readFileSync(res, 'utf8'));
      if (r.refused) {
        console.log(`The bridge refused to build this deck: ${r.refused}`);
        return 4;
      }
      printSummary(deckDir, r.exit, r.seconds);
      return r.exit;
    }
    if (!picked && !fs.existsSync(req)) {
      picked = true;
      console.log('The bridge picked up the request and is building...');
    }
    if (!picked && Date.now() - started > 20_000) {
      try { fs.unlinkSync(req); } catch {}
      console.log('No build bridge answered. Ask the person to run this one command in a normal terminal (not in a sandbox) and leave it open:');
      console.log(`  ${bridgeCommand()}`);
      console.log('Then build again. If they can\'t, write out/status.md as AGENTS.md says and stop.');
      return 3;
    }
    await sleep(1000);
  }
  console.log(`The build is still running after ${LIMIT / 1000}s. Build again to keep waiting for request ${id}.`);
  fs.writeFileSync(pendingFile, id);
  return 3;
}

// As a command, from the deck folder.
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href.toLowerCase() === import.meta.url.toLowerCase()) {
  process.exit(await requestBuild(process.cwd()));
}
