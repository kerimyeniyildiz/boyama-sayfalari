import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getSessionFromRequest } from "@/lib/auth-edge";

const PUBLIC_ROUTES = ["/admin/login", "/api/admin/login"];
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isSameOriginMutation(request: NextRequest) {
  if (!UNSAFE_METHODS.has(request.method.toUpperCase())) {
    return true;
  }

  const host = request.headers.get("host");
  if (!host) {
    return false;
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminRoute =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  if (
    isAdminRoute &&
    UNSAFE_METHODS.has(request.method.toUpperCase()) &&
    !isSameOriginMutation(request)
  ) {
    return NextResponse.json(
      { error: "Geçersiz istek kaynağı." },
      { status: 403 }
    );
  }

  if (PUBLIC_ROUTES.includes(pathname)) {
    const session = await getSessionFromRequest(request);
    if (session && pathname === "/admin/login") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (isAdminRoute) {
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
