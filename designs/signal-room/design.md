# Design: Signal Room

Ink navy and near-white with one violet signal accent; Space Grotesk headlines, IBM Plex Sans body, IBM Plex Mono labels. Reuse it with `new-deck.ps1 -Design signal-room`.

## 0. Direction

- **Name:** Signal Room.
- **Mood:** A focused operations room where information moves deliberately from source to action.
- **Why it fits:** The talk explains practical systems and judgment, so an operational visual language makes reach, evidence, and control immediately legible.

## 1. Grid

- **Outer margin:** 120 px.
- **Columns and gutter:** 12 columns, 120 px wide, 32 px gutters; usable content width is 1680 px.
- **Headline position:** x 120 px, top 204 px on all content slides.

## 2. Color tokens

| Token | Hex | Use |
|---|---|---|
| night | #111827 | Dark background and headline ink |
| cloud | #F7F8FC | Light background and text on dark |
| panel | #E9ECF5 | Light panels and screenshot placeholders |
| line | #C8CEDD | Structural rules and panel borders |
| muted | #56627A | Supporting text on light |
| accent | #6840D9 | Signal rails, active state, and emphasis |
| accent-soft | #E9E2FF | Selected light panel fill |
| night-panel | #202A3F | Panels on dark slides |

Contrast: night on cloud 16.8:1; muted on cloud 5.8:1; night on panel 14.3:1; night on accent-soft 13.4:1; cloud on night 16.8:1; cloud on night-panel 13.9:1; accent on cloud 6.3:1; accent on accent-soft 4.9:1.

## 3. Type

- **Families:** Space Grotesk headlines give the deck an engineered, contemporary presence; IBM Plex Sans keeps explanatory text calm and technical; IBM Plex Mono marks labels and route IDs.
- **Scale:** 128 px cover/statement, 700, 1.05; 72 px content headline, 700, 1.1; 40 px card title, 700, 1.1; 36 px benefit title, 700, 1.1; 30 px body, 400, 1.4; 24 px labels, technical terms, and captions, 700/400, 1.25.
- **Labels and terms:** Uppercase IBM Plex Mono at 24 px; route IDs and step numbers use accent mono; product and technical terms remain IBM Plex Sans bold.

## 4. Shape language

Panels have 12 px corners, a 2 px `line` border, and 32 px padding. Signal rails and connectors are 4 px accent lines; tags have 8 px vertical and 16 px horizontal padding. The selected or consequential item uses `accent-soft` on light slides or a 2 px accent border on dark slides.

## 5. Motif

A compact violet signal rail—one round node followed by a horizontal line and a slide number—anchors the upper-left of every slide. It appears once per slide and turns the deck into a sequenced operational briefing.

## 6. Slide rhythm

Slides 1, 4, and 9 are night-dark control moments; slides 2, 3, 5, 6, 7, and 8 are cloud-light working views. The thesis is the visual reset, and the close returns to the dark command tone.

## 7. Patterns

- **signal cover:** Dark opener with title, subtitle, presenter, and a large quiet route frame. Slide 1.
- **state change:** Two aligned panels contrast before and after. Slide 2.
- **concept stations:** Three numbered station panels for foundational ideas. Slide 3.
- **signal statement:** Dark thesis page with two linked destination tags. Slide 4.
- **process board:** Five compact process rows at left, evidence note and 16:10 screenshot placeholder at right. Slide 5.
- **route board:** Three vertically connected route nodes at left, benefits and 16:10 screenshot placeholder at right. Slide 6.
- **map equation:** Three aligned system panels separated by operators and followed by a closing line. Slide 7.
- **slice review:** Three lesson panels paired with a two-lane, three-slice board. Slide 8.
- **signal close:** Dark close with two action panels and a forward-looking final line. Slide 9.

Screenshot placeholders use a `panel` fill, 2 px dashed `line` border, 12 px corners, and their supplied bracketed caption centered. Diagrams use aligned HTML panels plus separate accent connector elements, with labels held inside padded boxes.
