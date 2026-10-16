# CadWolf — Outstanding Work

---

## Priority 1: Blocking / Security

- [x] **Password reset / forgot password** — implemented via Resend; needs `RESEND_API_KEY` set in production env
- [x] **Admin role enforcement** — `/admin` now checks `ADMIN_EMAILS` env var (comma-separated); redirects to `/` if not listed
- [x] **Loop solver implementation** — implemented in `solver/worker/document-solver.ts` (`solveLoop`, `solveWhileLoop`, `solveIfElse`); stub files in `solver/structures/` are dead code

---

## Priority 2: Core Missing Features

### Payments / Billing

- [x] Install Stripe SDK
- [x] Add `stripeCustomerId` + `stripeSubscriptionId` to User and Team DB models
- [x] Create `/api/stripe/checkout` route
- [x] Create `/api/stripe/portal` route (manage subscription)
- [x] Create `/api/webhook` route for Stripe events
- [x] Create `/api/stripe/seats` route (adjust business seat count)
- [x] Build pricing / upgrade UI page (`/pricing`)
- [x] Build billing management page (`/billing`)
- [ ] **Image upload feature** — build `/api/upload` endpoint (S3 or similar), enforce tier gate (free users blocked, pro/business allowed), track `storageUsed`, enforce `storageQuota` before accepting; surface upload UI in image block and workspace
- [ ] Enforce tier-based feature gates in API (tier field exists but is never read) — blocked on image upload above

### User Account

- [x] Email change flow — inline form on profile page; sends confirmation email to new address; `/confirm-email-change` page processes token
- [x] Account deletion — "Delete Account" section on profile page; requires password + typing DELETE; wipes all user data
- [x] Email verification on registration — sends link on register; banner shown in app layout until verified; OAuth users auto-verified
- [ ] Unlink Google / Facebook OAuth accounts (Onshape + Fusion have disconnect; Google/Facebook don't)
- [x] Team invitations — token-based invite email flow; pending invites shown on teams page; accept/decline/revoke all implemented

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
- [x] Public / shareable links — permissions work for named users/teams but no anonymous link sharing

### Part Tree

- [x] Part tree CRUD API — only `/api/part-tree/equation-values` exists; no create/update/delete/browse routes
- [ ] **Onshape live-fetch on document load** — `documentWrapper.tsx` fires a `useEffect` that fetches mass properties from Onshape on every page load when CAD connections exist; evaluate whether this should remain, be moved to on-demand, or be cached differently

---

## Priority 4: Solver Gaps

- [ ] **Fourier transform** (`solver/functions/signal/fourier.ts`) — stub returns only real part, not complex
- [ ] **`parseDate`** (`solver/functions/utility/parse-date.ts`) — stub returning 0
- [ ] **`squash`** (`solver/functions/linear-algebra/squash.ts`) — stub returning 0
- [ ] **Unit cancellation leaves a spurious leftover unit for `A / (B * C)`** when `B` and `C` are
      both unit-bearing and the combination spans three independent base dimensions (mass,
      length, time) at once — even though the numerically identical computation done as
      sequential single divisions (`A / B / C`), or with `B * C` pre-resolved into its own named
      variable first, cancels correctly. Repro (via `solver/worker/document-solver.ts`'s
      `solveDocument`, confirmed same numeric value either way, only the reported `units` differ):
      `G = 79.3GPa; d = 2mm; D_mean = 18mm; F = 80N; delta_target = 8mm; k_target = F / delta_target`
      then `(G * power(4,d)) / power(3,D_mean) / k_target` → `units: ""` (correct) vs.
      `(G * power(4,d)) / (power(3,D_mean) * k_target)` → `units: "m^3"` (wrong, should also be
      `""`). Worked around for now in the spring-sizing document (`ai-docs`/Claude Artifact
      content, not app code) by stripping operands to plain SI numbers before dividing and not
      reattaching a unit (since the result is genuinely dimensionless) — not a real fix.
- [ ] **A bare unit suffix is silently dropped after a scientific-notation literal with no
      space** (`250e6Pa`, `2.5e8Pa`) — the numeric value still comes out correct (magnitude is
      unaffected), but `units` comes back `""` instead of `"Pa"`, so every equation downstream
      that uses the value inherits wrong (not just missing) units. The same literal works
      correctly with a space before the unit (`250e6 Pa`), and a non-scientific literal with no
      space also works (`250000000Pa`) — only the no-space scientific-notation combination fails.
      Repro via `runPipeline(ctx("x = 250e6Pa"))` (`solver/pipeline.ts`) vs.
      `runPipeline(ctx("x = 250MPa"))` — same `real` value, but `units: ""` vs. `units: "Pa"`.
      Surfaced by an AI-generated document (`generate-document/route.ts`'s content-generation
      model) writing `allowable_stress = 250e6Pa`; worked around for now by telling the Stage 6
      prompt to avoid scientific notation in equations, not a real fix to the tokenizer.

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
