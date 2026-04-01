import { NextRequest, NextResponse } from "next/server";
import { upsertOAuthAccount } from "@/utils/cadAuth";

// GET /CAD — Fusion 360 OAuth callback (registered redirect URI)
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!code) {
    return NextResponse.redirect(`${appUrl}/cadConnect?cad_auth=error`);
  }

  const redirectUri = `${appUrl}/CAD`;
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: process.env.FUSION_CLIENT_ID!,
    client_secret: process.env.FUSION_CLIENT_SECRET!,
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch(
    "https://developer.api.autodesk.com/authentication/v1/gettoken",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    },
  );

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/cadConnect?cad_auth=error`);
  }

  const data = await tokenRes.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;
  await upsertOAuthAccount("fusion", data.access_token, data.refresh_token ?? null, expiresAt);

  return NextResponse.redirect(`${appUrl}/cadConnect?cad_auth=fusion_success`);
}
