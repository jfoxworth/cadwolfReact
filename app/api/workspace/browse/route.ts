import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// GET /api/workspace/browse
// ?parentId=123  → children of that folder + whether current user can edit it
// (no params)    → root-level workspaces/folders the current user owns
// ?slug=abc      → resolve a workspace by slug, navigate into it
export async function GET(req: NextRequest) {
  const { userId } = await getSessionUser();
  const { searchParams } = req.nextUrl;
  const parentId = searchParams.get("parentId");
  const slug = searchParams.get("slug");

  // Resolve by slug — navigate directly to a folder via URL
  if (slug) {
    const file = await db.file.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true, name: true, slug: true, fileTypeId: true },
    });
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const canEdit = await checkPermission(file.id, userId, "edit");
    const children = await db.file.findMany({
      where: {
        parentId: file.id,
        fileTypeId: { in: ["Workspace", "Folder"] },
        deletedAt: null,
      },
      select: { id: true, name: true, slug: true, fileTypeId: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({
      resolved: { id: String(file.id), name: file.name, slug: file.slug },
      items: children.map((f) => ({ id: String(f.id), name: f.name, slug: f.slug, type: f.fileTypeId })),
      canEdit,
    });
  }

  // Browse children of a specific folder
  if (parentId) {
    const numericId = Number(parentId);
    const canEdit = await checkPermission(numericId, userId, "edit");
    const children = await db.file.findMany({
      where: {
        parentId: numericId,
        fileTypeId: { in: ["Workspace", "Folder"] },
        deletedAt: null,
      },
      select: { id: true, name: true, slug: true, fileTypeId: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({
      items: children.map((f) => ({ id: String(f.id), name: f.name, slug: f.slug, type: f.fileTypeId })),
      canEdit,
    });
  }

  // Root level — workspaces/folders owned by this user with no parent
  const roots = await db.file.findMany({
    where: {
      userId,
      fileTypeId: { in: ["Workspace", "Folder"] },
      parentId: null,
      deletedAt: null,
    },
    select: { id: true, name: true, slug: true, fileTypeId: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    items: roots.map((f) => ({ id: String(f.id), name: f.name, slug: f.slug, type: f.fileTypeId })),
    canEdit: false, // root is not a valid move destination
  });
}
