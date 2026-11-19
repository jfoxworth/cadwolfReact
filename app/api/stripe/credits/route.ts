import { NextRequest, NextResponse } from "next/server";
import { stripe, CREDIT_PACKS } from "@/utils/stripe";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { CREDITS_PER_DOLLAR, dollarsToUnits } from "@/utils/aiCredits";

// POST /api/stripe/credits { packId, teamId? } — starts a one-time Stripe Checkout for an AI credit pack.
// With teamId the credits go to that team's shared pool; only the team's owner or an admin may buy them.
// The webhook (app/api/webhook/route.ts) adds the credits when the payment completes.
export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  const { packId, teamId } = await req.json() as { packId?: string; teamId?: number };
  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) return NextResponse.json({ error: "Unknown credit pack" }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const user = await db.user.findUniqueOrThrow({ where: { id: session.userId } });

  let customerId: string | null;
  if (teamId !== undefined && teamId !== null) {
    // Buying for a team: the buyer must be the team's owner or an admin. The payer is the team's
    // Stripe customer, the same one its Business subscription uses.
    const team = await db.team.findUnique({
      where: { id: Number(teamId) },
      include: { members: { where: { userId: user.id } } },
    });
    const role = team?.ownerId === user.id ? "owner" : team?.members[0]?.role;
    if (!team || (role !== "owner" && role !== "admin")) {
      return NextResponse.json({ error: "Only a team owner or admin can buy credits for the team" }, { status: 403 });
    }
    customerId = team.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: team.billingEmail ?? user.email,
        name: team.name,
        metadata: { teamId: String(team.id) },
      });
      customerId = customer.id;
      await db.team.update({ where: { id: team.id }, data: { stripeCustomerId: customerId } });
    }
  } else {
    customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: String(user.id) },
      });
      customerId = customer.id;
      await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }
  }

  const credits = pack.dollars * CREDITS_PER_DOLLAR;
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: pack.dollars * 100,
        product_data: { name: `${credits.toLocaleString("en-US")} AI credits` },
      },
    }],
    success_url: `${appUrl}/billing?credits=1`,
    cancel_url: `${appUrl}/billing`,
    metadata: {
      userId: String(user.id),
      kind: "credits",
      ...(teamId !== undefined && teamId !== null ? { teamId: String(teamId) } : {}),
      units: dollarsToUnits(pack.dollars).toString(),
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
