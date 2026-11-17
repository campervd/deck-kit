# Design: Cobalt Slate

Slate navy and white with one cobalt-blue accent; Inter, with Roboto Mono for numbers and tags. Reuse it with `new-deck.ps1 -Design cobalt-slate`. `new-deck.ps1` also gives it to every new design as `design-example.md`, for the level of detail only: a new look must then differ from it.

## 0. Direction

- Name: Cobalt Slate (first made as "Calm engineering").
- Mood: a peer explaining what worked, plainly and without hype.
- Fit: technical talks to engineers, where clarity beats flourish.

## 1. Grid

- Outer margin 128 px.
- One column stack for most slides; two-column slides use a 760 px left column, 64 px gap, right column fills the rest.
- Headline at x 128, top 200 on content slides, under a label at top 128.

## 2. Color tokens

| Token | Hex | Use |
|---|---|---|
| bg | #FFFFFF | Light background |
| bg-alt | #F1F5F9 | Placeholders |
| ink | #0F172A | Headlines; dark slide background |
| muted | #475569 | Body on light (7.6:1 on bg) |
| accent | #1F5FD6 | Labels, arrows, key-card border; statement background |
| accent-on-dark | #6EA8FE | Labels and borders on dark |
| card | #F8FAFC | Card fill |
| line | #E2E8F0 | 1 px borders |
| card-dark | #1E293B | Card fill on dark |
| text-on-dark | #CBD5E1 | Body on dark (11:1 on ink) |

## 3. Type

- Inter for everything, Roboto Mono for step numbers and tags: neutral and technical.
- Scale: cover 140 bold 1.05; statement 120 bold; headline 72 bold 1.1; card title 40 bold; body 30 regular 1.4; label 24 bold uppercase, letter-spacing 1 px; mono 24.

## 4. Shape language

Cards radius 8 px, 1 px line border, 40 px padding. The key card gets a 2 px accent border. Tags radius 4 px. Callout: 6 px accent left border.

## 5. Motif

The uppercase accent label above every headline, formatted `SECTION · Topic`.

## 6. Slide rhythm

Dark cover, light content, accent-background statement slide at the thesis, dark slide for the lesson, light close.

## 7. Patterns

Cover (dark); before → after (two cards and an arrow); three cards; statement (accent background); steps + screenshot; flow stack + screenshot; equation (card + card = dark card); lesson (dark, three cards and a lane diagram); ask (two actions and a closing line).
