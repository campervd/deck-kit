# Decks from notes

Brief: briefs/example-kit-talk/example-kit-talk-brief.md
Structure: standards/structures/tool-walkthrough.md

## Slide 1
Label: MEETUP · DECK KIT
Title: Decks from notes
Subtitle: A portable folder that turns plain notes into an editable PowerPoint—with a real quality check.
Presenter: Presenter Name
Speaker notes: I built this because making a good deck takes hours, while asking an agent for a presentation often produces something generic. This is a short tour of a kit that starts with notes, makes an editable PowerPoint, and checks whether the result actually holds up.

## Slide 2
Label: WHY I BUILT IT
Headline: A good deck needs three things at once
Requirement 1: Finished
Detail 1: Match the level of my best hand-made deck.
Requirement 2: Specific
Detail 2: Give each talk its own layout, not one template.
Requirement 3: Portable
Detail 3: Unzip it anywhere and run it.
Result: Deck kit
Result detail: Finished, varied, runnable.
Speaker notes: The goal was not simply to generate slides. I wanted a result that looked finished, varied its layout to match the talk, and could be run by another person with Node.js, Python, LibreOffice, Chrome or Edge, and the Codex CLI.

## Slide 3
Label: THE CONTRACT
Headline: Notes in; an editable, reviewable deck out
Input: A brief
Input detail: Topic, audience, time, and images you already have.
Output: The return package
- Editable PowerPoint
- PNG of every slide
- Browser / PowerPoint side-by-side
- Rubric scores
Speaker notes: The input is intentionally simple: a short brief like this one, plus any images someone already has. The output is more than a PowerPoint. It includes the slide PNGs, a browser-versus-PowerPoint comparison for every slide, and the agent's own rubric scores.

## Slide 4
Label: HOW IT WORKS
Headline: Three commands turn notes into a checked deck
Command 1: setup
Command 2: new-deck
Command 3: run-deck
Stage 1: Plan
Stage 2: Design
Stage 3: Write HTML
Stage 4: Check in browser
Stage 5: Export and render
Stage 6: Score and fix
Caption: The loop repeats until the build passes and every rubric line scores 4 or 5.
Speaker notes: There are only three commands for the person using it: setup once, new-deck to make a deck folder from notes, and run-deck to build. Inside that last command, Codex plans, writes notes, chooses layouts, designs, writes HTML, checks it in a real browser, exports PowerPoint, renders it back, scores the images, and fixes what is wrong.

## Slide 5
Label: QUALITY RAILS
Headline: Quality is designed into the loop, not added at the end
Rail 1: Quality bar
Rail 1 detail: Match the finish level, not the look.
Rail 2: Real browser
Rail 2 detail: Fail small, low-contrast, empty, or out-of-margin slides.
Rail 3: Guarded kit
Rail 3 detail: The agent may not change the build or checker.
Evidence: Every deck gets image review, rubric scores, and repair passes.
Speaker notes: The quality rails are deliberate. A quality bar establishes the finish level without forcing one template. The checker catches measurable problems such as small text, low contrast, nearly empty cards, and margin violations. And the agent cannot rewrite the tools that judge it; run-deck stops if those files change.

## Slide 6
Label: DIAGRAMS
Headline: Complex diagrams get their own quality pass
Step 1: Build the diagram on its own
Step 2: Check its text, spacing, and collisions
Step 3: Place the reviewed image in the deck
Callout: Diagrams are pictures in PowerPoint, so they are not editable there.
Speaker notes: A complex diagram is a weak spot for agents if it is drawn inline from a description. The kit has the agent make the diagram separately, render and inspect it, then place the checked image on the slide. That gives us a better diagram, with a clear trade-off: it is a picture rather than editable PowerPoint shapes.

## Slide 7
Label: THE HARD PART
Headline: The Windows sandbox was the hard part
Number: 22 rounds
Meaning: One test took about 75 minutes when every fix waited for a full round.
Constraint: Sandbox
Constraint detail: It can write only inside the deck folder, and on Windows it cannot start Chrome.
Speaker notes: The hard part was not the deck logic. Codex runs in a strict sandbox. On Windows that sandbox could write its edits but could not start Chrome to test them. That meant each fix waited for a complete new round; one test took 22 rounds and about 75 minutes.

## Slide 8
Label: THE FIX
Headline: The build bridge keeps the sandbox strict and feedback fast
Before: Sandbox only
Before detail: Writes edits but cannot start Chrome.
After: Build bridge
After detail: A request file asks run-deck to build outside the sandbox in about 15 seconds.
Guard: The request carries no commands.
Speaker notes: The bridge keeps the useful security boundary intact. Codex writes a request file; run-deck, outside the sandbox, runs the build in about 15 seconds; Codex reads the result and continues in the same session. The request contains no commands, so the sandbox is not loosened.

## Slide 9
Label: THE ASK
Headline: Try it on your next talk—and show me the misses
Action 1: Bring a brief
Detail 1: Topic, audience, time, and any images.
Action 2: Keep the PNGs
Detail 2: Look at the slides, not only the PowerPoint.
Action 3: Send the gaps
Detail 3: Tell me where the result falls short.
Next: Layout variety still needs proof on more talks.
Speaker notes: This works end to end on my PC from a fresh unzip with gpt-5.6-terra. I would like you to try it on a next talk, send me the brief and PNGs, and tell me precisely where the result disappoints. Layout variety still needs proof across more talks.
