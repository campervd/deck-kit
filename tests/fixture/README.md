# Test deck for tests\hardening.ps1

A three-slide deck, built and passed by the kit (navy-rust design), kept here as source only: `deck.html`, `content.md`, `design.md`, `brief.md` and two diagram specs in `diagrams\` (one lane diagram, one flow). `hardening.ps1` copies it to `decks\zz-hardening-*`, adds the fonts and the build command as `new-deck.ps1` would, builds it, and removes the copies.

Don't edit it unless the build's rules change; after any edit, run `hardening.ps1` and make sure that tests 1 and 2 still pass.
