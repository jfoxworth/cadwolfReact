import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { db } from "@/utils/db";
import { sessionOptions, type SessionData } from "@/utils/session";

const VALID_USERNAME = /^[a-zA-Z0-9_-]+$/;

export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username } = await req.json() as { username?: string };
  const trimmed = username?.trim() ?? "";

  if (!trimmed) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }
  if (trimmed.length < 3) {
    return NextResponse.json({ error: "Must be at least 3 characters" }, { status: 400 });
  }
  if (trimmed.length > 30) {
    return NextResponse.json({ error: "Must be 30 characters or fewer" }, { status: 400 });
  }
  if (!VALID_USERNAME.test(trimmed)) {
    return NextResponse.json(
      { error: "Letters, numbers, underscores, and hyphens only — no spaces" },
      { status: 400 }
    );
  }

  try {
    const updated = await db.user.update({
      where: { id: session.userId },
      data: { username: trimmed },
      select: { id: true, username: true },
    });

    session.userUsername = updated.username;
    await session.save();

    return NextResponse.json({ username: updated.username });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("Unique constraint") && msg.includes("username")) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
