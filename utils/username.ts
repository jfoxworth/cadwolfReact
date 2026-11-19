import { db } from "@/utils/db";

/** The form of a username that routes compare on: lowercase, with spaces, "_" and "-" removed.
 *  This is the same rule utils/resolveRoute.ts uses to find a workspace from a username, so two
 *  usernames with the same normalised form would open the same workspace. */
export function normalizeUsername(username: string): string {
  return username.toLowerCase().replace(/[\s_-]/g, "");
}

/** True if another user already has a username that normalises to the same form. */
export async function isUsernameTaken(username: string, excludeUserId?: number): Promise<boolean> {
  const normalized = normalizeUsername(username);
  const users = await db.user.findMany({
    where: {
      username: { not: null },
      ...(excludeUserId !== undefined ? { id: { not: excludeUserId } } : {}),
    },
    select: { username: true },
  });
  return users.some((u) => normalizeUsername(u.username!) === normalized);
}
