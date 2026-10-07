# AI on Workspace pages

See [`README.md`](./README.md) first for how the assistant works in general.

## No modes

Unlike Document and Part Tree pages, there's no Overview/Inspect/Build switcher here — just a
single always-available assistant, since a workspace is a flat file listing with nothing to
"select" the way a block or tree item can be.

## Tools

- **`create_file`** — add a new Document, Dataset, or nested folder to the current workspace.
- **`rename_file`** — rename an item in the current workspace.
- **`move_file`** — move an item into a nested folder within the current workspace.
- **`delete_file`** — delete an item. Requires **admin** permission specifically (stricter than
  the other three, which only need edit), and deleting a folder deletes everything inside it —
  the assistant is expected to call this out before proposing it.
- **`search_documents`** — a lookup, not a proposal; searches every document you have access
  to, not just this workspace. For questions about this workspace's own direct contents, the
  assistant just answers from what it's already been given — no tool call needed.

All four structural tools **apply for real immediately** on approval — there's no draft/Save
step for a workspace's file list, unlike Document pages.

**Not supported**: creating a new root workspace, or a part tree, through chat.
