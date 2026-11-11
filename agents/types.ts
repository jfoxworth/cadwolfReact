// Shared types for the part tree build agents. See PART_TREE_BUILD_PROCESS.md for the process
// these implement. Nothing in agents/ depends on Next.js request objects — the route in
// app/api/part-tree/build/ adapts the HTTP request into an AgentContext.

import type { AiEffortKey, AiModelKey } from "@/utils/aiModels";

/** One kind per module in agents/. The main coordinator is the "root-coordinator"; every system
 *  below it has its own "system-coordinator"; parts get a "part-agent"; reference links get a
 *  "research-agent". */
export type AgentKind =
  | "root-coordinator"
  | "system-coordinator"
  | "part-agent"
  | "research-agent";

/** Events streamed to the client as NDJSON, one JSON object per line. */
export type BuildEvent =
  | { type: "start"; partTreeId: number }
  | { type: "agent_start"; agent: AgentKind; fileId: number }
  | { type: "agent_done"; agent: AgentKind; fileId: number }
  | { type: "design_document"; agent: AgentKind; fileId: number; slug: string; name: string; replaced: boolean }
  | { type: "item"; kind: "system" | "part"; name: string; fileId: number; created: boolean }
  | { type: "notice"; message: string }
  | { type: "error"; message: string }
  | { type: "done" };

/** What every agent receives. The documents are the state, so this carries only who is running
 *  the build, which model to use, and how to report progress — never intermediate results. */
export interface AgentContext {
  userId: number;
  partTreeId: number;
  /** The user's build prompt. */
  prompt: string;
  modelKey: AiModelKey;
  effortKey: AiEffortKey;
  /** Write the design documents and create the structure, but don't build the parts. Lets the
   *  user check the design before paying for the part agents. */
  designOnly: boolean;
  emit: (event: BuildEvent) => void;
  /** Aborts when the client disconnects, so agents stop spending tokens on a build nobody sees. */
  signal: AbortSignal;
}

/** One unit of work: run `agent` once every file in `dependsOn` exists. `designDocumentId` is
 *  the design document the agent starts from. For the root coordinator, which writes the first
 *  one rather than reading it, it is the part tree's id. */
export interface AgentTask {
  agent: AgentKind;
  designDocumentId: number;
  /** The system or part the agent works on, when that isn't the part tree itself. For a system
   *  coordinator: the system's file id (`designDocumentId` is then the parent's document). */
  targetId?: number;
  /** Ids of files (design documents, requirements, research results) that must exist first. */
  dependsOn: number[];
}

/** A system or part a coordinator created or found beneath it. */
export interface ChildRef {
  kind: "system" | "part";
  fileId: number;
  name: string;
  /** A part's design document, written by the coordinator. A system writes its own. */
  designDocumentId?: number;
}

/** What a coordinator hands back: the design document it wrote and the systems and parts it
 *  created or found beneath it, in design order. The runner starts a coordinator for each
 *  system and a part agent for each part, in that order. */
export interface AgentResult {
  designDocumentId: number;
  children: ChildRef[];
}

export type AgentFn = (task: AgentTask, ctx: AgentContext) => Promise<AgentResult | void>;
