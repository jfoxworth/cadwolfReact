import { NextRequest, NextResponse } from "next/server";

// Auth is handled per-page using getSessionUserOrNull().
// Content routes (/workspace, /document, /dataset, /part-tree) allow public
// access when viewPerm = "everyone"; the page redirects to /login only when
// the content is restricted and the visitor is not authenticated.
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
