import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
// No auth required — caller is responsible for only passing accessible fileIds.

// POST /api/cad-connection/batch
// Body: { fileIds: number[] }
// Returns all CAD connections for the given file IDs.
export async function POST(req: NextRequest) {
  const body = await req.json() as { fileIds: number[] };
  const ids = (body.fileIds ?? []).map(String);
  if (ids.length === 0) return NextResponse.json([]);

  const connections = await db.cadConnection.findMany({
    where: { documentId: { in: ids }, deletedAt: null },
    orderBy: { id: "desc" },
  });

  return NextResponse.json(
    connections.map((c) => {
      let raw: Record<string, unknown> = {};
      try { raw = JSON.parse(c.info); } catch { /* ignore */ }

      // Normalize old format: { cad_data: { id, defaultWorkspace, element_id } }
      // into new format: { documentId, workspaceId, elementId }
      const cadData = raw.cad_data as Record<string, unknown> | undefined;
      let thumbnailUrl: string | undefined;
      if (cadData && !raw.documentId) {
        // Old format: { cad_data: { id, defaultWorkspace, element_id, element_data: { thumbnailInfo } } }
        const ws = cadData.defaultWorkspace as Record<string, unknown> | undefined;
        const elementData = cadData.element_data as Record<string, unknown> | undefined;
        const thumbInfo = elementData?.thumbnailInfo as Record<string, unknown> | undefined;
        const sizes = (thumbInfo?.sizes ?? []) as Array<{ size: string; href: string }>;
        thumbnailUrl = sizes[0]?.href;
        raw = {
          ...raw,
          documentId: (cadData.id ?? c.cadId) as string,
          workspaceId: ws?.id as string | undefined,
          elementId: (cadData.element_id ?? cadData.defaultElementId) as string | undefined,
        };
      } else if (raw.documentId) {
        // New format: { documentId, workspaceId, elementId, element_data: { thumbnailInfo } }
        const elementData = raw.element_data as Record<string, unknown> | undefined;
        const thumbInfo = elementData?.thumbnailInfo as Record<string, unknown> | undefined;
        const sizes = (thumbInfo?.sizes ?? []) as Array<{ size: string; href: string }>;
        thumbnailUrl = sizes[0]?.href;
      }

      const elementName = (raw.elementName as string | undefined) ?? (cadData?.element_name as string | undefined);
      return { id: c.id, fileId: Number(c.documentId), cadType: c.cadType, info: { ...raw, elementName }, thumbnailUrl };
    }),
  );
}
