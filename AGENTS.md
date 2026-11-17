# Deck kit: instructions for the person's agent

This file is for an agent that helps a person make a presentation with this kit. If you are working inside `decks/<name>/`, stop reading here and follow `decks/<name>/AGENTS.md` instead.

## What the kit does

The person says what they want to talk about. Codex plans the slides, writes the words, and designs them as HTML, a real browser checks them and saves a PNG of every slide, `dom-to-pptx` turns them into an editable PowerPoint, and LibreOffice draws that PowerPoint back to PNGs for comparison. `run-deck.ps1` repeats build and review until the deck passes.

## The model: brief, structure, content, deck

```
brief  ->  structure  ->  content  ->  deck (one content file + one design)
```

| Piece | Where | What it is |
|---|---|---|
| Brief | `briefs/<brief>/<brief>-brief.md` | The person's notes on what to say. Images they already have go in `briefs/<brief>/assets/`. |
| Structure | `standards/structures/<name>.md` | A reusable talk structure: slide types, their order, rules. No words of any one talk. |
| Content | `content/<brief>/<name>-content.md` | Slide text and speaker notes for one brief in one structure. Its first lines name both: `Brief: …` and `Structure: …`. |
| Design | `designs/<look>/design.md` | A reusable look, named after how it looks. |
| Deck | `decks/<name>/` | One content file plus one design. Its `deck.json` names its brief, structure, content and design as paths in the kit, and lists under `"pending"` what is not saved yet. |

- One brief can have many content files, for example the same talk in two structures or lengths; they all live in `content/<brief>/`.
- A different brief always gets different content: a content file lives in the folder of the brief it names, and never serves another brief.
- Many decks can share one content file with different designs.

Use lowercase letters, digits and dashes for names. The `example-` prefix is reserved for the kit's examples (see `README.md`, "Examples").

## Make a new presentation from scratch

1. **Brief.** Save what they want to say as `briefs/<brief>/<brief>-brief.md`: their notes, the audience and the length (`briefs/README.md` says what to include). Keep their facts; don't add any. Show them the file and get their OK.
2. **Structure.** Pick the structure in `standards/structures/` that fits the talk (its README lists them) and name it with `-Structure <name>`, or leave `-Structure` out to let Codex pick one (`new-deck.ps1` then gives it the structures). If the brief asks for 6 to 8 slides, Codex uses the structure's short version.
3. **Design and images.** Ask whether they want a new look or a saved one from `designs/` (see `designs/README.md`). For a new look, ask for an optional direction in a few words. Ask whether they have a diagram made elsewhere or real screenshots. If so, put them in `briefs/<brief>/assets/` (`new-deck.ps1` picks that folder up) and say in the brief what each file shows.
4. **Create the deck folder.** From the brief, Codex writes the content in the structure:
   - New look: `powershell -ExecutionPolicy Bypass -File .\new-deck.ps1 -Name <name> -Brief <brief> -Structure <structure> -Direction "<words, or leave out>"`
   - Saved look: `powershell -ExecutionPolicy Bypass -File .\new-deck.ps1 -Name <name> -Brief <brief> -Structure <structure> -Design <look>`
   - From content that already exists (another design for the same content): `powershell -ExecutionPolicy Bypass -File .\new-deck.ps1 -Name <name> -Content <brief> -Design <look>` (or `-Content <brief>/<file>` when the brief has several content files).
5. **Build.** `powershell -ExecutionPolicy Bypass -File .\run-deck.ps1 -Deck <name>`
   - It must run in a normal terminal, because the browser cannot start inside an agent sandbox. If your own shell is sandboxed, give the person this command to run, and wait.
   - Each round runs Codex once, so a deck can take a long time. Wait for the script to exit.
6. **Report** from `decks/<name>/out/`: the first line of `status.md` (only the independent reviewer's pass sets `Status: done`), the reviewer's slide lines and rubric scores in the newest `review-N.md`, whether the last build passed (the script's summary), and the paths of `<name>-contact-sheet.png` (all slides, numbered), `html/`, `compare/all.png` and `deck.pptx`. Point the person to the contact sheet first.
7. **Not done after 6 builder sessions?** Rerun step 5. It continues where it stopped: a failed build gets a repair session, and a reviewer failure gets a fix session with `out/critique.md`.
8. **Keep what was made.** Save the content Codex wrote: `powershell -ExecutionPolicy Bypass -File .\save-content.ps1 -Deck <name>` (it goes to `content/<brief>/`, and `deck.json` then points at it and records its structure). If they like a new look, offer `powershell -ExecutionPolicy Bypass -File .\save-design.ps1 -Deck <name> -As <look-name>` (it also points `deck.json` at the saved design); name the look after how it looks (colors, type, mood), not after the talk.

## Polish a deck together (interactively)

After `run-deck.ps1`, or for any deck in `decks/`, the person can polish it with you, slide by slide.

1. **Work in `decks/<name>/`** and follow its `AGENTS.md`: the deck.html rules and `quality-spec.md` still apply. Change what the person asks for in `deck.html` (and `design.md` only for a real design change).
2. **Build** from inside `decks/<name>/` with `node tools/build-deck.mjs` (timeout at least 300 seconds). It runs the kit's build **directly**, with no setup step: if your agent can start Chrome or Edge (a normal shell, or your agent with full access), that is all. It prints PASSED or FAILED and every problem.
3. **Only if the browser can't start where you run** (Codex's Windows sandbox, "spawn EPERM"), the same command falls back to the build bridge. If no bridge is running, it prints one exact command for the person to run in a normal terminal and leave open: `powershell -ExecutionPolicy Bypass -File "<kit>\bridge.ps1"`. Give them that command, wait, and build again. You can't start the bridge from inside a sandbox.
4. **Look** at `out/<name>-contact-sheet.png`, the slides you changed in `out/html/NN.png` and `out/compare/NN.png`, and show them to the person. Repeat 1 to 4 until they are happy.
5. Optional: run `run-deck.ps1 -Deck <name>` once more for an independent review of the finished deck.

## Rules

- While `run-deck.ps1` runs, don't edit `deck.html`, `design.md` or anything in `out/`: Codex is working on them. When the person asks you to polish a deck, you may edit `deck.html` and `design.md` as above, but never `out/` (the build writes it).
- Don't edit the kit's `tools/`, `package.json` or `package-lock.json`. The build always runs the kit's own tools from the kit folder, never anything in a deck folder.
- Full access is the expected setup and builds run directly. Don't change your own sandbox settings. If a sandbox blocks the build, use bridge.ps1.
- Don't put one brief's content in another brief's folder, and don't reuse a content file for a different brief.
- Change a lane or flow diagram by editing its `diagrams/<name>.json`; the build computes its layout. Never edit the generated `diagrams/<name>.html`.
- If something fails, run `powershell -ExecutionPolicy Bypass -File .\doctor.ps1` and report its FAIL lines.

## First time on a PC

1. `powershell -ExecutionPolicy Bypass -File .\setup.ps1`, until it prints "Setup complete".
2. `powershell -ExecutionPolicy Bypass -File .\doctor.ps1`, until every line is PASS.
