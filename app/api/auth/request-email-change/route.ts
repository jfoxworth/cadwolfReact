import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { sendEmailChangeEmail } from "@/utils/email";

export async function POST(req: NextRequest) {
  const session = await getSessionUser();

  const { newEmail, currentPassword } = await req.json() as {
    newEmail?: string;
    currentPassword?: string;
  };

  if (!newEmail || !newEmail.includes("@")) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, password: true },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (newEmail.toLowerCase() === user.email.toLowerCase()) {
    return NextResponse.json({ error: "That is already your email address" }, { status: 400 });
  }

  // If the user has a password set, require it
  if (user.password) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required" }, { status: 400 });
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 400 });
    }
  }

  // Check the new email isn't already taken
  const existing = await db.user.findUnique({ where: { email: newEmail.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "That email address is already in use" }, { status: 409 });
  }

  // Delete any existing pending change tokens for this user
  await db.emailChangeToken.deleteMany({ where: { userId: user.id } });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await db.emailChangeToken.create({
    data: { userId: user.id, newEmail: newEmail.toLowerCase(), token, expiresAt },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await sendEmailChangeEmail(newEmail, `${appUrl}/confirm-email-change?token=${token}`);

  return NextResponse.json({ ok: true });
}
