# Diagram checklist

Review every diagram at full size (`out/diagrams/<name>.png`) against this list, and then on its slide (`out/html/NN.png`). The build already measures items marked **[checked]**; look at all of them anyway, because a measurement can pass a diagram that still reads badly.

## Geometry

1. Positions come from the diagram layout tool (`diagrams/<name>.json`), not from hand-placed HTML, for every lane, flow or loop diagram.
2. Columns (slices) have equal widths and equal gaps, and the grid is centered in the diagram. **[checked for generated diagrams]**
3. Every handoff or marker is centered in its slice, left to right. **[checked]**
4. The line above a handoff and the line below it are the same length, and both sit on the handoff's center line. **[checked]**
5. Labels of slices are centered in their slice. **[checked]**
6. Lanes are full-width bands of equal height; the slices cross them and line up.
7. The diagram is a wide, short band: about 2.4:1 (width to height) or wider, never a tall block. See `diagram-specs.md`, "Aspect ratio".
8. Every arrow and connector is centered between the two things it joins, and its head touches its line. **[checked on the slide]**

## Content

9. Every box says what it is: no empty boxes or placeholder blocks. **[checked]**
10. Lane labels sit on the left of their lane and name who or what the lane is.
11. Arrows point the way the work flows. A loop draws its way back.
12. Words match the slide's content: the same names, no new facts. **[checked: every word and number in the diagram appears in content.md]**

## On the slide

13. The diagram image overlaps nothing else on the slide: no covered card edges, text or shapes. **[checked]**
14. The diagram is shown at exactly its designed size, width and height, so its 24 px text stays 24 px and nothing is stretched. It stays inside the outer margin, never full-bleed. **[checked]**
15. Colors and fonts are the deck's own (`design.md`), and the emphasis matches the slide's point.

## Reference

`diagram-reference.png` (in `standards/`, and copied into every deck folder) is a lane diagram that passes every item above. Its lanes are full-width rows labeled on the left, its slices are equal columns titled on top, and each slice has one HANDOFF pill centered on the lane boundary, with equal lines above and below and an arrow down. Every box in it is labeled (item 9): a lane by its name and what it does, a slice by its title, a handoff by its text. Match its level of finish, not its colors.
