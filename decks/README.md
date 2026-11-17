# Decks

`new-deck.ps1` creates one folder here per deck, `decks\<name>\`. A deck is one content file plus one design, and its `deck.json` names its brief, structure, content and design. Several decks can share one content file in different designs. Each folder is self-contained: you can zip one deck folder and send it on its own. Files inside keep the names below, because the build looks for them; the `example-*` folders are the kit's examples.

Inside a deck folder:

| File | What it is |
|---|---|
| `out/<name>-contact-sheet.png` | Every slide in order, numbered, on one sheet. Look at this first. |
| `deck.json` | What the deck is made of: `brief`, `structure`, `content` and `design`, each a path in the kit (`structure` can also be `"none"`, or `null` while the agent still picks one). `"pending"` lists what is still only in this folder: `content` and `structure` (saved by `save-content.ps1`) and `design` (saved by `save-design.ps1`). |
| `structures/` | Only for a deck started from a brief with no `-Structure`: the kit's structures, for the agent to pick from. |
| `diagram-reference.png` | A lane diagram that passes the diagram checklist, for the agent and the reviewer. |
| `brief.md`, `structure.md`, `content.md`, `prompt.txt` | Copies of the brief, the structure and the content, and the instruction for the agent. |
| `AGENTS.md`, `quality-spec.md`, `rubric.md`, `design-template.md`, `layout-guide.md`, `diagram-checklist.md`, `diagram-specs.md`, `design-example.md` | The rules the agent follows, copied from `standards/` and `designs/`. |
| `design.md`, `directions.md` | The design (written by the agent, or copied from `designs/`). |
| `deck.html` | The slides, written by the agent. |
| `diagrams/<name>.json` | What a complex diagram shows. The build computes `diagrams/<name>.html` from it on a grid and renders `diagrams/<name>.png`. Edit the JSON, never the generated HTML. |
| `fonts/`, `tools/build-deck.mjs`, `tools/request-build.mjs` | The fonts the slides use, and the agent's build command: `build-deck.mjs` runs the kit's own `tools\build.mjs` directly (from the kit folder), and falls back to the bridge with `request-build.mjs` only where the browser can't start. The build never runs anything from the deck folder. |
| `out/html/NN.png`, `out/html/all.png` | Each slide as the browser draws it, and all slides on one sheet. |
| `out/compare/NN.png`, `out/compare/all.png` | Browser (left) and PowerPoint (right) side by side, with a difference score per slide. |
| `out/deck.pptx` | The editable PowerPoint. |
| `out/review-N.md`, `out/critique.md` | The independent reviewer's verdicts (one line per slide, rubric, PASS or FAIL); `critique.md` is the open failure the builder must fix. |
| `out/review.md`, `out/status.md` | The builder's own notes, and the status. Only a reviewer PASS sets `Status: done`. |
| `out/build-log.txt`, `out/codex-round-N.*` | Logs of each build and each agent round. |
