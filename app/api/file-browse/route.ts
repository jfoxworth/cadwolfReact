import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";

export interface BrowseItem {
  id:         number;
  name:       string;
  fileTypeId: string;
  slug:       string | null;
  parentId:   number | null;
}

// GET /api/file-browse?parentId=null|<id>
// No parentId → user's root workspaces
// With parentId → folders + datasets inside that container
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("parentId");
  const parentId = raw === null || raw === "null" ? null : Number(raw);

  const { userId } = await getSessionUser();

  const files = await db.file.findMany({
    where: {
      parentId,
      deletedAt: null,
      fileTypeId: { in: parentId === null ? ["Workspace"] : ["Folder", "Document", "Dataset"] },
      ...(parentId === null ? { userId } : {}),
    },
    orderBy: [{ fileTypeId: "asc" }, { name: "asc" }],
    select: { id: true, name: true, fileTypeId: true, slug: true, parentId: true },
  });

  return NextResponse.json(files as BrowseItem[]);
}
