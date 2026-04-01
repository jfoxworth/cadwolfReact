import { NextRequest, NextResponse } from "next/server";
import { listElements } from "@/utils/onshape";

// GET /api/onshape/document/[id]/elements?workspaceId=...
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

  const withThumbnails = req.nextUrl.searchParams.get("withThumbnails") === "true";
  try {
    const elements = await listElements(id, workspaceId, withThumbnails);
    const arr = Array.isArray(elements) ? elements : [];
    // Only return Part Studios and Assemblies (they have features)
    const filtered = arr.filter((e) => e.type === "PARTSTUDIO" || e.type === "ASSEMBLY");
    // If filter removes everything, return all elements so the caller can debug
    return NextResponse.json(filtered.length > 0 ? filtered : arr);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
