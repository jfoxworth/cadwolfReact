import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// PUT /api/bibliography/[id] — update fields
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();

  const existing = await db.bibliography.findUnique({ where: { id: Number(id) }, select: { fileId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canEdit = await checkPermission(existing.fileId, userId, "edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  const entry = await db.bibliography.update({
    where: { id: Number(id) },
    data: {
      authors: body.authors ?? undefined,
      title:   body.title   ?? undefined,
      year:    body.year    ?? undefined,
      source:  body.source  ?? undefined,
      url:     body.url     ?? undefined,
      doi:     body.doi     ?? undefined,
      note:    body.note    ?? undefined,
    },
  });

  return NextResponse.json(entry);
}

// DELETE /api/bibliography/[id] — hard delete (no soft-delete column on this table)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();

  const existing = await db.bibliography.findUnique({ where: { id: Number(id) }, select: { fileId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canEdit = await checkPermission(existing.fileId, userId, "edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.bibliography.delete({ where: { id: Number(id) } });
  return NextResponse.json({ deleted: true });
}
