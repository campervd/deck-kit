# Design: Navy Rust

Deep navy and one rust accent on warm paper; Space Grotesk headlines, IBM Plex Sans body, IBM Plex Mono labels. Reuse it with `new-deck.ps1 -Design navy-rust`.

## 0. Direction

- Name: Navy Rust (first made as "Workshop Ledger").
- Mood: A calm, capable technical workbench that makes the process feel tangible and repeatable.
- Why it fits: talks that must make a technical process understandable without looking like a generic product demo.

## 1. Grid

- Outer margin: 120 px.
- Grid: 12 columns, 32 px gutters; content width is 1680 px.
- Headline position: x 120 px, top 154 px on every content slide.

## 2. Color tokens

| Token | Hex | Use |
|---|---:|---|
| paper | #F5F0E8 | Base background |
| sand | #E7DED0 | Alternate background |
| surface | #FFFDF8 | Cards and panels |
| line | #CBBEAD | Borders and rules |
| ink | #14213D | Primary text |
| muted | #5E697A | Supporting text |
| accent | #A84620 | Emphasis, numbers, markers |
| dark | #14213D | Dark slide background |
| dark-surface | #223252 | Dark cards |
| light-ink | #FFFDF8 | Text on dark or accent |

Contrast: ink/paper 14.7:1; ink/surface 15.4:1; muted/paper 5.1:1; light-ink/dark 15.4:1; light-ink/accent 5.7:1.

## 3. Type

- Space Grotesk (700) headlines: compact, distinctive, and structural.
- IBM Plex Sans (400/700) body: practical and legible in dense technical explanations.
- IBM Plex Mono (400/700) commands, labels, and numbers.
- Scale: 112 px cover/statement (700, 1.05); 68 px content headline (700, 1.08); 42 px key number/card title (700, 1.1); 30 px body (400, 1.35); 24 px detail (400, 1.35); 20 px label/meta (700, 1.2).
- Labels, numbers, files, and commands use IBM Plex Mono; all labels below 24 px receive the meta role.

## 4. Shape language

- Panels use 4 px corner radius, 2 px solid border, and 32 px padding.
- The standard panel is surface on paper/sand or dark-surface on dark.
- Emphasis is an accent fill with light text on light slides, or a light outline / paper fill on dark slides.
- Connectors are 4 px rules with simple triangle arrowheads; no shadows or gradients.

## 5. Motif

A short orange ledger marker sits above each content headline and beside the key item in a component. It appears once per slide as the visual cue for an inspected step.

## 6. Slide rhythm

Slides 1, 4, and 8 are dark to mark the opening, central system, and solution. Slide 6 uses the accent field as a deliberate diagram interlude. Slides 3 and 7 use sand as quieter evidence pages; the rest are paper.

## 7. Patterns

- `cover-ledger`: dark cover with large title, small label, subtitle, and descriptor chips. Slide 1.
- `equation-ledger`: three equal requirement cards, plus signs, and an inverse result card. Slide 2.
- `contract-ledger`: a brief card, connector, and larger return-package card with four check rows. Slide 3.
- `system-dark`: dark headline, command chips, and a reviewed complex diagram PNG below. Slide 4.
- `rails-ledger`: three principle cards on a numbered rail plus an evidence strip. Slide 5.
- `steps-accent`: accent field with three numbered rows and an inverse callout. Slide 6.
- `number-ledger`: large statistic panel paired with a constraint card. Slide 7.
- `bridge-dark`: dark before/after system cards connected by a horizontal arrow and guarded request strip. Slide 8.
- `ask-ledger`: three action cards over a full-width next strip. Slide 9.
- Complex diagrams use a dark-surface canvas, 2 px borders, 24 px labels, and orange connectors; screenshot placeholders, if needed, would use a surface fill and 2 px dashed line border.
