import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";

const VALID_USERNAME = /^[a-zA-Z0-9_-]+$/;

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")?.trim() ?? "";

  if (!username) {
    return NextResponse.json({ available: false, error: "Username is required" });
  }
  if (username.length < 3) {
    return NextResponse.json({ available: false, error: "Must be at least 3 characters" });
  }
  if (username.length > 30) {
    return NextResponse.json({ available: false, error: "Must be 30 characters or fewer" });
  }
  if (!VALID_USERNAME.test(username)) {
    return NextResponse.json({ available: false, error: "Letters, numbers, underscores, and hyphens only" });
  }

  const existing = await db.user.findFirst({ where: { username } });
  return NextResponse.json({ available: !existing });
}
