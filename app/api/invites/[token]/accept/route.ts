import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const session = await getSessionUser();
  const { token } = await params;

  const invite = await db.orgInvite.findUnique({ where: { token } });

  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: "This invite has already been used" }, { status: 409 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "This invite has expired" }, { status: 410 });

  if (invite.email.toLowerCase() !== session.userEmail.toLowerCase()) {
    return NextResponse.json(
      { error: `This invite was sent to ${invite.email}. Please sign in with that account.` },
      { status: 403 },
    );
  }

  await db.$transaction([
    db.teamMember.upsert({
      where: { teamId_userId: { teamId: invite.teamId, userId: session.userId } },
      create: { teamId: invite.teamId, userId: session.userId, role: invite.role },
      update: { role: invite.role },
    }),
    db.orgInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true, teamId: invite.teamId });
}
