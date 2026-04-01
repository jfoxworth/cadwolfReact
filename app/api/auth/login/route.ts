import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import bcrypt from "bcryptjs";
import { db } from "@/utils/db";
import { sessionOptions, type SessionData } from "@/utils/session";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json() as { email: string; password: string };

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      console.log("[login] no user found for email:", email.toLowerCase().trim());
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    console.log("[login] found user id:", user.id, "password null?", user.password === null);
    const valid = await bcrypt.compare(password, user.password ?? "");
    if (!valid) {
      console.log("[login] password mismatch for user id:", user.id);
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    session.userId = user.id;
    session.userName = user.name;
    session.userEmail = user.email;
    session.userUsername = user.username;
    await session.save();

    return NextResponse.json({ id: user.id, name: user.name, email: user.email, username: user.username });
  } catch (err) {
    console.error("[/api/auth/login]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
