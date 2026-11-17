# Content

Finished slide text: the exact words per slide and the speaker notes, used as written. Most decks start from a brief instead (see `briefs\README.md`); use this only if you already have the words.

Content belongs to one brief. It lives in the folder with that brief's name, and one brief can have several content files:

```
content\<brief>\<brief>-content.md
content\<brief>\<brief>-short-content.md     another version of the same talk
```

A different brief always gets different content: `new-deck.ps1` refuses a content file that names one brief but lives in another brief's folder.

Format:

- `# Talk title` on the first line.
- Then two header lines: `Brief: briefs/<brief>/<brief>-brief.md` (the brief must exist) and `Structure: standards/structures/<name>.md` (or `Structure: none`).
- One `## Slide N` section per slide, in order.
- Inside each slide, labeled lines such as `Label:`, `Title:`, `Headline:`, `Subtitle:`, `Statement:`, `Caption:`, `Callout:`, `Steps:`, `Diagram:` and `Closing line:`. Use the ones a slide needs.
- Bullets with `-` for lists.
- A line in square brackets, for example `[Screenshot: the sign-in page]`, becomes a placeholder box with that caption.
- `Speaker notes:` with the notes for that slide.

Keep each slide short. The checker warns about content slides with more than 60 words.

```powershell
powershell -ExecutionPolicy Bypass -File .\new-deck.ps1 -Name my-talk -Content my-talk
```

When a deck starts from a brief, the agent writes this same format itself, as `decks\<name>\content.md`. Keep it with `save-content.ps1 -Deck <name>`: it goes to `content\<brief>\`, and the deck's `deck.json` then points at it. The `example-*` folders are the kit's examples (see the README, "Examples").
