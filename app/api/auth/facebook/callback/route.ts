import { NextRequest, NextResponse } from "next/server";
import { findOrCreateOAuthUser } from "@/utils/oauthLogin";

interface FacebookTokenResponse {
  access_token: string;
  expires_in?: number;
}

interface FacebookUserInfo {
  id: string;
  name: string;
  email?: string;
  picture?: { data?: { url?: string } };
}

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${appUrl}/login?error=facebook_cancelled`);
  }

  // Exchange code for tokens
  const tokenParams = new URLSearchParams({
    code,
    client_id: process.env.FACEBOOK_CLIENT_ID!,
    client_secret: process.env.FACEBOOK_CLIENT_SECRET!,
    redirect_uri: `${appUrl}/api/auth/facebook/callback`,
  });

  const tokenRes = await fetch(
    `https://graph.facebook.com/v18.0/oauth/access_token?${tokenParams.toString()}`,
  );

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/login?error=facebook_token`);
  }

  const tokens = await tokenRes.json() as FacebookTokenResponse;

  // Fetch user profile
  const userParams = new URLSearchParams({
    fields: "id,name,email,picture",
    access_token: tokens.access_token,
  });

  const userRes = await fetch(
    `https://graph.facebook.com/me?${userParams.toString()}`,
  );

  if (!userRes.ok) {
    return NextResponse.redirect(`${appUrl}/login?error=facebook_userinfo`);
  }

  const profile = await userRes.json() as FacebookUserInfo;

  if (!profile.email) {
    // Facebook can withhold the email if the user denies that permission
    return NextResponse.redirect(`${appUrl}/login?error=facebook_no_email`);
  }

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : null;

  const { username, isNewUser } = await findOrCreateOAuthUser({
    provider: "facebook",
    providerAccountId: profile.id,
    email: profile.email,
    name: profile.name,
    photoUrl: profile.picture?.data?.url ?? null,
    accessToken: tokens.access_token,
    refreshToken: null,
    expiresAt,
  });

  if (isNewUser || !username) {
    return NextResponse.redirect(`${appUrl}/choose-username`);
  }

  return NextResponse.redirect(`${appUrl}/workspace/${username}`);
}
