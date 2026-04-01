import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!clientId) {
    return NextResponse.json({ error: "FACEBOOK_CLIENT_ID not configured" }, { status: 500 });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl}/api/auth/facebook/callback`,
    response_type: "code",
    scope: "email,public_profile",
  });

  return NextResponse.redirect(
    `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`,
  );
}
