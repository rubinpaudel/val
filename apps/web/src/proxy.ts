import { type NextRequest, NextResponse } from "next/server";

const authRoutes = ["/auth/signin", "/auth/signup"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("better-auth.session_token")?.value;
  const isAuthenticated = !!sessionToken;

  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Authenticated user on auth pages → redirect to dashboard
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Unauthenticated user on any other matched route → redirect to sign in
  if (!isAuthRoute && !isAuthenticated) {
    const signinUrl = new URL("/auth/signin", request.url);
    if (pathname !== "/") {
      signinUrl.searchParams.set("callbackUrl", pathname);
    }
    return NextResponse.redirect(signinUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
