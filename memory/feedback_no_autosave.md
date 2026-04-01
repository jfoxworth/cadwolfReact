---
name: Do not auto-save on every edit
description: Document blocks/equations must NOT be saved on every keystroke or change — only save when the user explicitly saves
type: feedback
---

**Rule:** Never implement or leave in place logic that saves document blocks, equations, or any content on every edit/change.

**Correct behavior:**
1. User opens document — downloads the saved version from DB
2. User edits locally — all changes stay in local state only
3. User explicitly saves (clicks Save button or similar) — only then write changes to DB

**What to avoid:** Any `useEffect`, `onChange`, debounce, or API call that persists block content to the server as the user types or immediately after a change.
