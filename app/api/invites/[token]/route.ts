import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const invite = await db.orgInvite.findUnique({
    where: { token },
    include: { team: { select: { name: true } } },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  return NextResponse.json({
    teamId: invite.teamId,
    teamName: invite.team.name,
    email: invite.email,
    role: invite.role,
    expired: invite.expiresAt < new Date(),
    accepted: !!invite.acceptedAt,
  });
}
