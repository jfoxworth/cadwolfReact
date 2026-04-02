import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";

export async function POST(req: NextRequest) {
  const { token } = await req.json() as { token?: string };

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const record = await db.emailVerificationToken.findUnique({ where: { token } });

  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "This verification link is invalid or has expired" }, { status: 400 });
  }

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    db.emailVerificationToken.delete({ where: { id: record.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
