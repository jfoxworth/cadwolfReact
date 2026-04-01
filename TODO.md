# CadWolf Rebuild — TODO

## Post-Rebuild Cleanup

- [ ] **Audit block content structure** — review what each block type actually needs in `definition` and strip out the large legacy fields (e.g. `Page_lastposition`, `marginbottom`, `showClass`, `renderTo`, `isConnectedEquation`, etc.) that are saved back to the DB on edit but serve no purpose in the new system. Update the `PUT /api/component/[id]` handler and client-side save logic to only persist the minimal fields each block type requires.

## Auth

- [ ] Replace `canEdit = true` stub in document/workspace/dataset pages with real session-based permission checks

## Saves / Mutations

- [ ] Wire up document `onDefinitionChange` / `onBlocksChange` to `PUT /api/component/[id]`
- [ ] Wire up dataset edits to `PUT /api/datapoint/[id]` and `POST /api/datapoint`
- [ ] Wire up workspace renames / deletes to file API routes

## Other

- [ ] Deployment — set `DATABASE_URL` in Heroku/production environment
