import type { AgentFn, AgentKind } from "./types";

/** Placeholder for an agent whose model calls aren't written yet. Reports that fact to the
 *  client instead of silently doing nothing. Replace each use as the agent gets built. */
export function notBuilt(agent: AgentKind): AgentFn {
  return async (task, ctx) => {
    ctx.emit({ type: "agent_start", agent, fileId: task.designDocumentId });
    ctx.emit({ type: "notice", message: `The ${agent} is not built yet.` });
    ctx.emit({ type: "agent_done", agent, fileId: task.designDocumentId });
  };
}
