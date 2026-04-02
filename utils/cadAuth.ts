import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";

async function currentUserId(): Promise<number> {
  const session = await getSessionUser();
  return session.userId;
}

export async function getOAuthAccount(provider: "onshape" | "fusion", userId?: number) {
  const uid = userId ?? await currentUserId();
  return db.oAuthAccount.findUnique({
    where: { userId_provider: { userId: uid, provider } },
  });
}

export async function upsertOAuthAccount(
  provider: "onshape" | "fusion",
  accessToken: string,
  refreshToken: string | null,
  expiresAt: Date | null,
  userId?: number,
) {
  const uid = userId ?? await currentUserId();
  return db.oAuthAccount.upsert({
    where: { userId_provider: { userId: uid, provider } },
    create: { userId: uid, provider, accessToken, refreshToken, expiresAt },
    update: { accessToken, refreshToken, expiresAt },
  });
}

function makeReauthError(provider: string): Error {
  const err = new Error(`${provider}_REAUTH_REQUIRED`) as Error & { reauth: boolean };
  err.reauth = true;
  return err;
}

export function isReauthError(err: unknown): boolean {
  return err instanceof Error && (err as Error & { reauth?: boolean }).reauth === true;
}

async function refreshOnshapeToken(refreshToken: string) {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: process.env.ONSHAPE_CLIENT_ID!,
    client_secret: process.env.ONSHAPE_CLIENT_SECRET!,
  });
  const res = await fetch("https://oauth.onshape.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    if (res.status === 400 || res.status === 401) throw makeReauthError("onshape");
    throw new Error(`Onshape refresh failed: ${res.status}`);
  }
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in?: number }>;
}

async function refreshFusionToken(refreshToken: string) {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: process.env.FUSION_CLIENT_ID!,
    client_secret: process.env.FUSION_CLIENT_SECRET!,
  });
  const res = await fetch("https://developer.api.autodesk.com/authentication/v1/refreshtoken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    if (res.status === 400 || res.status === 401) throw makeReauthError("fusion");
    throw new Error(`Fusion refresh failed: ${res.status}`);
  }
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in?: number }>;
}

/** Returns a valid access token, refreshing if needed. Throws if not authenticated. */
export async function getValidToken(provider: "onshape" | "fusion", userId?: number): Promise<string> {
  const uid = userId ?? await currentUserId();
  const acct = await getOAuthAccount(provider, uid);
  if (!acct) throw new Error(`Not authenticated with ${provider}`);

  // If token expires in > 60 seconds, use it directly
  if (acct.expiresAt && acct.expiresAt.getTime() - Date.now() > 60_000) {
    return acct.accessToken;
  }

  if (!acct.refreshToken) throw new Error(`No refresh token for ${provider}`);

  const refreshFn = provider === "onshape" ? refreshOnshapeToken : refreshFusionToken;
  const data = await refreshFn(acct.refreshToken);

  const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;
  await upsertOAuthAccount(
    provider,
    data.access_token,
    data.refresh_token ?? acct.refreshToken,
    expiresAt,
    uid,
  );

  return data.access_token;
}
