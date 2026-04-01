import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// GET /api/bibliography?fileId=123 — fetch all entries for a document
export async function GET(req: NextRequest) {
  const { userId } = await getSessionUser();
  const fileId = Number(req.nextUrl.searchParams.get("fileId"));
  if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 });

  const canView = await checkPermission(fileId, userId, "view");
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entries = await db.bibliography.findMany({
    where:   { fileId },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(entries);
}

// POST /api/bibliography — create a new entry
export async function POST(req: NextRequest) {
  const { userId } = await getSessionUser();
  const body = await req.json();
  const { fileId } = body;

  const canEdit = await checkPermission(Number(fileId), userId, "edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const count = await db.bibliography.count({ where: { fileId } });

  const entry = await db.bibliography.create({
    data: {
      fileId,
      authors: body.authors ?? "",
      title:   body.title   ?? "",
      year:    body.year    ?? null,
      source:  body.source  ?? null,
      url:     body.url     ?? null,
      doi:     body.doi     ?? null,
      note:    body.note    ?? null,
      order:   count,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
