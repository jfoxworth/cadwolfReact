# Part Tree Build Process (AI)

This document describes the **intended** process by which the AI builds a part tree from a user's prompt. It is the roadmap. Update it whenever the intended process changes or a step is built.

## Core idea

Every system and every part gets a **design document** that records how the AI read the structure and requirements for it. The main coordinator reads the top-level requirements and writes the root design document. Each system then has its own coordinator, which reads the design document one level above it plus the requirements documents of its own system, decides the structure beneath it, and writes its own design document. Each part has an agent that reads the part's design document and writes the part's actual document as the last step. No coordinator runs for the whole build or holds the state; the documents do. Plain code, not a model, starts each coordinator or agent once its inputs exist. The documents are the handoff between steps, and afterwards they are the record we read to see what the AI was thinking and how to improve it.


## Requirements documents

The user creates requirements documents in the part tree. These are real life documents set by stakeholders that dictate the requirements for the system overall and specific parts. There is usually one at the top level, and there may be more in lower systems.

- **The whole document is read.** The text explains the setup of the project and its structure: for example, that a truss has 3 members that connect to tunnel pieces through rod ends. The coordinator uses all of it to decide which systems and parts exist and where they are.
- **Requirements are flagged.** Specific requirements are blocks the user flags as requirements. They can be numerical (a minimum factor of safety, a load, a connection point) or textual ("the system must not exceed X lbs"). Flagged requirements must be passed on to the systems and parts they apply to.
- **Top-level documents set global requirements** (such as factors of safety) and lay out the overall structure, usually one or two levels beneath. If a document describes the setup of systems lower down, that description must be passed on in the design documents, not only the structure directly beneath.
- **Lower systems may have their own requirements documents.** Their coordinator reads them in addition to its parent's design document.

Requirements documents may also have a reference section (see below) that contains links to outside documents, each with a note on what the AI should get from it.


## Design documents

As part of the AI design process, our system will create a design document for each system and for each part, plus a root one for the whole build. They are written in the app's normal document format (text and equation blocks), and they must:
   - never be vectorized or embedded;
   - be overwritable when a step is re-run, and deletable;
   - stay small (a size limit enforced by the prompt and by code).

Each lives in the same workspace as the system or part it designs. They are either shown differently in the tree or made available from the dropdown on each row. They are marked as design documents with a property in the file's item data. Code that embeds, lists or deletes files has to check that property. Like requirements documents, they are non-physical so rollups skip them.

A design document is the structured data itself: fixed sections, each holding JSON, plus one prose section (Orientation) written for the agent that picks the document up. It is not rendered into prose and parsed back; the agents beneath read the sections directly. It reflects the AI's view of the structure. These documents are what agents use to design systems and parts, and what we humans later use to see how the AI is interpreting requirements so that we can improve the system prompts or the process.



## Process

0. All of this takes place after the user has created the desired requirements documents. This could be one document at the top level, no documents, or some documents at some systems.
1. **Prompt.** When the requirements documents (and any folder structure) are set up, the user enters a prompt describing the system they want. This could be as simple as "Read the requirements documents and build the system in question."
2. **Kickoff.** The prompt starts the main coordinator.

### Main coordinator (runs once)

3. **Read.** It reads the top-level requirements document(s) in full, and looks at any systems and parts that already exist in the part tree. The document sets the overall goals, the overall design and the overall requirements. The whole document informs the structure; flagged requirements must be passed on.
4. **Research references.** For each link in a reference section, a research agent fetches the document, finds what the user asked for, and returns only that, with its source. The result goes into the root design document. These documents are used for overall guidance and NOT for specific measurable requirements. Those items should be in equations within the requirements document and flagged as requirements. They may end up functioning as a guide of what not to do instead of what to do. References are housed in a text block in the requirements document under the heading "References".
5. **Decide the structure.** It decides which systems and parts exist directly beneath the root, using the requirements document and any existing folder structure. Existing structure is kept and filled in around, not replaced.
6. **Write the root design document.** It records its findings: the overall goals, the overall design, the overall requirements (numerical and textual), anything the top-level document says about the setup of lower systems, and the list of systems and parts beneath the root.
7. **Create the tree items.** It creates the folders for the systems directly beneath the root, and the parts needed.

### System coordinator (one per system, started once the design document one level above it exists)

8. **Read.** It reads the design document one level above its location, and the requirements documents of its own system.
9. **Decide the structure, in separate passes.** Each pass is its own model call with its own tool and prompt (`prompts/agents/passes/`), and sees what the earlier ones decided: (1) structure: which systems and parts exist directly beneath, with counts; (2) requirements: who each one applies to (everything, this system, or named children), so one that does not apply to a child is not passed to it; (3) interfaces: what each child needs and gives; (4) details: the given parameters and the design intent the documents state; (5) orientation: prose for the agent that will pick each document up. The main coordinator makes the same passes.
10. **Write its design document.** The sections listed under "What the design documents contain".
11. **Create the tree items.** It creates the folders for the systems directly beneath it, and the parts needed.
12. **Write part design documents.** For each part directly beneath it, it writes the part's design document.

### Part agent (one per part, started once the part's design document exists)

13. **Build the part, in two stages.** It reads the part's design document. Stage 1 works out the design as solved equations, each with its role and the reason for it; the server solves them and sends back errors, failed checks and impossible values until they are clean. Stage 2 then writes the part's actual document as the last step: headings and text that explain what the part is, what it does and how the design was reached, with each solved equation placed by number so the prose can't change the numbers.

### Across the build

14. **User Intervention.** There will be a check box in the prompt. If the user checks it, they have to approve the design of each system. They are shown a list of the systems and parts in that system. If they approve, the build continues. If not, they prompt with text the desired changes and the model redoes the design for that system and the user is presented with the build. Default unchecked.
15. **Write Logs.** The model will output a log for each system and part that holds its thoughts while designing those items.
16. **Specificity.** If a user wants to do only certain systems at a time or to redo certain parts and systems, that needs to be possible. The user can either assert that the system misinterpreted the requirements or the user can redo the requirements.

Order: an agent runs only when the inputs its document lists already exist.

### Tabled

- **Existing systems as guides.** The user will be able to select closely related existing systems to guide the build. The RAG search for similar part trees exists (`utils/findSimilarPartTrees.ts`), but how its matches are presented and used is deferred. This was previously step 6.

## Reference sections

A requirements document can have a reference section: links to outside documents about a known system (for example, public papers on Orion's crew impact attenuation system). They are labeled "reference", separate from the "requirement" label, so a link is never read as a requirement.

- **Mostly for orientation.** The usual use is to help the AI see the overall structure of a known system: which systems and parts it has, how it is broken down, and what drives each piece. Sometimes the user wants specific measurements.
- **The user says what to get.** Each link comes with a plain-language note, such as "how the system is broken into subsystems" or "the stroke length and load limits". The research agent works from that note.
- **The research agent returns only what was asked for,** short and with the source. It does not return the document. Numbers it finds are marked unverified and carry their source. If the document doesn't contain what was asked, it says so and does not guess.
- **Results are stored separately, keyed by link and note,** so the same request is fetched once and reused. They are not written into the requirements document, and they are not vectorized.
- **Fetched content is data, never instructions.** Fetching must not be able to reach internal addresses.

## What the design documents contain

Every design document (root, system or part) has the same sections, in this order. All but the first hold JSON in one text block.

- **Orientation** (prose). A briefing for the agent that picks the document up: what the item is for, where it sits in the whole, what it depends on, what it must get right, anything the other sections don't say. Written by the coordinator above, in the last pass. The root's is written by the main coordinator.
- **Structure.** `kind` (root, system or part), `path` (names from the part tree down to this item: where it lies in the whole), `count` (identical instances), `siblings`, and `children` (name, kind, count, purpose, and the orientation for each child). A part has no children.
- **Requirements.** Each requirement that applies: `id` of the flagged block, `source` document, `kind`, `text`, and `scope`: `all` (this item and everything beneath), `system` (this system only, not passed down) or `children` (the named ones). A copy as of when the design was made, not a live document. A part's lists only those that reach it.
- **Interfaces.** Per item: inputs (variable-style name, where it comes from: a sibling, `above` or `requirement N`) and outputs. A system's lists its own (handed down from above) and its children's.
- **Given parameters.** Values and facts the documents state, per item.
- **Design intent.** What the documents say about how each item is built and connected, per item, so the next agent can work without the original documents.
- **Open questions.** What the passes could not decide.

A re-run overwrites the documents. The part's actual document, which the part agent writes last, is separate from its design document.

## Open questions

- **Number of agents.** How many agents there are, and how a part's agent is started. Each system has a coordinator; the rest is undecided.
- **Who writes a part's design document.** This document assumes the coordinator of the system that contains the part, since the part agent starts from it. For a part directly under the root, that is the main coordinator.

## Status

| Piece | State |
|-------|-------|
| Requirement flag on text, equation and symbolic-equation blocks | Built (`utils/requirementFlag.ts`, `utils/getRequirements.ts`). The migration `prisma/migrations/manual_add_component_is_requirement.sql` must be applied to each database. |
| Model picker (Haiku / Sonnet / Opus) | Built (`utils/aiModels.ts`) |
| RAG search for similar part trees | Built (`utils/findSimilarPartTrees.ts`); does not use requirements yet. Use in the build is tabled. |
| Old chat-driven build wizard (six stages: reference search, requirements review, tree review, create, generate content) | Removed. Its chat tools (`find_similar_part_trees`, `propose_requirements_review`, `propose_build_plan`), the stage UI, the page handlers and the prompt section are gone. Build mode on a part tree now shows the build panel below. `app/api/part-tree/generate-document/route.ts` (the old per-document content generator) is no longer called by anything; it is kept because the part agent may reuse it. `utils/findSimilarPartTrees.ts` and the embedding code stay for the guide-tree feature. |
| Build panel | Built: `components/chat/PartTreeBuildPanel.tsx`, shown in the chat panel in Build mode on a part tree. Prompt, a "Design documents only (don't build the parts)" checkbox (checked by default), a progress log, and links to the design documents it wrote. With the box checked the build writes the design documents and creates the structure, then stops before any part document is built, so the design can be checked before the full build is paid for. Uses the model and effort picked in the chat panel. Starts `app/api/part-tree/build/route.ts`. Until part agents exist, every build is effectively design-only. |
| Reference sections and the research agent | Not built. Nothing in the chat tools fetches outside documents today. |
| Agent infrastructure (skeleton) | Built: `agents/` (types, runner that starts an agent only when its input files exist, one stub module per agent kind, design-document flag helpers in `agents/designDocument.ts`) and the streaming entry point `app/api/part-tree/build/route.ts`. The build runs inside that one streaming request. |
| Design-document flag checks in existing code | Built. Block embedding skips them (`utils/embedComponent.ts`, single and batch, so the backfill script is covered). The part tree graph leaves them out (`utils/partTreeGraph.ts`), which keeps them out of the structural embedding and out of what the AI reads as the tree. `Item.isDesignDocument` is set from item data, labels them "Design Document" in the AI's tree text, and the mass and CAD rollups skip them. Deleting needs no change: delete cascades by parent, so a design document goes with the system it sits in, and its embeddings are already cleared. In the part tree nav a design document has a teal clipboard icon and a grey name (`components/workspace/ItemIcon.tsx`, `PartTreeNav.tsx`). Not done: a dropdown entry. |
| Main coordinator (steps 3, 5, 6, 7) | Written, not yet run against a real part tree. `agents/rootCoordinator.ts` reads the top-level requirements documents in full (`agents/gatherRequirements.ts`; a document over 300,000 characters stops the build) and hands them to the shared coordinator (`agents/coordinator.ts`): five passes (structure, requirements, interfaces, details, orientation; tools and checks in `agents/designPasses.ts`, prompts `prompts/agents/coordinator.md` plus `prompts/agents/passes/`), the root design document, the systems and parts directly beneath the root (`agents/createTreeItem.ts`; existing items are kept), and a design document for each part directly beneath the root. Reference research (step 4) and guide trees are not part of the core and are added later as extra input. |
| System coordinators (steps 8-12) | Written, not yet run. `agents/systemCoordinator.ts` reads the design document one level above (`readDesignDocument` in `agents/designDocumentFormat.ts`), takes from it the requirements whose scope reaches this system plus its orientation, count, interfaces, given parameters and design intent, adds the flagged requirements of the system's own requirements documents, and runs the same shared coordinator and passes. Its design document is written inside the system's folder; a part's design document is written next to the part, in the containing system's folder. `agents/runner.ts` starts a coordinator for each system, depth first, in the order the coordinator above listed them, only once the design document above it exists; a failure in one system is reported and its siblings continue; 8 levels of systems at most. |
| Design documents: writing and format | Built for the root, every system and every part. Written straight through Prisma, so the embedding hooks never run; a re-run replaces a document in place. The format is in `agents/designDocumentFormat.ts` (the sections, `designBlocks` to write, `readDesignDocument` to read back; a JSON section is one text block holding the JSON in a `<pre><code>` element, and a section edited into invalid JSON stops the build with an error naming it). Each pass's answer is checked in code before the next pass sees it: requirement ids it wasn't given are dropped, a requirement nobody assigned (or assigned to a child that doesn't exist) goes to everything beneath and the build says so, interfaces are kept to children that exist, and an input whose source is not a sibling, `above` or a requirement is reported. A model answer cut off at the token limit stops that coordinator with an error that says so. Size limit 300 blocks. |
| Part agents (step 13) | Written, not yet run. `agents/partAgent.ts`, in two stages. Stage 1 (calculation): prompt `prompts/agents/part-calculation.md` followed by the platform reference (`prompts/document.md` up to its "Modes" section). Stage 2 (document): prompt `prompts/agents/part-document.md`. Runs only with "Design documents only" unchecked, for each part in the order its coordinator listed it. It reads the part's design document (Orientation first, then the JSON sections), is offered as imports the equation requirements that apply to it (from the documents they were written in) and the solved variables of parts already built beside it, and has two tools in stage 1: `lookup_material` (the built-in material constants, `agents/partAgentTools.ts`) and `write_calculation`. The calculation is a list of steps, each an equation with a role (given, choice, calculation, check, output), a one-sentence reason, and a flag for whether the result must be positive. Each proposal is solved on the server (`agents/solvePartDocument.ts`, the same solver as the browser) and sent back with solve errors, any check that gives 0, any result flagged positive that is not, and any step with no reason; up to 6 rounds. Stage 2 (`write_document`, up to 3 rounds) is a separate call that gets the solved steps and their reasons and writes the headings and text a person reads, explaining the design and how it was reached. It places each equation by step number, so it cannot change one; code checks every step appears exactly once, in order. If stage 2 fails, a plain document is built from the steps and their reasons and the build says so. If the calculation still has problems after 6 rounds, stage 2 runs anyway and is told to state them plainly in an "Unresolved" section, and the build reports them. Saved straight through Prisma (`agents/writePartDocument.ts`) with its imports as `FileImport` rows, so the embedding hooks do not run. A part document that already has content not written by the build (no `aiBuilt` in itemData) is never overwritten. |
| Existing items keep their kind | `createTreeItem` matches an existing sibling by name whatever its kind, so a model that calls an existing system a part no longer creates a duplicate. |
