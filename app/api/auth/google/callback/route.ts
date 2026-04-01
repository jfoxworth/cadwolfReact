import { NextRequest, NextResponse } from "next/server";
import { findOrCreateOAuthUser } from "@/utils/oauthLogin";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  id_token?: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${appUrl}/login?error=google_cancelled`);
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${appUrl}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }).toString(),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/login?error=google_token`);
  }

  const tokens = await tokenRes.json() as GoogleTokenResponse;

  // Fetch user info
  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userRes.ok) {
    return NextResponse.redirect(`${appUrl}/login?error=google_userinfo`);
  }

  const profile = await userRes.json() as GoogleUserInfo;

  if (!profile.email) {
    return NextResponse.redirect(`${appUrl}/login?error=google_no_email`);
  }

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : null;

  const { username, userId, isNewUser } = await findOrCreateOAuthUser({
    provider: "google",
    providerAccountId: profile.sub,
    email: profile.email,
    name: profile.name,
    photoUrl: profile.picture ?? null,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    expiresAt,
  });

  if (isNewUser || !username) {
    return NextResponse.redirect(`${appUrl}/choose-username`);
  }

  return NextResponse.redirect(`${appUrl}/workspace/${username}`);
}
