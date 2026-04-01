import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// POST /api/dataset — create a new dataset
export async function POST(req: NextRequest) {
  const { userId } = await getSessionUser();
  const body = await req.json();
  const { name, description, parentId } = body;

  // If parentId is provided, require edit permission on the parent
  if (parentId) {
    const canEdit = await checkPermission(Number(parentId), userId, "edit");
    if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dataset = await db.dataset.create({
    data: {
      name,
      description: description ?? null,
      userId,
      parentId: parentId ?? null,
      lft: 0,
      rgt: 0,
    },
  });

  return NextResponse.json({ created: true, id: dataset.id }, { status: 201 });
}
