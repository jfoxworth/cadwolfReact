import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { componentToBlock } from "@/utils/transformers";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// POST /api/component — add a block to a document
export async function POST(req: NextRequest) {
  const { userId } = await getSessionUser();
  const body = await req.json();
  const { fileId, componentTypeId, content, order, itemid, name } = body;

  const canEdit = await checkPermission(Number(fileId), userId, "edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Shift siblings at or after the insertion order up by 1
  await db.component.updateMany({
    where: { fileId, inEdit: 1, deletedAt: null, order: { gte: order } },
    data: { order: { increment: 1 } },
  });

  const component = await db.component.create({
    data: {
      fileId,
      componentTypeId,
      content: content ?? {},
      order,
      itemid: itemid ?? crypto.randomUUID(),
      name: name ?? null,
      inEdit: 1,
    },
  });

  return NextResponse.json(componentToBlock(component), { status: 201 });
}
