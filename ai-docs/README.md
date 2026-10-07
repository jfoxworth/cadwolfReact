# AI in CadWolf — overview

CadWolf has a built-in AI assistant ("April") embedded directly in the app. It's currently
gated to a single allow-listed user (`ALLOWED_CHAT_USER_ID`) — this is pre-launch/internal
functionality, not yet available to users generally.

April is direct and concise, uses the platform's own terminology, and is instructed to say
plainly when it can't do something on the current page rather than guess or fake it.

## How it works, in brief

Whatever page you're on, the chat panel sends your message along with a dump of that page's
current content (and, on Document/Part Tree pages, whatever block or item you have selected) so
April is answering about what you're actually looking at — not a generic conversation. The
assistant can reply with plain text, or with one or more tool calls that represent something it
wants to do or find.

Those tool calls fall into three kinds:

1. **Lookups** — `search_documents`, `read_document`, `read_part_tree`,
   `find_similar_part_trees`. These just find or read information; nothing is shown as a
   pending change, and nothing needs your approval.
2. **Proposals** — most other tools. These show up as a card (or a highlighted change on the
   canvas) and only take effect once you approve them.
3. **Structured checkpoints** — a couple of Part Tree-specific tools get their own dedicated
   screen instead of a proposal card. See `part-tree.md`.

`search_documents` deserves a special mention: it's a semantic search (via AI embeddings, not
keyword matching) across every document you have access to, not just the current page. It's
available on Document and Workspace pages. Dataset pages don't have it.

## Page-specific details

- [`document.md`](./document.md) — Document pages (equations, text, headers, etc.)
- [`part-tree.md`](./part-tree.md) — Part Tree pages, including the staged "build a new
  system from scratch" wizard
- [`workspace.md`](./workspace.md) — Workspace/folder pages
- [`dataset.md`](./dataset.md) — Dataset pages
