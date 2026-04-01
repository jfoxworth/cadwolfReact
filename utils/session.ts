import type { SessionOptions } from "iron-session";

export interface SessionData {
  userId: number;
  userName: string;
  userEmail: string;
  userUsername?: string | null;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "cadwolf_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};
