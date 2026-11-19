import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";
import { db } from "@/utils/db";
import {
  DEFAULT_EFFORT_KEY, DEFAULT_MODEL_KEY, isAiEffortKey, isAiModelKey,
} from "@/utils/aiModels";
import { runBuild } from "@/agents/runner";
import type { BuildEvent } from "@/agents/types";
import { getBalanceCredits, newUsageTally, parseRequestedTeamId, recordUsage, resolveAccount, spendBlock } from "@/utils/aiCredits";

// Entry point for the agentic part tree build (see PART_TREE_BUILD_PROCESS.md). The build runs
// inside this one streaming request and reports progress as NDJSON events; the agents
// themselves live in agents/. The main coordinator, the system coordinators and the part
// agents are built. Stops after the design documents unless the request sets designOnly: false.
export async function POST(req: NextRequest) {
  const { userId } = await getSessionUser();

  // Same gate as /api/chat and the generate-document route: this calls (or will call) the
  // Anthropic API, so it is limited to the allow-listed user.
  const allowedUserId = process.env.ALLOWED_CHAT_USER_ID
    ? parseInt(process.env.ALLOWED_CHAT_USER_ID)
    : null;
  if (!allowedUserId || userId !== allowedUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { partTreeId, prompt, modelKey, effortKey, designOnly, teamId } = await req.json();

  if (typeof partTreeId !== "number" || typeof prompt !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Which credits pay: the user's own or a team's (the server checks the user belongs to that team).
  const account = await resolveAccount(userId, parseRequestedTeamId(teamId));
  const blocked = await spendBlock(account);
  if (blocked) {
    return NextResponse.json({ error: blocked.message }, { status: 402 });
  }

  const partTree = await db.file.findUnique({
    where: { id: partTreeId },
    select: { fileTypeId: true, deletedAt: true },
  });
  if (!partTree || partTree.deletedAt || !["PartTree", "Part Tree"].includes(partTree.fileTypeId)) {
    return NextResponse.json({ error: "Part tree not found" }, { status: 404 });
  }
  if (!(await checkPermission(partTreeId, userId, "edit"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const emit = (event: BuildEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch { /* client already disconnected */ }
      };
      const model = isAiModelKey(modelKey) ? modelKey : DEFAULT_MODEL_KEY;
      const usage = newUsageTally();
      let failed = false;
      try {
        await runBuild({
          userId,
          partTreeId,
          prompt,
          modelKey: model,
          effortKey: isAiEffortKey(effortKey) ? effortKey : DEFAULT_EFFORT_KEY,
          usage,
          // Design documents only unless the caller explicitly says designOnly: false, so a
          // build never spends on the parts without being asked to.
          designOnly: designOnly !== false,
          emit,
          signal: req.signal,
        });
      } catch (err) {
        failed = true;
        emit({ type: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        // Charge for what the build used, even if it failed or the client left partway.
        if (usage.input || usage.output) {
          let balance: number | null = null;
          try {
            balance = await recordUsage({
              account, pageType: "part-tree", fileId: partTreeId, source: "part_tree_build", model, usage,
            });
          } catch (err) {
            console.error("[part-tree/build] could not record AI usage:", err);
            balance = await getBalanceCredits(account).catch(() => null);
          }
          emit({ type: "usage", input: usage.input, output: usage.output, cost: usage.cost, balance });
        }
        if (!failed) emit({ type: "done" });
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" },
  });
}
