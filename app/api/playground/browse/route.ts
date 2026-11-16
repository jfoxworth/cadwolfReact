import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

export interface PlaygroundBrowseItem {
  id: number;
  name: string;
  fileTypeId: string; // "Workspace" | "Folder" | "Document"
}

// GET /api/playground/browse?parentId=null|<id>
// Used by the document chooser on /ai/documentPlayground. Unlike /api/file-browse it lists workspaces
// nested inside workspaces (most of the tree is made of them), and only returns what the user is
// allowed to view.
//   No parentId -> the user's own top-level workspaces
//   With parentId -> the workspaces, folders and documents inside it
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("parentId");
  const parentId = raw === null || raw === "null" ? null : Number(raw);
  if (parentId !== null && !Number.isInteger(parentId)) {
    return NextResponse.json({ error: "Invalid parentId" }, { status: 400 });
  }

  const { userId } = await getSessionUser();

  if (parentId !== null && !(await checkPermission(parentId, userId, "view"))) {
    return NextResponse.json([] as PlaygroundBrowseItem[]);
  }

  const files = await db.file.findMany({
    where: {
      parentId,
      deletedAt: null,
      fileTypeId: { in: ["Workspace", "Folder", "Document"] },
      ...(parentId === null ? { userId } : {}),
    },
    orderBy: [{ fileTypeId: "asc" }, { name: "asc" }],
    select: { id: true, name: true, fileTypeId: true },
  });

  return NextResponse.json(files as PlaygroundBrowseItem[]);
}
