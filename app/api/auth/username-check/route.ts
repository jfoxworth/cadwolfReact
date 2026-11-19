import { NextRequest, NextResponse } from "next/server";
import { isUsernameTaken } from "@/utils/username";
import { checkRateLimit, getClientIp } from "@/utils/rateLimit";

const VALID_USERNAME = /^[a-zA-Z0-9_-]+$/;

export async function GET(req: NextRequest) {
  const { limited } = checkRateLimit(`username-check:${getClientIp(req)}`, { limit: 30, windowMs: 60 * 1000 });
  if (limited) return NextResponse.json({ available: false, error: "Too many requests." }, { status: 429 });
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

  return NextResponse.json({ available: !(await isUsernameTaken(username)) });
}
