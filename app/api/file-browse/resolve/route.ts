import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// GET /api/file-browse/resolve?slug=<slug>
// GET /api/file-browse/resolve?id=<id>
// Returns { id, name, description, datapointCount } for a Dataset file
export async function GET(req: NextRequest) {
  const { userId } = await getSessionUser();
  const { searchParams } = req.nextUrl;
  const slug = searchParams.get("slug");
  const idRaw = searchParams.get("id");

  let where: { slug?: string; id?: number } = {};
  if (slug) {
    where = { slug };
  } else if (idRaw) {
    where = { id: Number(idRaw) };
  } else {
    return NextResponse.json({ error: "slug or id required" }, { status: 400 });
  }

  const file = await db.file.findFirst({
    where: { ...where, fileTypeId: "Dataset", deletedAt: null },
    select: { id: true, name: true, itemData: true },
  });

  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canView = await checkPermission(file.id, userId, "view");
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let description = "";
  let datapointCount = 0;
  let real: Record<string, string> | null = null;
  let size: string | null = null;
  try {
    const parsed = JSON.parse(file.itemData ?? "{}");
    description = parsed.description ?? "";
    if (parsed.real && typeof parsed.real === "object") {
      real = parsed.real as Record<string, string>;
      datapointCount = Object.keys(real).length;
    }
    if (typeof parsed.size === "string") size = parsed.size;
  } catch { /* ignore */ }

  return NextResponse.json({
    id:             file.id,
    name:           file.name,
    description,
    datapointCount,
    real,
    size,
  });
}
