---
name: CadWolf AI Architecture
description: Vision, implementation decisions, and open questions for CadWolf AI integration
type: project
---

# CadWolf AI Integration — Architecture & Decisions

## Core Value Proposition

CadWolf is not primarily a knowledge store or a training data source for AI. It is a **structured execution environment** — a runtime for engineering calculations. The AI generates structure; the solver validates whether the engineering is correct. That validation is the moat.

- Raw NASA docs: AI knows *that* von Mises stress determines yield. Unreliable about computing it correctly.
- CadWolf part tree: AI has a working, solver-validated instance. Generating a variant means pattern-matching on structure, not re-deriving physics.

An AI can learn engineering from reading documentation alone, but it cannot *verify* outputs without a solver. CadWolf provides the feedback loop that makes AI-generated engineering trustworthy rather than just plausible.

---

## What the AI Does

The AI does **pattern recognition and structure generation** — not engineering. The engineering is in the templates. The solver validates correctness. Think of it as: AI is the drafter, templates are the senior engineer's prior work, the solver is the checker.

The AI creates the part tree and all documents inside it in a single operation, by generating a serialized JSON structure that deserialization turns into live database records.

---

## Capability Phases

### Phase 1 — Chat Assistant (1–2 days to implement)

A floating chat panel available within a document. Sends the current document's blocks + a system prompt (CadWolf function library, syntax rules) with each message. Streams Claude's response back.

**Mode 1 (day 1):** Text responses only. User asks "what analysis should I do on this rod under 50 kN axial load?" — AI explains what's needed and writes equations in CadWolf syntax.

**Mode 2 (incremental upgrade):** AI responds with plain-language explanation + a JSON array of blocks to insert. Frontend shows "Add these blocks to document?" button. On confirm, inserts as virtual blocks. Solver runs. Engineer reviews and saves if correct.

This is the first and fastest feature. The solver is completely independent of the chatbot — they share nothing.

### Phase 2 — Part Tree Generation

AI generates a complete serialized part tree from a user prompt + template examples. User sees a new part tree appear in their workspace. Solver validates everything automatically.

### Phase 3 — Requirements / Verification System (architecture TBD — see open questions)

Documents classified by type: Requirements, Analysis, Verification. Assert blocks compare solver results against requirements. Part tree view shows pass/fail rollup per document.

---

## Technical Decisions Made

### Provider: Claude (Anthropic)
Start with Claude Sonnet for chat — quality matters for the demo and early users. Do not optimize for cost before there is revenue.

### Provider abstraction (switchable)
All product code calls a thin wrapper:
```typescript
async function chatCompletion(messages: Message[]): Promise<string> {
  return anthropic.messages.create({ model: "claude-sonnet-4-6", messages });
}
```
Switching providers is a one-line config change. This enables future migration to open-source models (Llama, Mistral) or other frontier models without refactoring.

### BYOK — Bring Your Own Key
Users can paste their own Anthropic API key in account settings. When set, their key is used instead of the platform key. Their token costs, not ours. Preferred by enterprise customers for data residency reasons. Implement from day 1.

### Enterprise / on-premise deployment
Large aerospace/defense primes will not send ITAR-controlled calculations to a third-party API. Support options:
- **AWS Bedrock / Azure OpenAI / Google Vertex** — frontier models within the customer's own cloud account, data never leaves their environment, they still pay per token under their own contract
- **Anthropic enterprise agreements** — direct relationship between customer and Anthropic for private deployment
- **Self-hosted open-source models** — customer runs their own GPU servers, no per-token cost, capability tradeoff

The provider abstraction above handles all of these. "We support on-premise deployment for enterprise customers" is a selling point, not a cost problem. Enterprise customers pay a higher license fee; their AI costs are their own.

### Cost profile (Claude Sonnet)
Typical 10-message chat session: ~$0.15–0.25. At $20/month subscription, a heavy user (20 sessions/month) costs ~$4 in API fees — ~20% of revenue. Average user is well under that. Gate AI features behind paid tier or usage cap on free tier.

---

## Open Questions

### Requirements document UX
How exactly a requirements document interacts with the user and the AI to dictate solution requirements is still being worked out. Current thinking:

- Requirements document: equation blocks only — named values (design loads, material properties, FoS limits). No calculations.
- Analysis documents: normal CadWolf documents, import from requirements doc.
- Verification document: assert blocks only — compare analysis results against requirements, show pass/fail table.
- Part tree view: green/red status per document rolled up from assert results.

The open question is the UX flow: does the user designate a document as "Requirements" explicitly? Does the AI automatically treat a requirements doc as implicit context when generating analysis documents? How does the engineer communicate requirements to the AI generation prompt?

This is not yet implemented. The `ASSERT` block type and document type classification (`documentType` field) are the next implementation steps when this work begins.
