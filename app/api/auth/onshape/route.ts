import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const clientId = process.env.ONSHAPE_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!clientId) {
    return NextResponse.json({ error: "ONSHAPE_CLIENT_ID not configured" }, { status: 500 });
  }

  const redirectUri = `${appUrl}/cadAuth`;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
  });

  return NextResponse.redirect(
    `https://oauth.onshape.com/oauth/authorize?${params.toString()}`,
  );
}
