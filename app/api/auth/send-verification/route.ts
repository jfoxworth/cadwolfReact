import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { sendVerificationEmail } from "@/utils/email";

export async function POST() {
  const session = await getSessionUser();

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, emailVerifiedAt: true },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.emailVerifiedAt) return NextResponse.json({ ok: true }); // already verified

  // Delete any existing tokens for this user before creating a new one
  await db.emailVerificationToken.deleteMany({ where: { userId: user.id } });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.emailVerificationToken.create({ data: { userId: user.id, token, expiresAt } });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await sendVerificationEmail(user.email, `${appUrl}/verify-email?token=${token}`);

  return NextResponse.json({ ok: true });
}
