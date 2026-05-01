import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const file = await db.file.findUnique({ where: { slug }, select: { id: true, name: true } });
  if (!file) return NextResponse.json({ error: "not found" }, { status: 404 });

  const components = await db.component.findMany({
    where: { fileId: file.id, inEdit: 1 },
    orderBy: { order: "asc" },
    select: { id: true, name: true, componentTypeId: true, order: true, content: true, deletedAt: true },
  });

  const fileImports = await db.fileImport.findMany({ where: { fileId: file.id } });

  const parsed = components.map((c) => {
    let raw: Record<string, unknown> = {};
    try { raw = JSON.parse(c.content ?? "{}"); } catch { /* ignore */ }
    return {
      id: c.id,
      name: c.name,
      typeId: c.componentTypeId,
      order: c.order,
      deletedAt: c.deletedAt,
      _v2: raw._v2,
      raw: raw.raw,
      inputFile: raw.inputFile,
    };
  });

  return NextResponse.json({
    fileId: file.id,
    fileName: file.name,
    componentCount: components.length,
    importAliases: fileImports.map((fi) => fi.localAlias),
    components: parsed,
  });
}
