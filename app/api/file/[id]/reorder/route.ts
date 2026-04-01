import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { fileToItem } from "@/utils/transformers";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// PUT /api/file/[id]/reorder — move a workspace item up or down one position
// Body: { direction: "up" | "down" }
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const numId = Number(id);

  const file = await db.file.findUnique({ where: { id: numId, deletedAt: null } });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canEdit = await checkPermission(file.parentId ?? numId, userId, "edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { direction } = await req.json() as { direction: "up" | "down" };
  if (direction !== "up" && direction !== "down") {
    return NextResponse.json({ error: "direction must be 'up' or 'down'" }, { status: 400 });
  }

  // Fetch all siblings sorted by order
  const siblings = await db.file.findMany({
    where: { parentId: file.parentId, deletedAt: null },
    orderBy: { order: "asc" },
  });

  const idx = siblings.findIndex((s) => s.id === numId);
  if (idx === -1) return NextResponse.json({ error: "Item not found in siblings" }, { status: 404 });

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) {
    return NextResponse.json({ error: "Already at boundary" }, { status: 400 });
  }

  const target = siblings[swapIdx];

  // Swap the two order values
  await db.$transaction([
    db.file.update({ where: { id: numId },      data: { order: target.order } }),
    db.file.update({ where: { id: target.id },  data: { order: file.order   } }),
  ]);

  const updated = await db.file.findUniqueOrThrow({ where: { id: numId } });
  return NextResponse.json(fileToItem(updated));
}
