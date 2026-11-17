# Quality bar

These PNGs show the level of finish every deck must reach. They are the kit's own example deck, `decks\example-kit-talk` (design `navy-rust`), as the browser draws it: `all.png` holds all 9 slides, and `01.png` to `09.png` hold one slide each. To make them again, build that deck and copy its `out\html\*.png` here.

Match the **level**, not the **look**. Use your own colors, fonts, motif and layouts. What to take from them:

- Every content slide is built from drawn components: cards, chips, numbered step rows, diagram boxes. No slide is only text and thin rules.
- The key item changes state: a dark or accent fill with light text, or an accent outline. Accent-colored text alone is not enough.
- Relations are drawn: an arrow joins before and after, and bold + and = signs sit between equation cards.
- Technical names (files, commands, tools) are set in mono, often as small chips.
- The background changes on purpose: a dark cover, an accent slide, and dark slides for the main diagram and the fix.
- Headlines are bold and large.

Their weak points, which you must not copy: slides 2 and 3 leave the lower part of the slide empty, and some card text is smaller than it needs to be.

`rubric.md` line 10 scores each deck against this bar.