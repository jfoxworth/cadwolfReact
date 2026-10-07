# AI on Dataset pages

See [`README.md`](./README.md) first for how the assistant works in general.

## No modes, and no document search

Like Workspace pages, there's no mode switcher. Dataset pages are also the one page type
**without** `search_documents` — the assistant here can't look outside the current dataset.

A dataset's content is really just one raw text blob; "columns" only exist via whatever parser
configuration splits that blob into rows/values.

## Tools

- **`configure_dataset_parsers`** — propose how the raw text should be split into rows/columns.
  Useful when the data clearly doesn't match the current parser setup.
- **`edit_dataset_content`** — propose replacing the dataset's entire raw content. There's no
  smaller edit primitive (no "fix one row/value") — this always replaces everything, same as
  the page's own Input tab. **Caveat**: the assistant only ever sees a capped preview of the
  data. If there's more than that preview shows, it won't attempt a full replace by guessing at
  the unseen rows — doing so would silently discard them.
- **`edit_dataset_metadata`** — propose changing the title and/or description.

`configure_dataset_parsers` and `edit_dataset_content` both update the page immediately but
**do not save** — you still need to click the page's own Save button. `edit_dataset_metadata`
is different: it applies for real immediately, matching the page's existing Edit Title/Edit
Description actions.
