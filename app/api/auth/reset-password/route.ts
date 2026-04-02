import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/utils/db";
import { checkRateLimit, getClientIp } from "@/utils/rateLimit";

export async function POST(req: NextRequest) {
  const { limited } = checkRateLimit(`reset-password:${getClientIp(req)}`, { limit: 10, windowMs: 15 * 60 * 1000 });
  if (limited) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  const { token, password } = await req.json() as { token?: string; password?: string };

  if (!token || !password) {
    return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const record = await db.passwordResetToken.findUnique({ where: { token } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "This reset link is invalid or has expired" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { password: hashed },
    }),
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
