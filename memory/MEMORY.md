# CadWolf Project Memory

## Data Model

### Entity Types
- Root container: `type: "WORKSPACE"` (not "FOLDER" — "folder" is a reserved keyword in some contexts)
- `type: "FOLDER"` — subfolder within a workspace
- `type: "DOCUMENT"` — engineering calculation document with blocks
- `type: "DATASET"` — tabular data with datapoints
- `type: "PART_TREE"` — hierarchical part tree structure

### Query Pattern
Workspace page uses two separate queries:
1. Fetch workspace entity by id → single object (id, type, name, parentId, updatedAt)
2. Fetch items where parentId = workspace.id → flat array of child items

Children are NOT embedded inside the workspace entity in the DB response.

### Part Tree
Same lazy-load pattern as workspace: first query fetches the `PART_TREE` entity, second fetches direct children (flat array by parentId). Clicking a child loads its children the same way.

## Laravel Backend
Full reference: `memory/laravel-backend.md`
- Backend at `/Users/jfoxworth/sites/cadwolfOld/` (Laravel 5.x, Spark session auth)
- `files` table (file_type_id string: "Workspace"/"Document"/"Folder"/"PartTree") → `Item`
- `components` table (component_type_id int 1–16) → `Block`
- `datasets` + `datapoints` tables → `Dataset`

## AI Architecture
- `memory/project_ai_architecture.md` — vision, provider decisions (Claude + BYOK + on-premise), capability phases, open questions on requirements document UX

## Feedback / Rules
- `memory/feedback_no_autosave.md` — never auto-save blocks/equations on edit; only save on explicit user action

## Fixture Files
- `fixtures/workspace.json` — workspace entity + items query result (two top-level keys: `workspace`, `items`)
- `fixtures/document.json` — full document with blocks array
- `fixtures/dataset.json` — dataset with datapoints array
- `fixtures/part-tree.json` — part tree entity + direct children query result (same two-key pattern as workspace)
