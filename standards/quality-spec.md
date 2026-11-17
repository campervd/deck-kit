# Deck quality spec

These rules make any deck good, whatever it looks like. They hold for every design. They don't choose a look: colors, fonts, shapes, layouts and motif are decided fresh in `design.md` for each deck.

Rules marked **[checked]** are enforced by the build (`node tools/build-deck.mjs`). The rest you judge yourself from the slide images, using `rubric.md`.

## 1. Canvas and grid

- 16:9 at 1920 × 1080 px.
- One outer margin for the whole deck, between 96 and 144 px. Nothing crosses it except shapes you mark as full-bleed. **[checked]**
- Declare one grid in design.md (for example 12 columns with a 32 px gutter). Every block's left and right edges sit on it.
- Every content slide puts its headline in the same place: same x, same top. **[checked]**
- One spacing scale based on 8 px (8, 16, 24, 32, 48, 64, 96). Use only those values for gaps and padding.

## 2. Type

- At most two families, plus an optional mono for labels and technical terms. Use only families from `fonts/CATALOG.md`. **[checked: fonts must load]**
- Weights 400 and 700 only, plus 400 italic. PowerPoint has only regular and bold, so any other weight renders differently there. **[checked]**
- A type scale with a clear step between levels (ratio about 1.25 or more). At most 7 different sizes in the whole deck. **[checked]**
- Sizes: cover or statement 96 to 160 px **[checked]**; slide headline 56 to 80 px; card titles 32 to 44 px; body 26 to 32 px. Everything the audience reads is 24 px or more, captions and diagram labels included. Only page numbers and eyebrow labels may go down to 20 px: mark them `data-role="meta"`, at most 3 per slide. **[checked]**
- Line height: headlines 1.05 to 1.15; body 1.3 to 1.5.
- A headline wraps to at most 2 lines. Body lines stay under about 50 characters.

## 3. Color

- A small token set: background, surface, line, ink, muted ink, one accent, plus dark-slide versions if the design uses dark slides. At most 10 colors in total. Every color used must be listed in design.md with its hex. **[checked]**
- One accent hue. Use it for emphasis only: the key card, a label, an arrow, a number. If everything is accented, nothing is.
- Contrast: text at least 4.5:1 against what's behind it; text 36 px or larger at least 3:1. **[checked]**
- No gradients, shadows, emoji, stock illustrations or clip art.

## 4. Density

- One claim per slide, written as the headline.
- At most 3 cards or 5 list rows per slide. Card body 15 words or fewer.
- At most about 60 visible words on a content slide. **[checked: warning]**
- No paragraphs on slides. Detail goes in the speaker notes.
- Leave real empty space between components, but make it deliberate: a slide filled edge to edge looks like a document, and so does a small block of text at the top of an empty slide. **[checked: no empty band taller than 22% of the content area on a content slide, above, between or below the content]**

## 5. Shapes and consistency

- Pick one shape language and keep it: corner radius, border or fill, line weight. The same role (card, tag, step) looks the same on every slide.
- Padding inside a card at least 24 px; inside a tag at least 8 px. Text never touches the edge of its box. **[checked]**
- A repeated motif (a rule line, an index number, a color block, a marker) used the same way throughout gives the deck its identity. One motif, used with restraint.

## 5a. Finish

`quality-bar/all.png` shows the level every deck must reach. Match its level of finish, not its look. `layout-guide.md` shows how to get there for each kind of content.

- Every content slide is built from drawn components: cards, chips, numbered step rows, diagram boxes or panels. A component has a fill that differs from the slide background, or a border on all four sides. Text with thin rules alone reads as a document. **[checked: components must cover 12% or more of the content area on every slide that isn't a cover, title, statement or section slide]**
- The key item on a slide changes state: an inverse fill (dark box, light text), an accent fill, or an accent outline. Accent-colored text alone is not enough.
- Relations are drawn: an arrow between before and after, bold + and = signs between the parts of an equation, connectors in a path.
- File names, commands and tool names are set in the mono face, often as chips.
- The background changes on purpose at least three times in the deck: for example a dark or accent cover, an accent statement slide and a dark diagram slide.
- Headlines are bold. Components are large enough to use the slide's height.
- A large card is filled top to bottom: its content spans at least 60% of its height. Make a card shorter, or its content larger, rather than stretch it to fill space. **[checked]** Screenshot placeholders (dashed) are exempt.
- Small line icons are allowed as simple inline SVG shapes, all with the same stroke weight. One icon or marker per entry (a card, a row, a list item): never a glyph and a `::before` or bullet that show the same mark twice. **[checked]**

## 6. Diagrams, paths and flows

Content lines that describe a diagram are a brief for a drawing, not text to print.

- Draw every path, flow, lane or before/after with the deck's own shapes: boxes, lines and arrows as separate elements, or simple inline SVG shapes with the labels in HTML elements. Never type a path as a string like "A → B → C". **[checked: warning]**
- Each label sits inside its box with padding on every side, or clearly outside it with at least 12 px gap. Never on a border. **[checked]**
- Connectors are their own elements, with at least 8 px clear of any text. A line never runs through a label.
- A connector or arrow sits centered between the two elements it joins: in the middle of the gap, and level with their shared center line. Its head touches its line. **[checked]**
- Align diagram boxes on a shared grid: equal widths per row or column, equal gaps.
- Keep a diagram to about 9 boxes. If the brief asks for more, merge or drop detail and leave it in the speaker notes.
- A diagram gets a title or caption that says what to notice.

### 6a. Complex diagrams: build them on their own first

Complex diagrams come out better when they are built and reviewed on their own, then placed on the slide. A diagram is complex if it has lanes, a grid of crossing parts, more than 5 boxes, connectors that turn or branch, or boxes inside boxes.

1. **A wide, short band, about 2.4:1.** A complex diagram shares its slide with a headline and other content, so it is a band, not a tall block: `diagram-specs.md`, "Aspect ratio", says how to size it.
2. **Positions are computed in code, not placed by eye.** Write a spec, `diagrams/<name>.json`, that says what to draw: for a lane diagram the lanes (each with its label and what it does), the slice titles and the handoff text; for a flow the steps and an optional loop; plus `width`, and `colors` and `fonts` from design.md. The build's diagram layout step (`tools/diagram_layout.mjs`) turns it into `diagrams/<name>.html`, on a grid: equal slices and gaps, the grid centered, each handoff pill centered in its slice and on the boundary between two lanes, so its lines above and below are equal. Don't edit the generated HTML; edit the JSON. `diagram-specs.md` lists every field, with an example of each type. Write HTML by hand only for a diagram that is neither lanes nor a flow; it must then meet the same geometry rules.
3. The build's diagrams step renders it to `diagrams/<name>.png` at 2x and checks its text (24 px or more, no overflow, no overlaps, 8 px from box edges), its geometry (every handoff and slice label centered in its slice, equal lines above and below each handoff, no box without a label) and its words (every word and number in it appears in content.md). **[checked]** It runs before the slide check.
4. Review `out/diagrams/<name>.png` at full size against `diagram-checklist.md`, item by item, and fix the JSON until every item passes.
5. Place it in the slide: `<img src="diagrams/<name>.png" alt="what it shows" style="width:Wpx;height:Hpx">`, with exactly the W and H the diagrams step prints: never stretched, squashed or full-bleed. The image may not overlap any other element on the slide, and stays inside the outer margin. **[checked]**
6. The slide keeps the headline, caption and any short points as normal HTML text around the image.

In PowerPoint the diagram is a picture, not editable shapes. Its source stays in `diagrams/`. Simple diagrams (a row of up to 5 boxes with straight connectors) stay in deck.html as normal elements, so they stay editable.

### 6b. Supplied images

If the person supplied images in `assets/` (for example a diagram they made elsewhere, or a real screenshot), use them as given: `<img src="assets/<file>" alt="what it shows">`. Show them at their own aspect ratio, and don't stretch them or crop them. **[checked: aspect ratio]** Use a supplied image instead of a placeholder for the same thing.

## 7. Screenshots

- Where content.md has a bracketed screenshot line, leave a placeholder: a surface-colored box with a dashed border and the bracketed caption centered in it, at roughly the screenshot's real aspect ratio (about 16:10).

## 8. Content and notes

- Use content.md's slide text word for word: don't add, cut or reword it. Short structural words a layout needs (like "+" or "Before") are fine where content.md implies them.
- If the deck started from `brief.md`, you wrote content.md yourself (see AGENTS.md, Step 0). The same rule then holds for your own content.md, and every fact in it must come from the brief.
- Put every slide's speaker notes in exactly as written, inside the slide as `<template data-pptx-notes>`. **[checked]**

## 9. The loop

Quality comes from looking, not from the first draft. Render, check, look at every slide yourself, score it with rubric.md, fix, and repeat until every rubric line scores 4 or 5.
