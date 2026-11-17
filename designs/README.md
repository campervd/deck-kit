# Designs

Each folder is one reusable look, named after how it looks: `designs/<look>/design.md` holds its grid, color tokens, type, shapes, motif and slide patterns, in the sections of `standards/design-template.md`. Designs are not tied to a presentation.

| Design | Look | Used by |
|---|---|---|
| `cobalt-slate` | Slate navy and white, one cobalt-blue accent; Inter with Roboto Mono | no example deck. Given to every new design as `design-example.md`, for the level of detail; a new look must differ from it. |
| `navy-rust` | Deep navy and one rust accent on warm paper; Space Grotesk, IBM Plex Sans, IBM Plex Mono | `example-kit-talk` |
| `signal-room` | Ink navy and near-white, one violet signal accent; Space Grotesk, IBM Plex Sans, IBM Plex Mono | no example deck |

## Use a design

```powershell
powershell -ExecutionPolicy Bypass -File .\new-deck.ps1 -Name my-talk -Brief my-talk -Design navy-rust
```

The agent then keeps that look and only builds the slides. A design names the patterns of the talk it was first made for. A different talk reuses the patterns that fit, and the agent adds any it needs in the same style.

## Add a design

- From a finished deck: `powershell -ExecutionPolicy Bypass -File .\save-design.ps1 -Deck my-talk -As my-look`. Name it after the look (colors, type, mood), not after the talk.
- By hand: copy `standards/design-template.md` to `designs/<look>/design.md` and fill in every section. Every color needs a hex value in the token table, and the outer margin must be between 96 and 144 px, because the checker reads both.
