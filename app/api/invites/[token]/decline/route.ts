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

  if (invite.email.toLowerCase() !== session.userEmail.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.orgInvite.delete({ where: { id: invite.id } });

  return NextResponse.json({ ok: true });
}
