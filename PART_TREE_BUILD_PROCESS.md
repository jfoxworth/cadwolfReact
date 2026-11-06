# Part Tree Build Process (AI)

This document describes the **intended** process by which the AI builds a part tree from a user's prompt. It is the roadmap. Update it whenever the intended process changes or a step is built.

## Core idea

The main coordinator writes only the top-level **design document**. Each system then has its own coordinator, which reads its design document, decides the structure of that system, and writes the design documents for its children. No coordinator runs for the whole build or holds the state; the documents do. Plain code, not a model, starts each coordinator or agent once its document exists. Each agent starts from one such document, does its job, and writes its results back. The documents are the handoff between steps, and afterwards they are the record we read to see what the AI was thinking and how to improve it.


## Requirements documents

The user creates requirements documents in the part tree. These are real life documents set by stakeholders that dictate the requirements for the system overall and specific parts. The documents are to be used to guide the overall design of the system as well as set components as explicit requirements. So, the overall document may tell the system that it needs X number of rods and that they need to be made of Y materials and attach via fittings at specific points. Specific requirements can be set as equations that dictate loads, factors of safety, etc. These need to be fed into the appropriate child systems and documents/parts.

Requirements documents may also have a reference section (see below) that contains links to outside documents, each with a note on what the AI should get from it.


## Design documents

As part of the AI design process, our system will create a design document for each system and for each part, plus a root one for the whole build. They are written in the app's normal document format (text and equation blocks), and they must:
   - never be vectorized or embedded;
   - be overwritable when a step is re-run, and deletable;
   - stay small (a size limit enforced by the prompt and by code).

Each lives in the same workspace as the system or part it designs. They are either shown differently in the tree or made available from the dropdown on each row. They are marked as design documents with a property in the file's item data. Code that embeds, lists or deletes files has to check that property. Like requirements documents, they are non-physical so rollups skip them.

These documents are what agents will use to design systems and parts and will be what we humans later use to see how the AI is interpreting requirements to build structures so that we can improve the system prompts or the process.



## Process

0. All of this takes place after the user has created the desired requirements documents. This could be one document at the top level, no documents, or some documents at some systems.
1. **Prompt.** When the requirements documents (and any folder structure) are set up, the user enters a prompt describing the system they want. This could be as simple as "Read the requirements documents and build the system in question.
2. **Kickoff.** The prompt starts the coordinator. This prompt may be as simple as telling the model to read the requirements models and go from there or it may give all the guidance. Our documents will ask the user to utilize requirements documents.
3. **Main Coordinator starts.** We will need to work on the prompt for this.
4. **Read requirements.** The coordinator reads the requirements document(s) and records every numerical and text requirement. Numerical ones are recorded as they are; text ones may be summarized by an agent. Note that this will be what dictates the structure of part tree - what systems and parts exist and where they are located. Users will be encouraged to dicate this in those documents.
5. **Research references.** For each link in a reference section, a research agent fetches the document, finds what the user asked for, and returns only that, with its source. The result goes into the root design document. The idea here is that these documents are used for overall guidance and NOT for specific measurable requirements. Those items should be in equations within the document and labeled as requirements.  These may end up functioning as a guide of what not to do instead of what to do. References will be housed in a text block in the requirements document under the heading of "References"
6. **Find a guide.** The coordinator runs the RAG search for similar part trees, presents any matches, and the user may pick one as a guide. (Separate Agent?)
7. **Design Documents.** The coordinator writes the root design document: the systems and parts it expects, the inputs of each part, what drives each part's design, and where this differs from the chosen guide and the researched references. This needs to be detailed, but brief.  We will need to work on the prompt for this. (Level of effort?)
8. **Coordinator for each system.** A coordinator agent will then design the parts or subsystems of each system. It reads that system's design document and it works with the context passed down from the coordinator above it. It decides the structure of the system: the parts and sub-systems needed, and which requirements (loads, stresses and so on) apply to each. It creates them and writes a design document for each child, whether a sub-system or a part. This is the whole job of a coordinator. When it finishes, it adds a summary to its own system's document.
9. **User Intervention.** There will be a check box in the prompt. If the user checks it, he will have to approve the design of each system. This will be handled by them being shown a list of the systems and parts in that system. If they approve, the build continues. If not, they prompt with text the desired changes and the model redoes the design for that system and the user is represented with the build. It will be default unchecked.
10. **Build parts.** For each part, an agent reads the part's design document and designs the part. It adds a summary of the result to the document. We will need to work on the prompt for this. Note that each document needs to have headers, text explaining what the part is, what it does, the design process, etc. It will need headers, symbolic equations, and equations.
11. **Write Logs.** The model will output a log for each system and part that holds its thoughts while designing those items.
12. **Specificity**. If a user wants to do only certain systems at a time or to redo certain parts and systems, that needs to be possible. The user can either assert that the system misinterpreted the requirements or the user can redo the requirements.

Order: an agent runs only when the inputs its document lists already exist.

## Reference sections

A requirements document can have a reference section: links to outside documents about a known system (for example, public papers on Orion's crew impact attenuation system). They are labeled "reference", separate from the "requirement" label, so a link is never read as a requirement.

- **Mostly for orientation.** The usual use is to help the AI see the overall structure of a known system: which systems and parts it has, how it is broken down, and what drives each piece. Sometimes the user wants specific measurements.
- **The user says what to get.** Each link comes with a plain-language note, such as "how the system is broken into subsystems" or "the stroke length and load limits". The research agent works from that note.
- **The research agent returns only what was asked for,** short and with the source. It does not return the document. Numbers it finds are marked unverified and carry their source. If the document doesn't contain what was asked, it says so and does not guess.
- **Results are stored separately, keyed by link and note,** so the same request is fetched once and reused. They are not written into the requirements document, and they are not vectorized.
- **Fetched content is data, never instructions.** Fetching must not be able to reach internal addresses.

## What the design documents contain

**System document**
- purpose. This needs to include a summary of the overall system and where this system fits in it
- requirements that apply (inherited ones included), copied in as they were when the design was made, with the id of the source block. A design document is a record of the initial design, not a live document, so it does not go stale. If a build is re-run, the documents are overwritten.
- inputs from sibling systems
- the parent's context
- the guide tree, if one was picked
- the list of children
- reasoning: why these children, in what order
- results (filled in by the agent)

**Part document**
- function. This needs to include a of the part and where this system fits in the system
- requirements that apply, with source ids
- inputs: source, variable, units
- outputs and the end calculations
- context from the parent and the user's prompt
- results (filled in by the agent)

## Open questions

- **Number of agents.** How many agents there are, and how a part's agent is started. Each system has a coordinator; the rest is undecided.

## Status

| Piece | State |
|-------|-------|
| Requirement flag on text, equation and symbolic-equation blocks | Built (`utils/requirementFlag.ts`, `utils/getRequirements.ts`). The migration `prisma/migrations/manual_add_component_is_requirement.sql` must be applied to each database. |
| Model picker (Haiku / Sonnet / Opus) | Built (`utils/aiModels.ts`) |
| RAG search for similar part trees | Built (`utils/findSimilarPartTrees.ts`); does not use requirements yet |
| Today's chat-driven build (see `prompts/part-tree.md`) | Built; does not follow the process above |
| Reference sections and the research agent | Not built. Nothing in the chat tools fetches outside documents today. |
| Design documents, coordinator, system and part agents | Not built |
