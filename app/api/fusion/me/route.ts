import { NextResponse } from "next/server";
import { getValidToken } from "@/utils/cadAuth";

// GET /api/fusion/me — returns the connected Fusion user's profile
export async function GET() {
  try {
    const token = await getValidToken("fusion");
    const res = await fetch("https://developer.api.autodesk.com/userprofile/v1/users/@me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return NextResponse.json({ error: "Not connected" }, { status: 401 });
    const data = await res.json() as {
      userId: string;
      firstName?: string;
      lastName?: string;
      emailId?: string;
      profileImages?: { sizeX40?: string };
    };
    return NextResponse.json({
      id: data.userId,
      name: [data.firstName, data.lastName].filter(Boolean).join(" "),
      email: data.emailId,
      image: data.profileImages?.sizeX40,
    });
  } catch {
    return NextResponse.json({ error: "Not connected" }, { status: 401 });
  }
}
