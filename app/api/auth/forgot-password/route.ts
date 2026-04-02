import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/utils/db";
import { sendPasswordResetEmail } from "@/utils/email";
import { checkRateLimit, getClientIp } from "@/utils/rateLimit";

export async function POST(req: NextRequest) {
  const { limited } = checkRateLimit(`forgot-password:${getClientIp(req)}`, { limit: 3, windowMs: 60 * 60 * 1000 });
  if (limited) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  const { email } = await req.json() as { email?: string };

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const normalized = email.trim().toLowerCase();

  // Always return success to prevent user enumeration
  const user = await db.user.findUnique({ where: { email: normalized } });
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  await sendPasswordResetEmail(normalized, resetUrl);

  return NextResponse.json({ ok: true });
}
