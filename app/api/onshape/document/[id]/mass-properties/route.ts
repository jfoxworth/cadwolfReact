import { NextRequest, NextResponse } from "next/server";
import { getMassProperties } from "@/utils/onshape";

// GET /api/onshape/document/[id]/mass-properties?workspaceId=...&elementId=...
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  const elementId = req.nextUrl.searchParams.get("elementId");

  if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  if (!elementId) return NextResponse.json({ error: "elementId required" }, { status: 400 });

  try {
    const properties = await getMassProperties(id, workspaceId, elementId);
    return NextResponse.json(properties);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
