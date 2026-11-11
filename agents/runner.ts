// Plain code, not a model, starts each agent: an agent runs only once the files its document
// lists as inputs already exist (PART_TREE_BUILD_PROCESS.md, "Order"). No coordinator holds the
// state of the whole build — the documents do.
import { partAgent } from "./partAgent";
import { researchAgent } from "./researchAgent";
import { rootCoordinator } from "./rootCoordinator";
import { systemCoordinator } from "./systemCoordinator";
import type { AgentContext, AgentFn, AgentKind, AgentResult, AgentTask } from "./types";

const AGENTS: Record<AgentKind, AgentFn> = {
  "root-coordinator": rootCoordinator,
  "system-coordinator": systemCoordinator,
  "part-agent": partAgent,
  "research-agent": researchAgent,
};

/** True when every file the task depends on already exists. */
export function isReady(task: AgentTask, existingFileIds: ReadonlySet<number>): boolean {
  return task.dependsOn.every((id) => existingFileIds.has(id));
}

/** Runs one agent, or reports why it was skipped. Returns what the agent handed back, or null
 *  if it didn't run. */
export async function runTask(
  task: AgentTask,
  existingFileIds: ReadonlySet<number>,
  ctx: AgentContext,
): Promise<AgentResult | null> {
  if (ctx.signal.aborted) return null;
  if (task.agent === "part-agent" && ctx.designOnly) return null;
  if (!isReady(task, existingFileIds)) {
    ctx.emit({
      type: "notice",
      message: `Skipped ${task.agent}: its inputs don't exist yet.`,
    });
    return null;
  }
  return (await AGENTS[task.agent](task, ctx)) ?? null;
}

/** A guard against a runaway build, not a design limit: systems nested deeper than this are
 *  left for the user to build from there. */
const MAX_SYSTEM_DEPTH = 8;

/** Works through what a coordinator created or found, in the order it listed them (so nothing
 *  comes before what it needs): a coordinator for each system, finishing that system's whole
 *  subtree first, and a part agent for each part. Each starts only once the design document it
 *  reads exists. A failure in one item is reported and does not stop its siblings. */
async function descend(
  parent: AgentResult,
  existingFileIds: Set<number>,
  ctx: AgentContext,
  depth: number,
): Promise<void> {
  existingFileIds.add(parent.designDocumentId);
  if (parent.children.length === 0) return;
  if (depth > MAX_SYSTEM_DEPTH) {
    ctx.emit({ type: "notice", message: `Stopped at ${MAX_SYSTEM_DEPTH} levels of systems; the ones below were not designed.` });
    return;
  }
  for (const child of parent.children) {
    if (ctx.signal.aborted) return;
    try {
      if (child.kind === "system") {
        const result = await runTask(
          {
            agent: "system-coordinator",
            designDocumentId: parent.designDocumentId,
            targetId: child.fileId,
            dependsOn: [parent.designDocumentId],
          },
          existingFileIds,
          ctx,
        );
        if (result) await descend(result, existingFileIds, ctx, depth + 1);
      } else if (child.designDocumentId !== undefined && !ctx.designOnly) {
        existingFileIds.add(child.designDocumentId);
        await runTask(
          {
            agent: "part-agent",
            designDocumentId: child.designDocumentId,
            targetId: child.fileId,
            dependsOn: [child.designDocumentId],
          },
          existingFileIds,
          ctx,
        );
      }
    } catch (err) {
      if (ctx.signal.aborted) return;
      ctx.emit({ type: "error", message: `${child.name}: ${err instanceof Error ? err.message : String(err)}` });
    }
  }
}

/** Starts a build: the main coordinator, working from the part tree's root, then everything
 *  beneath it. With designOnly, the part agents are not started. */
export async function runBuild(ctx: AgentContext): Promise<void> {
  ctx.emit({ type: "start", partTreeId: ctx.partTreeId });
  const existingFileIds = new Set<number>();
  const root = await runTask(
    { agent: "root-coordinator", designDocumentId: ctx.partTreeId, dependsOn: [] },
    existingFileIds,
    ctx,
  );
  if (root) await descend(root, existingFileIds, ctx, 1);
  if (ctx.designOnly) ctx.emit({ type: "notice", message: "Design only: the part documents were not built." });
}
