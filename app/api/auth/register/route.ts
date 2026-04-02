import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/utils/db";
import { sessionOptions, type SessionData } from "@/utils/session";
import { sendVerificationEmail } from "@/utils/email";
import { checkRateLimit, getClientIp } from "@/utils/rateLimit";

const VALID_USERNAME = /^[a-zA-Z0-9_-]+$/;

export async function POST(req: NextRequest) {
  const { limited } = checkRateLimit(`register:${getClientIp(req)}`, { limit: 5, windowMs: 60 * 60 * 1000 });
  if (limited) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  const { name, email, password, username } = await req.json() as {
    name: string;
    email: string;
    password: string;
    username: string;
  };

  if (!name || !email || !password || !username) {
    return NextResponse.json({ error: "Name, email, username, and password are required" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const trimmedUsername = username.trim();
  if (trimmedUsername.length < 3) {
    return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
  }
  if (trimmedUsername.length > 30) {
    return NextResponse.json({ error: "Username must be 30 characters or fewer" }, { status: 400 });
  }
  if (!VALID_USERNAME.test(trimmedUsername)) {
    return NextResponse.json(
      { error: "Username may only contain letters, numbers, underscores, and hyphens — no spaces" },
      { status: 400 }
    );
  }

  const existingEmail = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existingEmail) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }

  const existingUsername = await db.user.findFirst({ where: { username: trimmedUsername } });
  if (existingUsername) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      username: trimmedUsername,
    },
  });

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.userId = user.id;
  session.userName = user.name;
  session.userEmail = user.email;
  session.userUsername = user.username ?? null;
  await session.save();

  // Send verification email (fire-and-forget; don't block registration on email failure)
  try {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await db.emailVerificationToken.create({ data: { userId: user.id, token, expiresAt } });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    await sendVerificationEmail(user.email, `${appUrl}/verify-email?token=${token}`);
  } catch { /* non-fatal */ }

  return NextResponse.json({ id: user.id, name: user.name, email: user.email, username: user.username }, { status: 201 });
}
