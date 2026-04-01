import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";

export interface ImageBrowseItem {
  id:         number;
  name:       string;
  fileTypeId: string;   // "Workspace" | "Folder" | "Image"
  parentId:   number | null;
  imageUrl:   string | null;  // resolved URL for Image items, null for containers
}

// GET /api/image-browse?parentId=null|<id>
// No parentId → user's root workspaces
// With parentId → folders + Image items inside that container
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("parentId");
  const parentId = raw === null || raw === "null" ? null : Number(raw);

  const { userId } = await getSessionUser();

  const files = await db.file.findMany({
    where: {
      parentId,
      deletedAt: null,
      fileTypeId: { in: parentId === null ? ["Workspace"] : ["Workspace", "Folder", "Image"] },
      ...(parentId === null ? { userId } : {}),
    },
    orderBy: [{ fileTypeId: "asc" }, { name: "asc" }],
    select: { id: true, name: true, fileTypeId: true, parentId: true, itemData: true },
  });

  const items: ImageBrowseItem[] = files.map((f) => {
    let imageUrl: string | null = null;
    if (f.fileTypeId === "Image") {
      try {
        const data = JSON.parse(f.itemData ?? "{}") as Record<string, unknown>;
        const raw =
          typeof data.fileImage === "string" && data.fileImage ? data.fileImage :
          typeof data.imageSource === "string" && data.imageSource ? data.imageSource :
          null;
        if (raw) {
          imageUrl = raw.startsWith("http") ? raw : `https://cadwolf.s3.amazonaws.com/${raw}`;
        }
      } catch { /* ignore */ }
    }
    return { id: f.id, name: f.name, fileTypeId: f.fileTypeId, parentId: f.parentId, imageUrl };
  });

  return NextResponse.json(items);
}
