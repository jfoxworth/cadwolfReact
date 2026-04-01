import { NextResponse } from "next/server";
import { listHubs } from "@/utils/fusion";

// GET /api/fusion/hubs
export async function GET() {
  try {
    const hubs = await listHubs();
    return NextResponse.json({ data: hubs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.includes("401") ? 401 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
