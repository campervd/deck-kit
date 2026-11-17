# Diagram specs

Write a lane or flow diagram as `diagrams/<name>.json`. The build's diagram layout step computes every position from it in code and writes `diagrams/<name>.html`; don't edit that HTML. Then the build renders `diagrams/<name>.png` at 2x, checks its text and geometry, and prints its size: place it on the slide at exactly that size, `<img src="diagrams/<name>.png" style="width:Wpx;height:Hpx">`.

Common fields:

- `type`: `"lanes"` or `"flow"`.
- `width`: the width in px on the slide. The height is computed and printed by the build.
- `aspect` (lanes only): width divided by height, default `2.4`, allowed 2 to 3.2. The layout computes the height from the width and this ratio.
- `colors`: all nine keys below, each a hex from design.md's token table (the build fails a spec that leaves one out).
- `fonts`: `text` and `mono`, from design.md (family names as in `fonts/CATALOG.md`).

Which design token goes in which color key (token names from `design-template.md`, section 2). On a dark diagram slide, use the design's dark-slide versions of the same tokens.

| Color key | Design token | Used in lanes for | Used in flows for |
|---|---|---|---|
| `background` | the background of the slide the diagram sits on | the diagram's background | the diagram's background |
| `panel` | surface | the fill of each lane band | (not used) |
| `box` | surface (or a second surface tone) | (not used) | the fill of each step |
| `border` | line | the outline of each lane band | the outline of each step |
| `line` | ink (on a dark slide, the light ink) | slice outlines, the lines and arrows of each handoff | arrows and the loop line |
| `text` | ink | slice titles and what each lane does | step labels |
| `muted` | muted ink | (not used) | the loop label |
| `accent` | accent | lane names, the handoff pills, the emphasized slice | the emphasized step |
| `accentText` | the text color that passes contrast on the accent | text on the handoff pills | text on the emphasized step |

## Aspect ratio

A diagram on a slide with a headline and other content is a wide, short band, not a tall block: about 2.4:1 (width to height). A lane diagram gets this ratio from the layout tool. For a flow, the ratio follows from the number of steps and the loop; keep it 3:1 or wider. A hand-written diagram also stays at about 2.4:1 or wider.

To fit the slide, first find the height left under the headline and the other content, less the caption and the 96 to 144 px margin. Then choose `width` = that height x 2.4, at most the content width. If that width is too narrow for the labels, make the other content smaller or move it beside the diagram. Don't make the diagram taller.

## lanes

Lanes are rows of work (for example two developers): full-width bands, each labeled on the left. Slices are columns (for example features) that cross every band, each titled on top. In each slice, work hands off from each lane to the next: one HANDOFF pill centered on the boundary between the two lanes, with a line from the middle of the lane above to the pill and an equal line from the pill to the middle of the lane below, ending in an arrow.

- `lanes`: one entry per band: `{ "label": "Author", "sub": "Writes the notes" }`. `sub` says what the lane does; it is optional.
- `columns`: the slice names, in order.
- `handoff`: the pill text (default "HANDOFF").
- `emphasis`: optional, `{ "column": 0 }` outlines one slice in the accent.
- `laneLabelWidth` (default 280), `handoffWidth` (default 200): optional, in px. The build fails a spec whose lanes would be under 120 px tall or slices under 160 px wide: make it wider.

```json
{
  "type": "lanes",
  "width": 1200, "aspect": 2.4,
  "colors": { "background": "#0f172a", "panel": "#111c33", "box": "#1e293b", "border": "#334155", "line": "#cbd5e1",
              "text": "#f8fafc", "muted": "#cbd5e1", "accent": "#6ea8fe", "accentText": "#0f172a" },
  "fonts": { "text": "Inter", "mono": "Roboto Mono" },
  "lanes": [ { "label": "Author", "sub": "Writes the notes" }, { "label": "Builder", "sub": "Makes the slides" } ],
  "columns": [ "Draft", "Build", "Review" ],
  "handoff": "HANDOFF"
}
```

## flow

Steps in a row joined by arrows, with an optional loop from the last step back to the first.

- `steps`: the step labels, in order. Every step needs a label.
- `loop`: optional label on the way back.
- `emphasis`: optional, `{ "step": 3 }` fills one step with the accent.

```json
{ "type": "flow", "width": 1400, "colors": { ... }, "fonts": { ... },
  "steps": [ "Plan", "Design", "Write HTML", "Check", "Export" ], "loop": "Repeat until it passes" }
```

A diagram that is neither lanes nor a flow can still be written by hand as `diagrams/<name>.html`; it must pass the same geometry checks and `diagram-checklist.md`.
