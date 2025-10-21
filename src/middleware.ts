// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuth = !!token;
  const { pathname, searchParams } = req.nextUrl;

  // 1) Уже залогинен и пришёл на /login → уводим на next (или /)
  if (pathname === "/login" && isAuth) {
    const next = searchParams.get("next") || "/";
    const url = new URL(next, req.url);
    // гарантируем, что остаёмся на том же origin
    url.protocol = new URL(req.url).protocol;
    url.host = new URL(req.url).host;
    return NextResponse.redirect(url);
  }

  // 2) Защита приватных разделов (пример: /profile и /me)
  const protectedPrefixes = ["/profile", "/me"];
  const wantsProtected = protectedPrefixes.some((p) => pathname.startsWith(p));

  if (wantsProtected && !isAuth) {
    const loginUrl = new URL("/login", req.url);
    const next = pathname + (req.nextUrl.search || "");
    loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/profile/:path*", "/me"],
};
