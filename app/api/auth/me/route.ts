import { NextResponse } from "next/server";
import { getSessionUserOrNull } from "@/utils/getSessionUser";

export async function GET() {
  const user = await getSessionUserOrNull();
  if (!user) return NextResponse.json(null, { status: 401 });
  return NextResponse.json({ userId: user.userId, name: user.userName, email: user.userEmail, username: user.userUsername ?? null });
}
