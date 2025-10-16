import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getSessionFromRequest } from "@/lib/auth-edge";

const PUBLIC_ROUTES = ["/admin/login", "/api/admin/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTES.includes(pathname)) {
    const session = await getSessionFromRequest(request);
    if (session && pathname === "/admin/login") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const session = await getSessionFromRequest(request);
    if (!session) {
      if (pathname.startsWith("/api/admin")) {
        return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
      }
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
