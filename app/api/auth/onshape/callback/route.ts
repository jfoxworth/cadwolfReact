import { NextRequest, NextResponse } from "next/server";
import { upsertOAuthAccount } from "@/utils/cadAuth";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!code) {
    return NextResponse.redirect(`${appUrl}?cad_auth=error`);
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: process.env.ONSHAPE_CLIENT_ID!,
    client_secret: process.env.ONSHAPE_CLIENT_SECRET!,
  });

  const tokenRes = await fetch("https://oauth.onshape.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}?cad_auth=error`);
  }

  const data = await tokenRes.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;
  await upsertOAuthAccount("onshape", data.access_token, data.refresh_token ?? null, expiresAt);

  return NextResponse.redirect(`${appUrl}/cadConnect?cad_auth=onshape_success`);
}
