# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

CadWolf is a web-based engineering calculation platform. Engineers write, solve, and share calculation documents made of ordered blocks (equations, sliders, datasets, plots, loops, if/else, etc.) that solve in sequence with full unit awareness and symbolic math support. Documents can link to CAD assemblies (Onshape, Autodesk Fusion) so model parameter changes flow into the calculation.

The full platform reference used to prompt the CadWolf AI assistant is publicly served at `/ai-context` (`app/ai-context/page.tsx`) — it documents built-in functions, the unit system, constants, and solver behavior in detail beyond what's summarized here.

## Commands

```bash
pnpm dev                    # start dev server (localhost:3000)
pnpm build                  # production build
pnpm lint                   # eslint
pnpm test                   # run solver test suite once (vitest run)
pnpm test:watch             # vitest watch mode
pnpm prisma migrate deploy  # apply DB migrations
```

Run a single test file or test case with vitest directly:

```bash
pnpm vitest run solver/__tests__/basic/abs.test.ts
pnpm vitest run -t "test name substring"
```

Tests only cover `solver/__tests__/**/*.test.ts` (see `vitest.config.mts`) — there is no test suite for the Next.js app/API layer. When adding or changing a function in `solver/functions/`, update `solver/__tests__/TEST_CATALOG.md` to match (its own header says to keep it in sync).

## Architecture

### Two halves of the app

1. **Next.js app** (`app/`, `components/`, `utils/`, `context/`, `lib/`) — App Router, React Server Components, Prisma/PostgreSQL, auth, CAD integrations, billing.
2. **Solver** (`solver/`) — a standalone, framework-free calculation engine that runs in a Web Worker in the browser. It has no dependency on Next.js/React/Prisma and is tested in isolation with vitest.

### Solver pipeline

`solver/pipeline.ts` runs a single equation string through an ordered array of ~35 pure steps (`solver/steps/01-*.ts` through `36-*.ts`, numbered by execution order) against a `SolveContext` (`solver/types.ts`). Each step takes and returns a `SolveContext`; the pipeline stops early if `ctx.errors` is non-empty. Broadly the steps: parse the raw equation string → substitute variables/constants/CAD values/matrices/tables → tokenize and check for errors → convert to postfix and evaluate with unit propagation → recompose units and format the result for display (LaTeX equation, solution, numerical/units/dimensions/quantities models).

`solver/worker/document-solver.ts` is the orchestration layer built on top of the pipeline: it solves a whole document's blocks in order (`solveDocument`), and separately implements the control-flow block types — `solveLoop` (for loop), `solveWhileLoop`, `solveIfElse` — that call back into the pipeline per iteration/branch. The stub files under `solver/structures/` (`for-loop.ts`, `while-loop.ts`, `if-else.ts`) are dead legacy code; the real implementations live in `document-solver.ts`. `solver/worker/worker.ts` is the actual Web Worker entry point that dispatches `SOLVE_DOCUMENT` / `SOLVE_LOOP` / `SOLVE_IF_ELSE` / `SOLVE_WHILE_LOOP` messages to it.

Built-in functions callable from equations live under `solver/functions/<category>/` (basic, trig, log, calculus, linear-algebra, matrix, numerical, probability, signal, stats, data, fitting, utility). The unit system (SI base-unit vectors, prefixes, compound unit parsing, constants) lives under `solver/units/`.

Matrices are represented sparsely everywhere in the solver: `{ "row-col": value }`, with scalars as `{ "0-0": value }`.

### Data model: everything is a `File` in a tree

Workspaces, folders, documents, datasets, and part trees are all rows in the single `File` model (`prisma/schema.prisma`), distinguished by `fileTypeId` (`"Workspace"`, `"Folder"`, `"Document"`, `"Dataset"`, `"PartTree"`, `"Image"`, ...). The tree is stored as a nested set (`_lft`/`_rgt` columns, mapped to `lft`/`rgt`) plus `parentId`, so ancestor/descendant queries can use the lft/rgt range instead of recursive lookups. `FileVersion` holds JSON snapshots for check-ins and part-tree snapshots; `Component` holds the actual block/content data for a file, keyed by `componentTypeId`.

`utils/resolveRoute.ts` resolves a URL's path segments to a `File` row for the four content routes (workspace/document/dataset/part-tree), trying in order: numeric id, nanoid slug, then username (for workspace root), then a case-insensitive name-path walk scoped to the owning user. `middleware.ts` is a no-op passthrough — auth for these routes is enforced per-page via `getSessionUserOrNull()`, which redirects to `/login` only when the resolved file is not public (see below).

### Permissions

`utils/checkPermission.ts` implements the permission model: each `File`'s `itemData` JSON can set `viewPerm`/`editPerm`/`adminPerm` to `"everyone"`, `"inherit"`, or `"list"`. `"inherit"` walks up `parentId` recursively; `"list"` checks `FilePermission` rows (grantable to a user or a team, via `TeamMember`) against a level hierarchy (view < edit < admin). File owners always have full access. New root workspaces default to `viewPerm: "everyone"`, `editPerm`/`adminPerm: "list"` with an admin grant for the owner (`initRootWorkspacePermissions`).

### Auth

Custom session-based auth via `iron-session` (`utils/session.ts`, `utils/getSessionUser.ts`: `getSessionUser()` throws if unauthenticated, `getSessionUserOrNull()` returns null). OAuth login/callback/disconnect routes exist per-provider under `app/api/auth/{google,facebook,onshape,fusion}/`. Onshape and Fusion connections are also used for live CAD data (`utils/onshape.ts`, `utils/fusion.ts`, `utils/cadAuth.ts`), separate from login OAuth, and are tracked in the `CadConnection` model.

### AI chat assistant

`app/api/chat/route.ts` streams responses from the Anthropic API. The system prompt and tool set both vary by page type (`document`/`dataset`/`part-tree`/`workspace`, derived from the requesting page's path): `prompts/_shared.md` plus a page-type-specific file (`prompts/document.md`, etc.) form the system prompt, and `TOOLS_BY_PAGE_TYPE` (`app/api/chat/tools.ts`) selects the tool array. Only Document pages currently have real tools and page-context wiring (`components/document/documentWrapper.tsx`); other page types get a generic prompt and no tools. The requesting page's path/content is injected into the first user message for context. Currently gated to a single allow-listed user via `ALLOWED_CHAT_USER_ID` (still pre-launch/internal).

### Document blocks

Each block type in a document has its own component under `components/document/blocks/<type>/` (equation, symbolicEquation, slider, plot [with per-chart-type subfolders], dataset-driven card, forLoop, whileLoop, ifElse, image, video, text, header, dropdown, selectBlock, lineBreak). `components/document/documentWrapper.tsx` is the top-level document runtime that wires blocks to the solver worker.

### Billing

Stripe-based billing (`utils/stripe.ts`, `app/api/stripe/{checkout,portal,seats}/route.ts`, `app/api/webhook/route.ts`) drives per-user and per-team tiers (`User.tier`, `Team.tier`: free/pro/business) and storage quotas (`storageUsed`/`storageQuota` in bytes). Tier gating in the API is not yet wired up in most places — see `TODO.md`.

## Notes from TODO.md worth knowing before touching related code

- Loop/if-else/while-loop solving is implemented in `solver/worker/document-solver.ts`; the files in `solver/structures/` are dead stubs, not the real implementation.
- `solver/functions/signal/fourier.ts`, `solver/functions/utility/parse-date.ts`, and `solver/functions/linear-algebra/squash.ts` are known stubs with incomplete/placeholder implementations.
- Tier-based feature gating (`User.tier`/`Team.tier`) exists in the schema but is largely unread by the API.
