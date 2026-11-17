# Brief: what I want to talk about

Presenter: Presenter Name. Audience: people who make talks, at a meetup. About 6 minutes. Title idea: "Decks from notes", about the deck kit: a portable folder that turns plain notes into an editable PowerPoint, with an agent doing the design and a real check on quality. Goal: people try it for their next talk, and know where it is still weak.

## Why I built it

Making a good deck takes hours, and asking an agent for "a presentation" gives you something generic. I wanted three things at once: decks that look as finished as the best one I made by hand, a different layout for each talk instead of one template, and something another person can set up with a short list of tools (Node.js, Python, LibreOffice, Chrome or Edge, and the Codex CLI).

## What you give it, what you get back

You start with a brief like this one: plain notes on what you want to say, who the audience is and how long you have. You can add images you already have, like a diagram you made elsewhere. You get back an editable PowerPoint file, a PNG of every slide, a side-by-side of each slide in the browser and in PowerPoint, and the agent's own scores against a rubric.

## How it works

Three commands: setup once, new-deck to make a deck folder from your notes, and run-deck to build it. Inside run-deck, Codex plans the slides from the notes, picks a layout for each from a layout guide, writes the words and speaker notes, designs a look, and writes the slides as HTML. The build then checks every slide in a real browser, exports the PowerPoint, and renders it back to images. Codex looks at the images, scores them, and fixes what is wrong. It repeats until the build passes and every rubric line scores 4 or 5.

## What keeps the quality up

- A quality bar: PNGs of my best deck. Every new deck must match its level of finish, but not its look.
- A checker that fails a slide that is only text on a page, readable text under 24 px, cards that are mostly empty, and text that crosses the margin or has low contrast.
- Complex diagrams are built on their own first, checked, and then placed on the slide as an image, because agents do a poor job when they draw a complex diagram inline from a description.
- The agent may not change the build or the checker: run-deck stops if those files change.

## The hard part: the sandbox

Codex runs in a sandbox that can only write inside the deck folder. On Windows that sandbox stops it from starting Chrome, so it could not test its own edits. Each fix waited for a full round, and one test took 22 rounds and about 75 minutes. The fix is a build bridge: Codex asks for a build by writing a request file, run-deck builds it outside the sandbox in about 15 seconds, and Codex reads the result and keeps working in the same session. The request carries no commands, so the sandbox stays as strict as before.

## Where it stands

It works end to end on my PC from a fresh unzip, with gpt-5.6-terra. Layout variety still needs proof on more talks, and a diagram becomes a picture in PowerPoint, so it is not editable there. My ask: try it on your next talk, send me the brief and the PNGs, and tell me where the result falls short.
