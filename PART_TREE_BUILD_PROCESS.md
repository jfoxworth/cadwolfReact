# Part Tree Build Process (AI)

This document describes the **intended** process by which the AI builds a part tree from a user's prompt. It is the roadmap. Update it whenever the intended process changes or a step is built.

## Core idea

The main coordinator does not run for the whole build or hold the state. It writes a **design document** for each system and each part. Each agent starts from one such document, does its job, and writes its results back. The documents are the handoff between steps, and afterwards they are the record we read to see what the AI was thinking and how to improve it.

## Process

0. **Design documents.** One for each system and one for each part, plus a root one for the whole build. They are written in the app's normal document format (text and equation blocks), and they must:
   - never be vectorized or embedded;
   - be overwritable when a step is re-run, and deletable;
   - stay small (a size limit enforced by the prompt and by code).
1. **Requirements documents.** The user creates requirements documents in the part tree. Their components are labeled as requirements.
2. **Prompt.** When the requirements documents (and any folder structure) are set up, the user enters a prompt describing the system they want.
3. **Kickoff.** The prompt starts the coordinator.
4. **Read requirements.** The coordinator reads the requirements documents and records every numerical and text requirement. Numerical ones are recorded as they are; text ones may be summarized by an agent.
5. **Find a guide.** The coordinator runs the RAG search for similar part trees, presents any matches, and the user may pick one as a guide.
6. **Initial intentions.** The coordinator writes the root design document: the systems and parts it expects, the inputs of each part, what drives each part's design, and where this differs from the chosen guide.
7. **Populate systems.** For each system, an agent reads that system's design document and populates the system with parts and/or sub-systems. It writes a design document for every child it creates, whether a sub-system or a part. When it finishes, it adds a summary of what it did to its own system's document.
8. **Build parts.** For each part, an agent reads the part's design document and designs the part. It adds a summary of the result to the document.
9. **Review.** After all parts are done, the system checks each part and system: the right requirements were applied, the metrics are met, and so on.

Order: an agent runs only when the inputs its document lists already exist.

## What the design documents contain

**System document**
- purpose
- requirements that apply, copied in with the id of the source block (inherited ones included)
- inputs from sibling systems
- the parent's context
- the guide tree, if one was picked
- the list of children
- reasoning: why these children, in what order
- results (filled in by the agent)

**Part document**
- function
- requirements that apply, with source ids
- inputs: source, variable, units
- outputs and the end calculations
- context from the parent and the user's prompt
- results (filled in by the agent)

## Open questions

- **User review.** Should the user review each system document before its agent runs? This would make the document the approval point.
- **Where the documents live.** They look like normal documents in the part tree, but they would need the same non-physical marking as requirements documents so they are left out of rollups. Which folder, and how they are shown, are not decided.
- **Who writes the part documents.** The agent for the parent system, or a coordinator for that system.
- **Number of agents.** How many agents, whether each system gets its own coordinator, and how a part's agent is started.
- **Requirements to parts.** How requirements are matched to the systems and parts they apply to.
- **Stale requirements.** What happens when a requirements document changes after its content was copied into a design document.
- **Review failures.** What happens when step 9 finds a problem.
- **Changes after the fact.** Whether and how the user can send feedback and re-run part of a build.

## Status

| Piece | State |
|-------|-------|
| Requirement flag on text, equation and symbolic-equation blocks | Built (`utils/requirementFlag.ts`, `utils/getRequirements.ts`). The migration `prisma/migrations/manual_add_component_is_requirement.sql` must be applied to each database. |
| Model picker (Haiku / Sonnet / Opus) | Built (`utils/aiModels.ts`) |
| RAG search for similar part trees | Built (`utils/findSimilarPartTrees.ts`); does not use requirements yet |
| Today's chat-driven build (see `prompts/part-tree.md`) | Built; does not follow the process above |
| Design documents, coordinator, system and part agents, review | Not built |
