import { NextRequest, NextResponse } from "next/server";
import { listProjects } from "@/utils/fusion";

// GET /api/fusion/projects?hubId=...
export async function GET(req: NextRequest) {
  const hubId = req.nextUrl.searchParams.get("hubId");
  if (!hubId) return NextResponse.json({ error: "hubId required" }, { status: 400 });

  try {
    const projects = await listProjects(hubId);
    return NextResponse.json({ data: projects });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
