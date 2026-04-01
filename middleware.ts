import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/utils/session";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  // iron-session v8: pass req + res for middleware context
  const session = await getIronSession<SessionData>(req as unknown as Request, res as unknown as Response, sessionOptions);

  if (!session.userId) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ["/workspace/:path*", "/document/:path*", "/dataset/:path*", "/part-tree/:path*"],
};
