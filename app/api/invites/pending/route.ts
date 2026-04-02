import { NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";

export async function GET() {
  const session = await getSessionUser();

  const invites = await db.orgInvite.findMany({
    where: {
      email: session.userEmail.toLowerCase(),
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { team: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invites);
}
