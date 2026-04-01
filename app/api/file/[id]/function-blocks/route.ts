import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";
import { componentToBlock } from "@/utils/transformers";

// GET /api/file/[id]/function-blocks
// Returns the equation blocks for a document so it can be used as a callable function.
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
    where: { id: fileId },
    select: { id: true },
  });
  if (!file) return NextResponse.json(null, { status: 404 });

  // Only fetch EQUATION-type components (componentTypeId = 3)
  const components = await db.component.findMany({
    where: { fileId, componentTypeId: 3, deletedAt: null },
    orderBy: { order: "asc" },
  });

  const blocks = components
    .map(componentToBlock)
    .filter((b) => b.type === "EQUATION" && b.definition.raw)
    .map((b) => ({
      id: b.id,
      order: b.order,
      type: b.type,
      definition: b.definition,
    }));

  return NextResponse.json({ blocks });
}
