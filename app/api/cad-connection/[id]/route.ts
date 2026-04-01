import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// PUT /api/cad-connection/[id]  — update equations or info
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();

  const existing = await db.cadConnection.findUnique({ where: { id: Number(id) }, select: { documentId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canEdit = await checkPermission(Number(existing.documentId), userId, "edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { info?: Record<string, unknown> };

  const conn = await db.cadConnection.update({
    where: { id: Number(id) },
    data: { info: JSON.stringify(body.info ?? {}) },
  });

  return NextResponse.json({ id: conn.id });
}

// DELETE /api/cad-connection/[id]  — soft delete
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();

  const existing = await db.cadConnection.findUnique({ where: { id: Number(id) }, select: { documentId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canEdit = await checkPermission(Number(existing.documentId), userId, "edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.cadConnection.update({
    where: { id: Number(id) },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
