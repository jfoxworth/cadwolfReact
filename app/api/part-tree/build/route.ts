import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";
import { db } from "@/utils/db";
import {
  DEFAULT_EFFORT_KEY, DEFAULT_MODEL_KEY, isAiEffortKey, isAiModelKey,
} from "@/utils/aiModels";
import { runBuild } from "@/agents/runner";
import type { BuildEvent } from "@/agents/types";

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

  const { partTreeId, prompt, modelKey, effortKey, designOnly } = await req.json();

  if (typeof partTreeId !== "number" || typeof prompt !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
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
      try {
        await runBuild({
          userId,
          partTreeId,
          prompt,
          modelKey: isAiModelKey(modelKey) ? modelKey : DEFAULT_MODEL_KEY,
          effortKey: isAiEffortKey(effortKey) ? effortKey : DEFAULT_EFFORT_KEY,
          // Design documents only unless the caller explicitly says designOnly: false, so a
          // build never spends on the parts without being asked to.
          designOnly: designOnly !== false,
          emit,
          signal: req.signal,
        });
        emit({ type: "done" });
      } catch (err) {
        emit({ type: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" },
  });
}
