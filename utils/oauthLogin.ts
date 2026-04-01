import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { db } from "@/utils/db";
import { sessionOptions, type SessionData } from "@/utils/session";

/**
 * Shared logic for Google/Facebook (identity) OAuth callbacks.
 *
 * 1. Look for an existing OAuthAccount row by (provider, providerAccountId)
 *    → if found, load the linked user
 * 2. If not found, check if a user with this email already exists
 *    → if yes, link the new OAuth account to that user
 *    → if no, create a new user (no password) and a new OAuthAccount
 * 3. Set the iron-session (same fields as email/password login)
 * 4. Return the userId so the caller can redirect appropriately
 */
export async function findOrCreateOAuthUser(opts: {
  provider: string;
  providerAccountId: string;
  email: string;
  name: string;
  photoUrl?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
}): Promise<{ userId: number; username: string | null; isNewUser: boolean }> {
  const {
    provider,
    providerAccountId,
    email,
    name,
    photoUrl,
    accessToken,
    refreshToken,
    expiresAt,
  } = opts;

  // Step 1: look up by existing OAuth link
  const existingOAuth = await db.oAuthAccount.findFirst({
    where: { provider, providerAccountId },
  });

  let userId: number;
  let isNewUser = false;

  if (existingOAuth) {
    userId = existingOAuth.userId;
    // Refresh the stored token
    await db.oAuthAccount.update({
      where: { id: existingOAuth.id },
      data: { accessToken, refreshToken, expiresAt },
    });
  } else {
    // Step 2: find or create the user by email
    let user = await db.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user) {
      user = await db.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: null,
          photoUrl: photoUrl ?? null,
        },
      });
      isNewUser = true;
    } else if (photoUrl && !user.photoUrl) {
      // Backfill photo if they don't have one yet
      await db.user.update({ where: { id: user.id }, data: { photoUrl } });
    }

    userId = user.id;

    // Create the OAuth link (upsert in case of a race)
    await db.oAuthAccount.upsert({
      where: { userId_provider: { userId, provider } },
      create: {
        userId,
        provider,
        providerAccountId,
        accessToken,
        refreshToken,
        expiresAt,
      },
      update: {
        providerAccountId,
        accessToken,
        refreshToken,
        expiresAt,
      },
    });
  }

  // Step 3: load the final user record and set the session
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.userId = user.id;
  session.userName = user.name;
  session.userEmail = user.email;
  session.userUsername = user.username ?? null;
  await session.save();

  return { userId: user.id, username: user.username ?? null, isNewUser };
}
