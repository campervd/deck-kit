# Deck kit

Make an editable PowerPoint from the words of a talk. Codex designs and builds the slides. You check the quality from a PNG of every slide.

The kit is portable: unzip it anywhere and run the scripts from its folder. It has no fixed paths, and it changes nothing outside its folder except the fonts for your user account.

## What you need

Windows with PowerShell, plus Node.js, Python, LibreOffice, Chrome or Edge, and the Codex CLI. `setup.ps1` installs the npm and pip packages at fixed versions, and LibreOffice if it is missing.

## First time on a PC

1. Open PowerShell in the kit folder.
2. Run `powershell -ExecutionPolicy Bypass -File .\setup.ps1`. Repeat until it prints "Setup complete".
3. Run `powershell -ExecutionPolicy Bypass -File .\doctor.ps1`. Every line must be PASS. It starts Chrome and Edge headless to prove they work on this PC.

## Make a presentation

A presentation goes through four pieces:

```
brief  ->  structure  ->  content  ->  deck (one content file + one design)
```

- **Brief** (`briefs\<brief>\<brief>-brief.md`): your notes on what you want to say.
- **Structure** (`standards\structures\<name>.md`): a reusable talk shape: slide types, order and rules (see `standards\structures\README.md`).
- **Content** (`content\<brief>\<name>-content.md`): the slide text and speaker notes for one brief in one structure. Its first lines name both. One brief can have many content files; a different brief always gets different content.
- **Deck** (`decks\<name>\`): one content file plus one design (`designs\<look>\`). Its `deck.json` names all four as paths in the kit. While the content or a new design is still only in the deck folder, `deck.json` lists them under `"pending"`; `save-content.ps1` and `save-design.ps1` (step 6) save them and complete it.

1. Write your brief: `briefs\my-talk\my-talk-brief.md`, plain notes on what you want to talk about (see `briefs\README.md`). Have a diagram you made elsewhere, or real screenshots? Put them in `briefs\my-talk\assets\` and say in your notes what each one shows.
2. Create the deck: `powershell -ExecutionPolicy Bypass -File .\new-deck.ps1 -Name my-talk -Brief my-talk -Structure reflection-talk`. The agent writes the content in that structure, then designs and builds the slides.
   - Add `-Design <look>` to reuse a saved look (see `designs\README.md`), or `-Direction "a few words"` to steer a new look.
   - Already have finished slide text? Save it as `content\my-talk\my-talk-content.md` (see `content\README.md`) and use `-Content my-talk` instead of `-Brief`.
3. Run `powershell -ExecutionPolicy Bypass -File .\run-deck.ps1 -Deck my-talk`. Wait until it prints its summary. It runs Codex with `gpt-5.6-terra`; add `-Model <name>` for another model, or `-Model ''` for your Codex default.
4. Look at `decks\my-talk\out\my-talk-contact-sheet.png` (all slides, numbered), then `decks\my-talk\out\compare\all.png` (browser and PowerPoint side by side).
5. Open `decks\my-talk\out\deck.pptx`.
6. Keep what was made: `powershell -ExecutionPolicy Bypass -File .\save-content.ps1 -Deck my-talk` saves the content to `content\my-talk\` and records its structure; `powershell -ExecutionPolicy Bypass -File .\save-design.ps1 -Deck my-talk -As <look>` saves a new look to `designs\`. Both update the deck's `deck.json`. A deck made with `-Content` already has its content saved, so `save-content.ps1` refuses it.

If the summary says "Not done yet", run step 3 again. It continues where it stopped.

Want the same talk in another look? `new-deck.ps1 -Name my-talk-dark -Content my-talk -Design <another look>`: one content file, a second design.

## Polish a deck with your own agent

1. Point your agent at the kit folder: its `AGENTS.md` says how to polish a deck.
2. The agent edits `decks\my-talk\deck.html`, then builds from inside `decks\my-talk` with `node tools/build-deck.mjs`. The build runs directly, with no setup step, wherever Chrome or Edge can start.
3. Look at the new `decks\my-talk\out\my-talk-contact-sheet.png`, `out\html\*.png` and `out\compare\*.png` together, and repeat.

Only if the agent runs where the browser can't start (Codex's Windows sandbox) does the build fall back to the build bridge. Then it prints one exact command for you: run it in a normal terminal and leave it open (`powershell -ExecutionPolicy Bypass -File .\bridge.ps1`). It builds any deck in `decks\` on request until you close it.

Your agent can do these steps for you: point it at `AGENTS.md`.

## Examples

One finished example shows the whole flow. It has a brief, a structure, the content, a design and the deck source; build it (below) to get its slide PNGs, the .pptx and a numbered contact sheet, which the kit does not ship. Its folders and files start with `example-`, and its `deck.json` names its pieces.

| Deck | Brief | Structure | Content | Design |
|---|---|---|---|---|
| `example-kit-talk`: a 6-minute talk about this kit | `briefs\example-kit-talk\` | `tool-walkthrough` | `content\example-kit-talk\` (written by the agent from the brief, Step 0) | `navy-rust` |

See the example: build it with `node tools/build-deck.mjs` from inside `decks\example-kit-talk` (no Codex needed), then open `decks\example-kit-talk\out\example-kit-talk-contact-sheet.png`. Try the kit on it in another look: `powershell -ExecutionPolicy Bypass -File .\new-deck.ps1 -Name try-cobalt -Content example-kit-talk -Design cobalt-slate`, then `run-deck.ps1 -Deck try-cobalt`. One content file can have many designs this way.

## Folders

| Folder | What goes in it |
|---|---|
| `briefs\` | One subfolder per brief: `briefs\<brief>\<brief>-brief.md`, notes on what to say, and `briefs\<brief>\assets\` for images. |
| `content\` | One subfolder per brief: `content\<brief>\<name>-content.md`, slide words and speaker notes, each naming its brief and structure at the top. A brief can have several. |
| `designs\` | Reusable looks, one folder per look, named after how it looks: `designs\<look>\design.md`. Add your own with `save-design.ps1`. |
| `standards\` | The rules for every deck: `structures\` (reusable talk structures), quality spec, rubric, layout guide, design template, diagram checklist and specs, the deck agent's instructions, and `quality-bar\` (PNGs of the level of finish every deck must reach). |
| `prompts\` | The instruction text for Codex: start from a brief (`from-brief.txt`), a new design (`new-design.txt`) or a saved design (`use-design.txt`); a repair after a failed build (`repair.txt`); a fix after a failed review (`fix-critique.txt`); and the independent reviewer (`review.txt`). |
| `fonts\` | The 12 open-source font families decks may use (see `fonts\CATALOG.md`). |
| `tools\` | The build, in order: guard, diagram layout, diagrams (render and check), check (the slides), contact sheet, export, pptx check, PowerPoint render. Don't edit. |
| `tests\` | `hardening.ps1`, the build's safety tests, with their own small test deck in `tests\fixture\` (see "Test the kit"). |
| `decks\` | One self-contained folder per deck, `decks\<name>\`, created by `new-deck.ps1`: one content file plus one design, named in its `deck.json`. Its `out\<name>-contact-sheet.png` shows every slide, numbered. |

## How it stays reliable

- **One build command, direct first.** An agent builds with `node tools/build-deck.mjs`, which runs the hardened build directly, in its own process. Inside Codex's Windows sandbox the browser can't start (the sandbox blocks the pipes Node uses), so only there the same command falls back to the **build bridge**: it writes a request file in `out\bridge\`, and `run-deck.ps1` (while it runs) or `bridge.ps1` builds the deck outside the sandbox in about 15 seconds. A request carries no commands. Both paths run the same code.
- **Full access is the expected setup and builds run directly.** Don't change your agent's sandbox settings. If a sandbox blocks the build, use `bridge.ps1`. (`run-deck.ps1` itself runs its Codex builder in the workspace-write sandbox, which can only write inside the deck's folder, and serves its builds through its own bridge.)
- **Nothing in a deck folder is run by the build.** The build is the kit's own `tools\build.mjs`, run with absolute paths from the kit folder, with the deck folder as an argument. It never runs npm in a deck folder (npm would read a deck `.npmrc`) and never starts the browser there (Puppeteer would load a deck `.puppeteerrc.cjs`). Python runs isolated (`python -I`) with the kit's own pinned packages in `pylib\`. Codex is started by absolute path from the kit folder too.
- **The build stays inside the deck folder.** Before it opens anything it refuses a deck folder, `deck.html` or output folder that is a link or junction. In the check, diagram and export steps the browser may load only files whose real path is inside the deck folder; any other request (another drive, `C:\Windows\...`, the network) is blocked and fails the build. The export step also allows the `data:image/...` URLs the PowerPoint library makes from shapes, which carry their own bytes. Chrome keeps its own sandbox on.
- **The .pptx is checked before anyone opens it**: valid zip and XML, a content type for every part, every internal relationship target present and no external ones, valid slide ids, and every typeface on the slides embedded in each style used. LibreOffice ignores embedded fonts, so its render can't show a missing one.
- **An independent reviewer decides when a deck is done.** After each passing build, `run-deck.ps1` starts a separate, read-only Codex session and attaches every slide PNG, the PowerPoint comparison, the diagrams and the quality bar, so the review is made from the images. It writes one line per slide and a verdict to `out\review-N.md`. Only a PASS sets `Status: done`; a FAIL goes back to the builder as `out\critique.md`. (Tests showed the builder never opened an image on its own and graded its own work too kindly.)
- **A fixed quality bar.** Every deck is compared with `standards\quality-bar\all.png`. The check fails any content slide that is only text on a page, and the rubric scores finish against the bar.
- **Complex diagrams are built on their own first, with positions computed in code.** Codex writes what to draw as `diagrams\<name>.json` (`standards\diagram-specs.md`); `tools\diagram_layout.mjs` computes every position on a grid (a wide, short band of about 2.4:1, equal slices, centered handoffs with equal lines above and below) and writes the HTML. The build renders a sharp PNG and checks its geometry: off-center handoffs or labels, unequal lines around a handoff, and boxes without labels fail, and so does a diagram image that overlaps anything else on its slide. The reviewer then checks each diagram at full size against `standards\diagram-checklist.md`. In PowerPoint such a diagram is a picture; its source stays in `diagrams\`.
- **Connectors and markers are measured on every slide.** An arrow or connector off-center between the two elements it joins fails the check, and so does an arrow whose head doesn't touch its line, and an entry (a card, a row, a list item) that shows the same icon or marker twice.
- **Every round leaves PNGs.** `out\<name>-contact-sheet.png` shows every slide in order, numbered. `out\html\` holds the browser's slides, and `out\compare\` holds the PowerPoint render next to them.

## Test the kit

`tests\hardening.ps1` proves that the build's safety rules hold on this PC. Run it after `doctor.ps1` passes, and again after any change to `tools\`.

1. Open PowerShell in the kit folder, in a normal terminal (not inside an agent's sandbox).
2. Run `powershell -ExecutionPolicy Bypass -File .\tests\hardening.ps1`.
3. Wait until it prints "N of 6 tests passed". Every line must be PASS.

It builds the kit's own small test deck (`tests\fixture\`) six ways: through the bridge, directly, with a planted `.puppeteerrc.cjs` that must never run, with a request for `C:\Windows\win.ini` that must be blocked, with a broken .pptx whose missing fonts must be caught, and as a junction that must be refused. It works in `decks\zz-hardening-*` and removes those folders when it finishes. It needs no example deck.

## If something fails

Run `doctor.ps1` and read its FAIL lines.

- **A browser is installed but does not start headless:** A policy set by the PC's administrator can block this. doctor lists any browser policies named for headless mode or remote debugging. Ask the administrator to allow headless use for that browser.
- **The build uses Chrome whenever Chrome is installed, else Edge.** If Chrome fails but Edge passes, set the environment variable `BROWSER_PATH` to Edge's `msedge.exe`, or ask the administrator to allow headless Chrome.
- **setup.ps1 says a font is in use:** close PowerPoint and LibreOffice, then run it again.

## License

The kit is under the MIT License (`LICENSE`). The fonts in `fonts\` are under the SIL Open Font License 1.1; each family's license file is next to its fonts. `setup.ps1` installs the other dependencies under their own licenses: dom-to-pptx (MIT), puppeteer (Apache 2.0), pillow (HPND) and pypdfium2 (Apache 2.0 or BSD 3-clause).
