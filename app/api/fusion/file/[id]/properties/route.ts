import { NextRequest, NextResponse } from "next/server";
import { getItemTip, getPhysicalProperties } from "@/utils/fusion";

// GET /api/fusion/file/[id]/properties?projectId=...
// Returns normalized CadPart-compatible physical properties for a Fusion item.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  try {
    const tip = await getItemTip(projectId, id);
    if (!tip?.urn) return NextResponse.json({ error: "Could not resolve item version" }, { status: 404 });

    const props = await getPhysicalProperties(tip.urn);
    if (!props) return NextResponse.json({ error: "Physical properties not available" }, { status: 404 });

    return NextResponse.json({
      versionId: tip.id,
      properties: {
        mass:    props.mass,
        volume:  props.volume,
        surface: props.area,
        weight:  props.mass * 9.80665,
        density: props.density,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
