# Layout guide: from what you want to say to a slide

Use this guide to plan each slide. First decide the content's shape, then pick a form that fits that shape, then build the form from your design's own components. The forms say what to draw, not how it looks: colors, fonts, corners and motif come from `design.md`.

## 1. Plan the deck first

Write `outline.md` before any HTML. For each slide:

- **Claim:** the one sentence the slide proves. It becomes the headline.
- **Shape:** what kind of content it is (table below).
- **Form:** which form from the table, and why it fits.
- **Emphasis:** the one item that changes state (filled, inverse or accent-outlined).
- **Background:** base, dark or accent.

Then check the plan as a whole:

- The deck follows its structure (`structure.md`, from `standards/structures/`): its slide types, their order and its rules. If the deck has no structure, it still tells a story with an opening, a central idea, support for it, and a close.
- Next-door slides use different forms, unless they are a deliberate pair (for example two parallel case slides).
- At least 3 slides change the background: the cover, the central statement, and one key diagram or section slide.
- Every content slide has a drawn form. A slide that would only be a list becomes cards, step rows or a checklist with markers.
- Every flow, loop, pipeline or system with 3 or more parts is a **drawn diagram**: its parts as boxes and the relations between them as connectors or arrows (a loop also draws its return path). Cards in a row without connectors don't show a flow. A diagram with lanes, branches, a loop or more than 5 boxes is built separately (`quality-spec.md` section 6a).
- The talk's central mechanism (how the thing works) gets the strongest drawn form in the deck, not two plain cards.

## 2. Shapes and forms

| Content shape | Form | Draw it as | Emphasis |
|---|---|---|---|
| Opening: title, subtitle, presenter | **Cover** | Large bold title, short subtitle, small label above, presenter low. Dark or accent background. | The title |
| A change over time | **Before → after** | Two equal cards side by side, joined by a drawn arrow. Each card: a small time label, a bold title, one line. | The "after" card (accent outline or fill) |
| A set of 2 to 4 named ideas | **Concept cards** | Equal cards in a row. The name in bold (mono if it is a file or tool name), then one line of explanation. | None, or the one that matters most |
| One central idea | **Statement** | A full accent or dark background, a very large claim over 2 to 4 lines. Optional chips that point to the next slides. | The whole slide |
| Ordered steps | **Step rows** | Numbered rows as filled bars, the number in mono or accent. A callout with an accent rule under them. Optional screenshot placeholder beside them. | The last or key step as an inverse bar |
| A system, path or chain of parts | **Stack or path diagram** | Nodes as boxes in a column or row, joined by connectors. Small chips inside a node for its hops or parts. A short checklist of benefits beside it. | The node the talk is about |
| Parts that add up to a result | **Equation** | Cards joined by bold + and = signs. The result card is wider or inverse. | The result card |
| Lessons with an illustration | **Lessons + diagram** | 2 or 3 small lesson cards in a row, with a diagram below that shows the lesson. Often on a dark background. | The lesson worth keeping |
| Options or a comparison on several points | **Comparison grid** | A grid of cells: options as columns, points as rows. Filled header row. | The recommended column |
| Events in order | **Timeline** | A drawn line with dated markers and short cards above or below it. | Now, or the turning point |
| One number that matters | **Big number** | A very large figure, a one-line meaning, a small source label, in a card or on a tinted panel. | The figure |
| A quote or principle | **Quote panel** | A tinted panel with the quote large and the source small. | The panel |
| Actions or an ask | **Action cards** | 2 or 3 cards or check rows, each with one action. A "next" line in a filled strip below. | The first action |
| A screenshot that must be shown | **Screenshot + points** | A placeholder at about 16:10 on one side, and 2 or 3 short points or step rows on the other. | The point the screenshot proves |

If no form fits, design a new one with the same parts: drawn components, one emphasized item, and a caption that says what to notice. Add it to `design.md` as a pattern.

The lessons + diagram form, and any diagram with lanes, a loop, a grid, branching connectors or more than 5 boxes, is complex: build it on its own first in `diagrams/`, then place its PNG in the slide's form (`quality-spec.md` section 6a). The diagram layout tool draws two types from a `diagrams/<name>.json` spec: **lanes** (lanes crossed by slices, with handoffs) and **flow** (steps in a row, with an optional loop back). Use it for every diagram of those two types. A stack or path diagram, a timeline, a grid or a branching diagram is not one of them: write it by hand as `diagrams/<name>.html` (`diagram-specs.md`, last section), on a grid, so that it passes the same checks. A simple stack or path of up to 5 boxes in a straight line can stay in deck.html as normal elements. A supplied image in `assets/` replaces a diagram or placeholder for the same thing.

## 3. Size and space

- The content block uses most of the content area. If content is short, fill the space by **making the content larger** (bigger type within the scale, a larger diagram, a screenshot placeholder) or by **centering the content block** between the headline and the bottom margin. Never stretch a card, row or panel taller than its content: a tall box with a line of text in it looks unfinished. The checker fails empty bands over 22% of the content area and cards whose content spans less than 60% of their height.
- Cards in one row have equal widths and equal heights.
- Keep at least 48 px between components and the headline, and 24 px between components in a row.

## 4. When you write the words yourself (from `brief.md`)

- Take every fact from the brief. Don't invent names, numbers, tools, dates or results.
- Headlines are claims of 4 to 10 words, in the presenter's voice.
- Card titles of 2 to 5 words, and card lines of 15 words or fewer.
- Put the detail and the story in the speaker notes, in the presenter's voice, about 40 to 90 words a slide.
- Mark a screenshot slot as `[Screenshot: what it shows]` only where the brief says a screenshot exists.
- Keep the brief's structure where it has one: a list of steps stays a list of steps, one row each, in order. Don't merge or drop steps, parts or lanes the brief names. Shorten their wording instead.
