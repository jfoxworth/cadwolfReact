import { NextResponse } from "next/server";
import { getValidToken } from "@/utils/cadAuth";

// GET /api/onshape/me — returns the connected Onshape user's profile
export async function GET() {
  try {
    const token = await getValidToken("onshape");
    const res = await fetch("https://cad.onshape.com/api/v6/users/sessioninfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return NextResponse.json({ error: "Not connected" }, { status: 401 });
    const data = await res.json() as { id: string; name: string; email: string; image?: string };
    return NextResponse.json({ id: data.id, name: data.name, email: data.email, image: data.image });
  } catch {
    return NextResponse.json({ error: "Not connected" }, { status: 401 });
  }
}
