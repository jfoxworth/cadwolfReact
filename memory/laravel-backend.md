# Laravel Backend Reference (cadwolfOld)

Backend lives at `/Users/jfoxworth/sites/cadwolfOld/`. Laravel 5.x, session-based auth via Laravel Spark.

---

## Tables

### `files` → maps to Workspace / Document / Folder / PartTree

| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| user_id | int FK users | owner |
| team_id | int FK teams | nullable |
| file_type_id | string | **"Workspace", "Document", "Folder", "PartTree"** (string, not int) |
| name | string | |
| item_data | text (JSON) | arbitrary metadata blob — checkout status, description, width, etc. |
| order | int | sibling ordering |
| version | int | default 1 |
| _lft, _rgt, parent_id | int | NestedSet (Kalnoy) for hierarchy |
| needs_update | bool | |
| deleted_at | timestamp | soft delete |
| created_at, updated_at | timestamps | |

**file_type_id string values** (confirmed in FileController.php):
- `"Workspace"` — root container
- `"Document"` — engineering calculation doc
- `"Folder"` — subfolder within workspace
- `"PartTree"` — part hierarchy
- `"Dataset"` is NOT stored in `files` — it has its own table (see below)

---

### `components` → maps to Block

| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| file_id | int FK files | parent document |
| itemid | string | legacy UUID-style ref id (maps to block.refId) |
| name | string | nullable |
| component_type_id | int FK component_types | see type IDs below |
| content | text (JSON) | block definition data |
| dependent_id | string | nullable, for imported equations |
| dependent_file | string | nullable, for imported equations |
| order | int | ordering within document |
| inEdit | int | 0=committed, 1=in edit (checkout pattern) |
| version | int | |
| deleted_at | timestamp | soft delete |

**component_type_id → BlockType mapping** (seeded in order, IDs start at 1):

| id | name | BlockType |
|----|------|-----------|
| 1 | Text | TEXT |
| 2 | Header | HEADER |
| 3 | Equation | EQUATION |
| 4 | Symbolic | SYMBOLIC_EQUATION |
| 5 | Table | (legacy, unused?) |
| 6 | ForLoop | FOR_LOOP |
| 7 | WhileLoop | WHILE_LOOP |
| 8 | IfElse | IF_ELSE |
| 9 | Plot | PLOT |
| 10 | Image | IMAGE |
| 11 | Video | VIDEO |
| 12 | LineBreak | LINE_BREAK |
| 13 | Surface | SURFACE_MAP |
| 14 | Slider | SLIDER |
| 15 | Card | (unknown) |
| 16 | freeBodyDiagram | (unknown) |

---

### `datasets` → maps to Dataset (metadata only)

| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| user_id | int FK users | |
| team_id | int FK teams | nullable |
| name | string | |
| description | string | |
| order | int | |
| _lft, _rgt, parent_id | int | NestedSet (datasets can be nested) |
| deleted_at | timestamp | soft delete |

**Note:** No parsers or rawText stored in `datasets` table — the actual data lives in `datapoints`.

---

### `datapoints` → rows/entries belonging to a dataset

| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| dataset_id | int FK datasets | |
| datapoint_type_id | int FK datapoint_types | |
| content | string | the actual value |
| order | int | |
| deleted_at | timestamp | soft delete |

---

## API Endpoints & Response Shapes

### Files (Workspace/Document/Folder)

```
GET  /file/{id}           → { data: { file: File } }
GET  /file/{id}/children  → File[]  (direct descendants, latest version only)
GET  /file/{id}/components → { components: Component[] }  (blocks for a document)
POST /file                → creates new file, returns File
PUT  /file/{id}           → update file
DEL  /file/{id}           → soft delete

GET  /file/workspaces/{userId} → File[]  (user's root workspaces)
```

### Components (Blocks)

```
GET  /component/{id}      → { data: { component: Component } }
POST /component           → { created: true, id: N }
PUT  /component           → { update: "success" }  (body params, not URL id)
DEL  /component/{id}      → { deleted: "trueashell" }
POST /component/move      → { move: "success" }
```

### Datasets

```
GET  /dataset/{id}        → { data: { dataset: Dataset } }
GET  /dataset/{id}/children → { data: { datasets: Dataset[] } }
GET  /dataset/{id}/datapoints → { data: { datapoints: Datapoint[] } }
POST /dataset             → { created: true, id: N }
PUT  /dataset/{id}        → Dataset[]
DEL  /dataset/{id}        → { deleted: true }
```

### Datapoints

```
GET  /datapoint/{id}      → { data: { datapoint: Datapoint } }
POST /datapoint           → { created: true, id: N }
PUT  /datapoint/{id}      → update
DEL  /datapoint/{id}      → { deleted: true }
```

---

## Key Mapping: Laravel → TypeScript Types

### File → Item
```
file.id            → item.id
file.file_type_id  → item.type  (e.g. "Workspace" → "WORKSPACE")
file.name          → item.name
file.parent_id     → item.parentId
file.user_id       → item.ownerId
file.version       → item.version
file.created_at    → item.createdAt
file.updated_at    → item.updatedAt
file.item_data.*   → item.description, item.width, etc. (JSON blob)
```

### Component → Block
```
component.id               → block.id (as string)
component.itemid           → block.refId
component.component_type_id → block.type (via ID→name mapping above)
component.content          → block.definition (JSON parsed)
component.order            → block.order
```

### Dataset → Dataset
```
dataset.id          → dataset.id (as string)
dataset.name        → dataset.name
dataset.description → dataset.description
dataset.parent_id   → dataset.parentId
dataset.user_id     → dataset.ownerId
dataset.created_at  → dataset.createdAt
dataset.updated_at  → dataset.updatedAt
datapoints          → need to reconstruct parsers + rawText from datapoints
```

---

## Auth
- Session-based via Laravel Spark (cookie)
- CORS config needed for local dev: `config/cors.php` (or equivalent middleware)
- For API calls from Next.js: `credentials: "include"` on fetch + matching `Access-Control-Allow-Origin`

---

## Checkout Pattern (Documents)
Documents use a checkout system: `inEdit=1` means "currently being edited".
The `isCheckedOut()` method checks if `item_data.checkout_id` matches current user.
Components where `inEdit=0` are the committed (read-only) version; `inEdit=1` are the draft.
When fetching components, the API returns only the appropriate `inEdit` version.
