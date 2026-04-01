import { NextRequest, NextResponse } from "next/server";
import { listFolderContents, getProjectTopFolder } from "@/utils/fusion";

// GET /api/fusion/files?projectId=...&hubId=...&folderId=...
// If folderId is omitted, fetches the project's root "Project Files" folder contents.
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  const hubId = req.nextUrl.searchParams.get("hubId");
  const folderId = req.nextUrl.searchParams.get("folderId");

  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  try {
    let resolvedFolderId = folderId;
    if (!resolvedFolderId) {
      if (!hubId) return NextResponse.json({ error: "hubId required when folderId is omitted" }, { status: 400 });
      resolvedFolderId = await getProjectTopFolder(hubId, projectId);
      if (!resolvedFolderId) return NextResponse.json({ data: [] });
    }

    const items = await listFolderContents(projectId, resolvedFolderId);
    // Return folders first, then Fusion files (.f3d)
    const sorted = items.sort((a, b) => {
      const aIsFolder = a.type === "folders" ? 0 : 1;
      const bIsFolder = b.type === "folders" ? 0 : 1;
      return aIsFolder - bIsFolder || a.attributes.name.localeCompare(b.attributes.name);
    });
    return NextResponse.json({ data: sorted });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
