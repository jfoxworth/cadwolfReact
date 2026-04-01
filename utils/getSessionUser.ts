import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "./session";

/** Use in Server Components and API routes. Throws 401 if not authenticated. */
export async function getSessionUser(): Promise<SessionData> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId) {
    throw new Error("Unauthenticated");
  }
  return session;
}

/** Returns null instead of throwing — use when auth is optional. */
export async function getSessionUserOrNull(): Promise<SessionData | null> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  return session.userId ? session : null;
}
