# Structures

A structure is a reusable content pattern: which kinds of slides a talk has, in what order, and the rules that keep it working. It sits between the brief and the content:

```
brief  ->  structure  ->  content  ->  deck (content + design)
```

- The **brief** says what the person wants to say.
- The **structure** says how the talk is built: slide types, order, rules. It holds no words of any one talk.
- The **content** is the slide text and speaker notes for one brief, written in one structure. It names both at the top.
- The **deck** is one content file plus one design (`designs/`).

The same structure serves many talks. The same brief can be written in several structures, which gives several content files. A different brief always gets different content.

| Structure | Use it for | Example |
|---|---|---|
| `reflection-talk` | A personal account: where I started, what I learned, what I built, what went wrong, what I ask of you. | none yet |
| `tool-walkthrough` | Showing a tool or process: the need, the contract, how it works, what keeps it safe, the hard part, the ask. | `example-kit-talk` |

## Use one

- From a brief: `new-deck.ps1 -Name <name> -Brief <brief> -Structure reflection-talk`. The agent writes the content in that structure.
- Without `-Structure`, `new-deck.ps1` copies every structure into the deck's `structures\` folder. The agent picks the one that fits the brief, copies it to `structure.md` and names it at the top of the content. It picks none only if none fits, and then follows the general rules in `layout-guide.md`. After the deck is done, `save-content.ps1` records the choice in the deck's `deck.json`.
- The brief's length always wins: when it asks for fewer slides than a structure lists, the agent uses that structure's **Short version**.

## Add one

Copy a structure file, keep its sections (**When to use**, **Slides**, **Short version**, **Rules**), and describe slide types and order without the words of any one talk. Give it a name that says what kind of talk it is.
