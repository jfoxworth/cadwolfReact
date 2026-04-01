import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import type { FunctionSettings } from "@/types/item";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// GET /api/file/[id]/function-settings
// Returns the functionSettings from a document's itemData, or null if none defined.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const fileId = Number(id);

  const canView = await checkPermission(fileId, userId, "view");
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const file = await db.file.findUnique({
    where: { id: Number(id) },
    select: { name: true, itemData: true },
  });
  if (!file) return NextResponse.json(null, { status: 404 });

  let itemData: Record<string, unknown> = {};
  try { itemData = JSON.parse(file.itemData ?? "{}"); } catch { /* ignore */ }

  const fs = itemData.functionSettings as FunctionSettings | undefined;
  const inputs  = Array.isArray(fs?.inputs)  ? fs!.inputs  : [];
  const outputs = Array.isArray(fs?.outputs) ? fs!.outputs : [];

  if (inputs.length === 0 && outputs.length === 0) {
    return NextResponse.json(null);
  }

  return NextResponse.json({ name: file.name, inputs, outputs });
}
