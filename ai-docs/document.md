# AI on Document pages

See [`README.md`](./README.md) first for how the assistant works in general.

## Modes

A Document page has three modes, switched via the hexagon cluster:

- **Overview** — talk-only, about the document as a whole. No tools to change anything.
- **Inspect** — talk about (and ask to edit) one selected block specifically. Still read-only —
  no tools to change anything in this mode either.
- **Build** — the only mode where the assistant can actually propose changes.

This is real enforcement, not just an instruction: in Overview/Inspect the model simply isn't
given any editing tools, regardless of what's asked.

## Tools (Build mode)

Five tools, one per block type: **`equation_block`**, **`symbolic_equation_block`**,
**`text_block`**, **`header_block`**, **`if_else_block`**. Each one can either add a new block
or edit an existing one — which it does depends on whether a target block id is included, not
on which tool is called.

Approving a proposed block applies it immediately on the canvas (new blocks are summarized in
the chat; edits can be undone from their card) — but **this is still a draft**. Nothing is
actually saved until you click the document's own Save button, exactly as if you'd made the
same edit by hand.

**Not supported yet**: plots/charts, images, video, sliders, dropdowns, select blocks, for/while
loops, or cards. If asked to add or change one of these, the assistant should say so plainly and
point you to the document's own "Add" menu, rather than silently substituting something else.

## Searching beyond this document

**`search_documents`** is separate from the five block tools above — it's a lookup, not a
proposal. Use it for anything that needs content from *other* documents ("which document talks
about X," "what did I write about Y before"). It searches everything you have access to, not
just the current page.

## Selected-block context

If you have a block selected, the assistant is told which one, including its id and content.
It's treated as a strong hint about what "this"/"it" refers to — but if what you're asking
clearly doesn't match the selected block, the assistant should recognize that and act on what
you actually meant instead.
