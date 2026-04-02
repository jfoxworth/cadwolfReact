import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";

export async function POST(req: NextRequest) {
  const { token } = await req.json() as { token?: string };

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const record = await db.emailChangeToken.findUnique({ where: { token } });

  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This link is invalid or has expired" },
      { status: 400 },
    );
  }

  // Check the new email isn't already taken (race condition guard)
  const existing = await db.user.findUnique({ where: { email: record.newEmail } });
  if (existing && existing.id !== record.userId) {
    await db.emailChangeToken.delete({ where: { id: record.id } });
    return NextResponse.json(
      { error: "That email address is already in use" },
      { status: 409 },
    );
  }

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: {
        email: record.newEmail,
        emailVerifiedAt: new Date(),
      },
    }),
    db.emailChangeToken.delete({ where: { id: record.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
