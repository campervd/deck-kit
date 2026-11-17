# Briefs

A brief is plain notes on what you want to talk about. It is the usual way to start a deck. Give each brief its own folder:

```
briefs\<name>\<name>-brief.md
briefs\<name>\assets\          optional: images to use as given
```

Write:

- Who presents, the audience, and about how long the talk is.
- What you want them to take away.
- The points, stories and facts you want to cover, in any order and as loose as you like. Names, tools, numbers and dates must be right, because the agent uses only the facts you give it.
- Which screenshots or images you have, and what each shows. Put the real files in `briefs\<name>\assets\`: `new-deck.ps1` picks them up. A complex diagram you already made elsewhere usually looks better supplied this way than described in words.

No slide breaks, headlines, labels or speaker notes. The agent follows a structure from `standards\structures\` (a talk shape: slide types, order, rules), plans the slides in `outline.md`, picks a drawn layout for each from `standards/layout-guide.md`, and writes the slide text and the speaker notes in `content.md`.

One brief can have many content files, for example the same talk in two structures or lengths. They all live in `content\<name>\`, the folder with the brief's name. A different brief always gets its own content.

```powershell
powershell -ExecutionPolicy Bypass -File .\new-deck.ps1 -Name my-talk -Brief my-talk -Structure reflection-talk
```

The `example-*` folders are the kit's examples (see the README, "Examples").
