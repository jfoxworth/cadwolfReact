# CadWolf — Outstanding Work

---

## Priority 1: Blocking / Security

- [x] **Password reset / forgot password** — implemented via Resend; needs `RESEND_API_KEY` set in production env
- [x] **Admin role enforcement** — `/admin` now checks `ADMIN_EMAILS` env var (comma-separated); redirects to `/` if not listed
- [x] **Loop solver implementation** — implemented in `solver/worker/document-solver.ts` (`solveLoop`, `solveWhileLoop`, `solveIfElse`); stub files in `solver/structures/` are dead code

---

## Priority 2: Core Missing Features

### Payments / Billing
- [ ] Install Stripe SDK
- [ ] Add `stripeCustomerId` + `stripeSubscriptionId` to User and Team DB models
- [ ] Create `/api/stripe/checkout-session` route
- [ ] Create `/api/stripe/portal` route (manage subscription)
- [ ] Create `/api/webhook` route for Stripe events
- [ ] Enforce storage quota in file upload endpoints (quota fields exist but nothing checks them)
- [ ] Enforce tier-based feature gates in API (tier field exists but is never read)
- [ ] Build pricing / upgrade UI page
- [ ] Build billing management page

### User Account
- [ ] Email change flow (currently read-only with no mechanism)
- [ ] Account deletion (no UI or API endpoint)
- [x] Email verification on registration — sends link on register; banner shown in app layout until verified; OAuth users auto-verified
- [ ] Unlink Google / Facebook OAuth accounts (Onshape + Fusion have disconnect; Google/Facebook don't)
- [ ] Team invitations — DB model (`OrgInvite`) exists, no send/accept API or UI

---

## Priority 3: Platform Features

### Search
- [ ] Global full-text search across workspaces and documents
- [ ] Search by variable name across workspaces

### Export
- [ ] PDF export of documents
- [ ] CSV export of datasets
- [ ] JSON export

### Document
- [ ] Version history UI — API exists (`/api/file/[id]/versions`) but never surfaced in the UI
- [ ] Public / shareable links — permissions work for named users/teams but no anonymous link sharing

### Part Tree
- [ ] Part tree CRUD API — only `/api/part-tree/equation-values` exists; no create/update/delete/browse routes

---

## Priority 4: Solver Gaps

- [ ] **Fourier transform** (`solver/functions/signal/fourier.ts`) — stub returns only real part, not complex
- [ ] **`parseDate`** (`solver/functions/utility/parse-date.ts`) — stub returning 0
- [ ] **`squash`** (`solver/functions/linear-algebra/squash.ts`) — stub returning 0

---

## Priority 5: Nice to Have

- [ ] Two-factor authentication
- [ ] Real-time collaboration (WebSocket / live cursors)
- [ ] In-app notification system
- [ ] Email notifications (document shared, comment added, etc.)
- [ ] Activity / audit log
- [ ] Bulk operations (move/copy/delete multiple workspace items)
- [ ] Rate limiting on auth endpoints
- [ ] Login activity log

---

## Old Items (from pre-rebuild TODO)

- [ ] **Audit block content structure** — review what each block type actually needs in `definition` and strip out large legacy fields (`Page_lastposition`, `marginbottom`, `showClass`, `renderTo`, `isConnectedEquation`, etc.) that are saved back to DB on edit but serve no purpose in the new system
- [ ] **Deployment** — set `DATABASE_URL` and all env vars in production environment
