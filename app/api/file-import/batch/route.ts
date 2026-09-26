import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
// No auth required — caller is responsible for only passing accessible fileIds, same
// convention as /api/cad-connection/batch.

// POST /api/file-import/batch
// Body: { fileIds: number[] }
// Returns every FileImport row whose fileId is in the given set, in one query — lets a page
// with many items (e.g. a whole part tree) render the import graph without an N+1 fetch.
export async function POST(req: NextRequest) {
  const body = await req.json() as { fileIds: number[] };
  const ids = body.fileIds ?? [];
  if (ids.length === 0) return NextResponse.json([]);

  const imports = await db.fileImport.findMany({
    where: { fileId: { in: ids } },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(imports);
}
