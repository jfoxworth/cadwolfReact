import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import type { FunctionPort } from "@/types/item";

// GET /api/file-browse-functions?search=...
// Returns documents for the current user whose itemData has a functionSettings
// with at least one input or output defined, optionally filtered by name.
export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") ?? "";

  const { userId } = await getSessionUser();

  const files = await db.file.findMany({
    where: {
      userId,
      fileTypeId: "Document",
      deletedAt:  null,
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    },
    select: { id: true, name: true, itemData: true },
    orderBy: { name: "asc" },
  });

  const results = files.flatMap((f) => {
    let itemData: Record<string, unknown> = {};
    try { itemData = JSON.parse(f.itemData ?? "{}"); } catch { /* ignore */ }

    const fs = itemData.functionSettings as { inputs?: FunctionPort[]; outputs?: FunctionPort[] } | undefined;
    if (!fs) return [];
    const inputs  = Array.isArray(fs.inputs)  ? fs.inputs  : [];
    const outputs = Array.isArray(fs.outputs) ? fs.outputs : [];
    if (inputs.length === 0 && outputs.length === 0) return [];

    return [{
      id:      f.id,
      name:    f.name,
      inputs,
      outputs,
    }];
  });

  return NextResponse.json(results);
}
