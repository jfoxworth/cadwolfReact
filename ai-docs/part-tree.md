# AI on Part Tree pages

See [`README.md`](./README.md) first for how the assistant works in general. Part Tree pages
have by far the most AI capability in CadWolf — everything below Build mode's staged wizard is
unique to this page type.

## Modes

Same three modes as Document pages (Overview / Inspect / Build), with the same meaning:
Overview and Inspect are read-only (no tools to change the tree); only Build mode gets the
tools that can actually change anything. This is enforced by not giving the model those tools
in the other two modes, not just by instruction.

## Background concepts

- A **subsystem** is a folder-like grouping. A **part** is a physical component — a real
  document with its own equations. A **requirements document** is also a document, but marked
  as non-physical (excluded from mass/quantity rollups) — it holds the targets (a load limit, a
  safety factor, a tolerance) that other parts are meant to derive their own dimensions from.
- Parts reference a requirements document's values by **importing a variable** from it — a
  cross-document link, so a change to the requirement can flow into every part driven by it.

## Ad hoc tools (Build mode)

- **`create_file`**, **`rename_file`**, **`move_file`**, **`delete_file`** — the same one-off
  structural actions available on a Workspace page, scoped to the current tree. Deleting a
  subsystem deletes everything inside it; the assistant is expected to say so plainly before
  proposing it. These apply for real immediately on approval — there's no draft/Save step.
- **`search_documents`**, **`read_document`**, **`read_part_tree`**,
  **`find_similar_part_trees`** — lookups, available in every mode (including Overview/Inspect,
  since they don't change anything). `find_similar_part_trees` is a real structural/semantic
  similarity search across existing part trees, not name matching.

## Building a new system from scratch — the staged wizard

Asking to stand up a real new structure (not just add one part) runs through a dedicated,
UI-enforced 6-stage flow — a visible stage indicator, with real screens at each step, not just
the model being asked nicely to pause between them:

1. **Prompt** — describe what you want built.
2. **Candidate selection** — the assistant searches existing part trees for a close match and
   shows them as selectable cards. Pick one as a reference, or say none are close enough.
3. **Requirements review** — the assistant proposes which requirements documents the new system
   should have, pulled from the reference tree's own (if one was picked) and/or inferred from
   your request. If it finds none, it says so and asks if you'd like to add one, rather than
   silently skipping this.
4. **Tree proposal** — the full proposed structure (every subsystem, part, and requirements
   document, with a short description each) renders as a read-only preview with its own prompt
   box for requesting changes, before anything is created.
5. **Build** — a final confirm creates everything shown, as real files.
6. **Content generation** — a separate, non-conversational step right after Build: one AI call
   per document writes its real equations/text, and wires up the actual variable-import
   connections between parts and requirements documents (with the real computed value frozen in
   at the time). Requirements documents are generated and solved first, so their values exist
   before any part tries to import one. You see live per-document progress and can retry a
   failed one individually — this isn't something you converse with, just a progress list.

You can always jump back to an earlier stage via the stage indicator to change an earlier
decision (pick a different reference, adjust the requirements) without losing your place.

**Current limitation**: Stage 6 can only generate header, text, equation, and symbolic-equation
content — no if/else, slider, dropdown, plot, or image generation yet.
