import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { sendTeamInviteEmail } from "@/utils/email";

async function getTeamAndCheckAdmin(teamId: number, userId: number) {
  const team = await db.team.findUnique({
    where: { id: teamId },
    include: { members: true },
  });
  if (!team) return null;
  const isOwner = team.ownerId === userId;
  const isAdmin = isOwner || team.members.some((m) => m.userId === userId && m.role === "admin");
  if (!isAdmin) return null;
  return team;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  const { id } = await params;
  const teamId = parseInt(id);

  const team = await getTeamAndCheckAdmin(teamId, session.userId);
  if (!team) return NextResponse.json({ error: "Not found or forbidden" }, { status: 403 });

  const invites = await db.orgInvite.findMany({
    where: {
      teamId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invites);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  const { id } = await params;
  const teamId = parseInt(id);

  const team = await getTeamAndCheckAdmin(teamId, session.userId);
  if (!team) return NextResponse.json({ error: "Not found or forbidden" }, { status: 403 });

  const { email, role = "member" } = await req.json() as { email?: string; role?: string };
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  const normalizedEmail = email.toLowerCase().trim();

  // Check if already a member
  const existingUser = await db.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
  if (existingUser) {
    const isMember = team.members.some((m) => m.userId === existingUser.id);
    if (isMember) {
      return NextResponse.json({ error: "That person is already a member of this team" }, { status: 409 });
    }
  }

  // Delete any existing pending invite for this email+team (resend)
  await db.orgInvite.deleteMany({ where: { teamId, email: normalizedEmail, acceptedAt: null } });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.orgInvite.create({
    data: { teamId, email: normalizedEmail, role, token, expiresAt },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await sendTeamInviteEmail(normalizedEmail, `${appUrl}/accept-invite?token=${token}`, team.name, role);

  return NextResponse.json({ ok: true });
}
