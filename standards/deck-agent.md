# Deck kit: design and build a presentation

You build one presentation as an editable PowerPoint, in this folder. `prompt.txt` says whether you design a new look or use the design already in `design.md`. Inputs in this folder:

- `deck.json`: what this deck is made of: its brief, structure, content and design (paths in the kit). A deck is one content file plus one design.
- `content.md`: the slide text and speaker notes. Use its words as written. Its first lines name its brief and its structure.
- `brief.md`: what the person wants to talk about. When there is no `content.md`, you plan the slides and write `content.md` yourself (Step 0).
- `structure.md`, if the deck has one: the talk's structure (slide types, order, rules). Follow it.
- `structures/`, only when the deck starts from a brief with no structure: the kit's structures, to pick from in Step 0.
- `diagram-checklist.md`: what every diagram must pass, reviewed at full size.
- `diagram-reference.png`: a lane diagram that passes every item of the checklist. Match its level, not its colors.
- `quality-spec.md`: the rules every design must meet. Follow them exactly.
- `quality-bar/`: PNGs of a deck at the level of finish every deck must reach. Look at `quality-bar/all.png` before you design, and again at every review. Match its level, not its look.
- `layout-guide.md`: how to turn each kind of content into a drawn slide form.
- `design-template.md`: the design decisions you must make and write down.
- `rubric.md`: how you review your own slides.
- `fonts/CATALOG.md`: the fonts you may use.
- `design-example.md`: an example design, for the level of detail only. A new design must look clearly different from it: a different type pairing, a different accent hue, your own patterns. Its level of finish stays the same.
- `design.md`, only if the person supplied a design: use it as given, and skip Steps 1 and 2.
- `assets/`, only if the person supplied images (for example a diagram made elsewhere, or a real screenshot). Use them as given (`quality-spec.md` section 6b).

Work only inside this folder. Don't download templates, images or fonts. Don't install packages, and don't run `npm`, `npx` or the separate build steps yourself: you build only with `node tools/build-deck.mjs` (Step 3). Never run `dom-to-pptx-skills`.

`out/deck.pptx` must come only from the kit's build. Don't write your own exporter, and don't use python-pptx, PptxGenJS directly or any other library to make it: the test is whether this pipeline's output is good.

## First: is this a new run or a continuing one?

Look for `out/status.md` before doing anything else.

- **No `out/status.md` and no `design.md`:** a new run. Start at Step 0 if there is a `brief.md` and no `content.md`, else at Step 1.
- **`brief.md`, a supplied `design.md`, no `content.md`:** do Step 0, then go to Step 3.
- **`design.md` exists but no `out/status.md`:** the design is already chosen (supplied by the person, or from an earlier run that could build for itself). Keep it and carry on at Step 3.
- **`out/status.md` exists:** you are continuing, and a build has run since your last edit. Then:
  1. Don't build first. The images and reports in `out/` are the latest build.
  2. Keep the direction and design you already chose. Don't write new directions or pick a new look.
  3. Change `design.md` only to fix a real design problem, never to make a check pass (for example, don't shrink the margin so elements fit). Note any change and why in `out/review.md`. The checker warns when the margin or colors change between builds.
  4. **If `out/critique.md` exists, it is the independent reviewer's verdict on the latest build. Fix every slide marked FIX and every rubric line under 4 that it names, in the way it suggests or better.** That is this session's main job.
  5. Read `out/build-log.txt` if present and `out/check-report.json`, and look at the images (Step 4 says how). Then fix, build and look again as Step 4 says.

## Step 0: plan the deck from brief.md (only when there is no content.md)

1. Read `brief.md`, `structure.md` (if there is one), `layout-guide.md` and `quality-bar/all.png`. If there is no `structure.md`, read `structures/` in this folder (its README lists them) and pick the structure that fits the brief. Copy that file to `structure.md` and follow it. Pick none only if none fits, and say why in `outline.md`.
2. Write `outline.md` as `layout-guide.md` section 1 says: the story, then one entry per slide with its claim, content shape, form, emphasis and background. Follow the structure's slide types, order and rules. **The brief's length wins:** if the brief gives a length or a number of slides, use it, and use the structure's "Short version" when the brief asks for fewer slides than the structure's full list. Without a length in the brief, choose the number of slides it needs (usually 7 to 12). Pick forms that fit each piece of content, not the forms of the quality bar's slides.
3. Write `content.md` from the outline, in this format: a `# Title` line; then the lines `Brief: <the brief's path from deck.json>` and `Structure: standards/structures/<name>.md` (or `Structure: none`); then one `## Slide N` section per slide with labeled lines (`Label:`, `Title:`, `Headline:`, `Statement:`, `Steps:`, `Caption:` and so on), bullets, `[Screenshot: …]` lines where the brief has a screenshot, and `Speaker notes:`. Follow `layout-guide.md` section 4: every fact from the brief, nothing invented, short slide text, the story in the notes.
4. From here on, content.md is the source: use its words as written, like any other content.md.

## Step 1: choose a direction

Write `directions.md` with three clearly different design directions for this talk and audience. For each: a name, the mood in one sentence, the type pairing, the palette idea (with the accent hex), the shape language, the motif, and how three of the talk's most different slides would look. Then pick one and say why in two sentences. If the prompt names a direction, use that one instead and adapt it.

## Step 2: write design.md

Fill in every section of `design-template.md` for the chosen direction and save it as `design.md`. Its patterns must cover every form in `outline.md` (if there is one), each with its components and its emphasis state as `quality-spec.md` section 5a asks. Every color you will use must be in its token table with a hex value: the checker flags any color not listed there. Check each text/background contrast ratio before you build.

## Step 3: build

You write the slides as HTML and CSS. A real browser lays them out, and `dom-to-pptx` turns each slide into native PowerPoint shapes and text boxes, so the browser's layout carries over and the result stays editable.

1. Build each complex diagram on its own first, as a spec `diagrams/<name>.json` that the build lays out in code (`quality-spec.md` section 6a; fields and examples in `diagram-specs.md`). After each build, review `out/diagrams/<name>.png` at full size against `diagram-checklist.md`.
2. Write `deck.html` (rules below). Place each complex diagram as its PNG at exactly the width and height the build prints for it (never stretched, squashed or full-bleed), and each supplied image from `assets/` at its own aspect ratio.
3. Build (below). The kit's build runs these steps in order and stops at the first that fails:
   - **guard**: refuses the deck if this folder, deck.html or the output folders are links or junctions;
   - **diagram layout**: computes each `diagrams/<name>.json` into `diagrams/<name>.html`;
   - **diagrams**: renders each `diagrams/<name>.html` to `diagrams/<name>.png` at 2x, copies it to `out/diagrams/` for review, and checks its text, its geometry, and that its words come from content.md;
   - **check**: opens deck.html in headless Chrome or Edge, checks the quality rules it can measure, and saves `out/html/NN.png` for each slide plus `out/html/all.png`;
   - **contact sheet**: writes `out/<name>-contact-sheet.png`, every slide numbered on one sheet;
   - **export**: writes `out/deck.pptx`;
   - **pptx check**: the .pptx structure, and that every font used on the slides is embedded in each style used;
   - **render**: renders the .pptx back to `out/pptx/NN.png` with LibreOffice, and writes `out/compare/NN.png` (browser left, PowerPoint right) with a difference score per slide.

   In diagrams, check and export the browser may load only files inside this folder; any other request fails the build. Before the first build the diagram PNGs don't exist yet: place the `<img>` anyway, and the build makes them.

### How to build

Full access is the expected setup and builds run directly. Don't change your own sandbox settings. If a sandbox blocks the build, use bridge.ps1 (the build command below does this for you).

From this folder, run:

```
node tools/build-deck.mjs
```

Give that command a timeout of at least 300 seconds. It runs the kit's build directly (from the kit folder, with the kit's own tools) and prints the result: passed or failed, and every PROBLEM and warning line. Then the new images are in `out/html/`, `out/diagrams/` and `out/compare/`. Build as often as you need, but finish a batch of fixes first: one build takes about 15 seconds.

**If the browser can't start where you run** (for example inside Codex's Windows sandbox, "spawn EPERM"), the same command falls back by itself: it asks the build bridge (`run-deck.ps1`, or `bridge.ps1` that the person started) to build outside your sandbox and prints that result. If it prints "still running", run it again to keep waiting. If the build refused the deck, remove what it names (a link or junction) and build again.

**If no bridge answered** (exit code 3), the command prints the one command the person must run to start a bridge. Ask them to run it, then build again. If they can't, don't try to start the browser another way, don't change your own sandbox settings, and don't make the .pptx another way. Finish deck.html as well as you can, then write `out/status.md` with:

- first line: `Status: waiting for build`
- the round number
- what changed in deck.html this round
- what you want to check in the images next time

Then stop and say so in your report. The person starts a bridge and starts you again, and you continue as "First: is this a new run or a continuing one?" says.

## deck.html rules (what converts cleanly)

- One file. `<link rel="stylesheet" href="fonts/fonts.css">` and an inline `<style>`. No external URLs, no JavaScript, no frameworks. The only images are `diagrams/<name>.png` and files in `assets/`, as `<img>` with px width and height.
- Every file the page uses (fonts, images) must be inside this folder: a request for anything else, such as `url(C:/...)` or an `https://` address, fails the build. Don't use links or junctions in this folder: the build refuses them.
- Page numbers and eyebrow labels smaller than 24 px carry `data-role="meta"` (at most 3 per slide). All other text is 24 px or more.
- Each slide is `<section class="slide" data-pattern="NAME">`, exactly 1920 x 1080 px, `position: relative; overflow: hidden`. `NAME` is the pattern's name from design.md. Stack slides vertically with no gap.
- Speaker notes go inside each slide as `<template data-pptx-notes>Notes text</template>`. The exporter reads notes only from elements inside the slide; a `data-pptx-notes` attribute on the section itself is ignored.
- Each content slide's headline is its one `<h1>`. The cover's title and a statement slide's claim are `<h1>` too; give those slides `data-pattern` values containing `cover` or `statement` so the alignment check skips them.
- Body margin 0. Set each slide's background on the `.slide` itself.
- Lay out with flexbox, grid or absolute positioning inside the slide. Use px everywhere.
- Every piece of text in its own element (`div`, `p`, `span`, `h1`, `h2`). No bare text next to child elements.
- `font-weight` 400 or 700 only. `font-style: italic` only at 400.
- Cards, bars, tags, lanes and placeholders are elements with `background-color`, `border` and `border-radius`. Dashed borders are fine.
- Diagrams: boxes as elements, connectors as thin elements (for example a 2 px wide div) or simple inline `<svg>` shapes with no text inside the SVG. Labels in HTML elements. Never type a path as "A → B → C".
- Avoid `::before` and `::after`, CSS transforms, filters, shadows and gradients.
- An element that should touch the slide edge (full-bleed) gets the `data-bleed` attribute.

## Step 4: review and repeat

Work in this loop inside one session: build, look, fix, build again.

**Looking means seeing the image.** `run-deck.ps1` attaches images to your first message: the quality bar, the latest build's slide sheet and comparison sheet, and in a fix session every slide the reviewer flagged. Study them before you change anything. After each new build, open the slides you changed with the `view_image` tool if you have it (for example `out/html/03.png`). Listing files, reading the build log or reading deck.html is not looking: you cannot judge layout, space or finish without the image. If you can't view an image, say so in your report and don't score that slide. The independent reviewer always sees every final image.

1. Fix every PROBLEM line from the build. Treat warnings as things to fix unless you can say why not.
2. Look at the slides as above and score them with `rubric.md` in `out/review.md`. The checker only catches mechanical errors; looking is where the design gets good.
3. When the build gets through the render step, look at `out/compare/all.png` and every slide flagged "check this slide". If PowerPoint differs (text rewrapped, run together, shapes shifted, wrong font), change the HTML so it converts cleanly. Usually that means giving text more room or simplifying the structure.
4. Fix, then build again with `node tools/build-deck.mjs`. Repeat until the build passes and you find nothing under 4. If no bridge answers, end by updating `out/status.md` as described under Step 3 and stopping.
5. When the latest build passes and you find nothing left to fix, write `out/status.md` with the first line `Status: ready for review` and stop. Make no further changes after that build. Don't write `Status: done`: an independent reviewer looks at the images next, and only its pass makes the deck done. If it finds problems, you get them in `out/critique.md`.

## When you finish, report

- The model you ran as, and how many build/review rounds it took.
- Which PNG images you opened with `view_image` this session. If you couldn't, say so plainly; then your rubric scores aren't valid yet.
- The direction you chose, the other two you considered, and why.
- Your final rubric scores, and the pattern used for each slide.
- Anything still wrong or that you were unsure about.
- The output path: `out/deck.pptx`.
