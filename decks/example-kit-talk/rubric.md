# Review rubric

Two people use this rubric. The builder uses it to find what to fix. The **independent reviewer**, a separate read-only session that `run-deck.ps1` starts after each passing build, gives the scores that count: the deck is done only when the reviewer passes it. The reviewer gets every slide PNG attached, so its scores come from the images.

Score each line 1 to 5 from the images (`out/html/NN.png`, `out/html/all.png`, `out/compare/`, `out/diagrams/`), with one sentence of evidence each.

| # | Question | 5 looks like |
|---|---|---|
| 1 | **Hierarchy:** Can you tell in two seconds what each slide claims? | The headline dominates; supporting items read second; nothing competes. |
| 2 | **Alignment:** Do edges line up with the grid and with each other, across slides? | Headlines in the same place; card edges share lines; no near-misses. |
| 3 | **Space:** Is the empty space deliberate and even? | Balanced margins; no crowded corner next to an empty half; no empty band across the slide. |
| 4 | **Consistency:** Does every role (label, card, tag, step, caption) look the same everywhere? | Looking at all.png, the slides are clearly one deck. |
| 5 | **Diagrams:** Is every diagram drawn, clear, and free of collisions? Look at each `out/diagrams/*.png` at full size against `diagram-checklist.md` (including the 2.4:1 band shape), and at how it sits on its slide. | Boxes aligned, labels padded, connectors clear of text, a reader gets it without the notes. |
| 6 | **Readability:** Is everything readable from the back of a room? | Body 26 px or more, strong contrast, short lines. |
| 7 | **Restraint:** Is the accent used only for emphasis, and the motif used sparingly? | Accent on one or two things per slide at most. |
| 8 | **Identity:** Does the deck have a look of its own that fits the talk, rather than a generic template? | Someone would recognise a new slide as belonging to this deck. |
| 9 | **PowerPoint match:** Does each `out/compare` pair match? | Same wrapping, positions and fonts on both sides. Score 4 when no slide is flagged "check this slide" in `out/build-log.txt` and no text rewraps, clips or moves to another line; small shifts in letter spacing from font rendering are expected and still score 4. Score 3 or lower only when a slide is flagged, or text rewraps, clips, runs together or overlaps in PowerPoint. |
| 10 | **Finish:** Put `out/html/all.png` next to `quality-bar/all.png`. Is every slide at least as finished as the bar? | Every content slide has drawn components and one item that changes state; the background changes on purpose; nothing looks like text on a page. |
| 11 | **Fit:** Does each slide's form show the shape of its content? | A flow, loop or system is a drawn diagram with connectors; a comparison is side by side; steps the content lists stay separate steps. |

A 5 needs evidence you can point to in a PNG. If you aren't sure a line earns a 4, score it 3. For line 10, name the weakest slide and say what it lacks compared with the bar.
