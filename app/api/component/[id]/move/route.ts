import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// POST /api/component/[id]/move — move a block up or down
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const { direction } = await req.json(); // "up" | "down"
  const numId = Number(id);

  const component = await db.component.findUniqueOrThrow({ where: { id: numId } });

  const canEdit = await checkPermission(component.fileId, userId, "edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const swapOrder = direction === "up" ? component.order - 1 : component.order + 1;

  const sibling = await db.component.findFirst({
    where: { fileId: component.fileId, inEdit: 1, deletedAt: null, order: swapOrder },
  });

  if (!sibling) {
    return NextResponse.json({ error: "Cannot move" }, { status: 400 });
  }

  await db.$transaction([
    db.component.update({ where: { id: numId }, data: { order: swapOrder } }),
    db.component.update({ where: { id: sibling.id }, data: { order: component.order } }),
  ]);

  return NextResponse.json({ moved: true });
}
