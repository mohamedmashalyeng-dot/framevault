import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic redirect for signed-out visitors. This only checks that a
 * session cookie exists; every page, action and route still verifies the
 * session and role on the server before returning anything private.
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const url = new URL(`/sign-in?next=${encodeURIComponent(next)}`, request.url);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};
