import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// GET /api/file-import?fileId=123
// Returns imports enriched with the source file's slug for building links.
export async function GET(req: NextRequest) {
  const { userId } = await getSessionUser();
  const fileId = Number(req.nextUrl.searchParams.get("fileId"));
  if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 });

  const canView = await checkPermission(fileId, userId, "view");
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const imports = await db.fileImport.findMany({
    where:   { fileId },
    orderBy: { order: "asc" },
  });

  // Look up slugs for all source files in one query
  const sourceIds = [...new Set(imports.map((i) => i.sourceFileId))];
  const sourceFiles = sourceIds.length
    ? await db.file.findMany({
        where:  { id: { in: sourceIds } },
        select: { id: true, slug: true },
      })
    : [];
  const slugMap = new Map(sourceFiles.map((f) => [f.id, f.slug]));

  const enriched = imports.map((imp) => ({
    ...imp,
    sourceFileSlug: slugMap.get(imp.sourceFileId) ?? null,
  }));

  return NextResponse.json(enriched);
}

// POST /api/file-import — create a new import
export async function POST(req: NextRequest) {
  const { userId } = await getSessionUser();
  const body = await req.json();
  const { fileId, sourceFileId, sourceFileName, sourceVariableName, localAlias, value, units } = body;

  const canEdit = await checkPermission(Number(fileId), userId, "edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const count = await db.fileImport.count({ where: { fileId } });

  const entry = await db.fileImport.create({
    data: {
      fileId,
      sourceFileId,
      sourceFileName: sourceFileName ?? "",
      sourceVariableName,
      localAlias:     localAlias ?? sourceVariableName,
      value:          value  ?? null,
      units:          units  ?? null,
      needsUpdate:    false,
      order:          count,
    },
  });

  // Look up slug for the newly created import's source file
  const sourceFile = await db.file.findUnique({
    where:  { id: sourceFileId },
    select: { slug: true },
  });

  return NextResponse.json(
    { ...entry, sourceFileSlug: sourceFile?.slug ?? null },
    { status: 201 },
  );
}
