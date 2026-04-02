import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/utils/stripe";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const body = await req.json().catch(() => ({})) as { teamId?: number };

  let customerId: string | null = null;

  if (body.teamId) {
    const team = await db.team.findFirst({
      where: { id: body.teamId, ownerId: session.userId },
    });
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
    customerId = team.stripeCustomerId ?? null;
  } else {
    const user = await db.user.findUniqueOrThrow({ where: { id: session.userId } });
    customerId = user.stripeCustomerId ?? null;
  }

  if (!customerId) {
    return NextResponse.json({ error: "No billing account found" }, { status: 400 });
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
