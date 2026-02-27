// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

function computeUiMode(pathname: string) {
  // FULL: только "/" и "/world/*"
  if (pathname === "/" || pathname.startsWith("/world")) return "full";
  return "shell";
}

function cookieOpts() {
  return {
    path: "/",
    sameSite: "lax" as const,
    // ✅ На localhost secure-cookie не сохраняется (http), поэтому только в prod
    secure: process.env.NODE_ENV === "production",
  };
}

function applyUiModeCookie(req: NextRequest, res: NextResponse) {
  const mode = computeUiMode(req.nextUrl.pathname);
  res.cookies.set("ui_mode", mode, cookieOpts());
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // ✅ Базовый next() уже с ui_mode cookie
  const baseNext = applyUiModeCookie(req, NextResponse.next());

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuth = !!token;

  // 0) Temporary redirect: /archive/* -> /world/*
  if (pathname === "/archive" || pathname.startsWith("/archive/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(/^\/archive(?=\/|$)/, "/world");
    const res = NextResponse.redirect(url);
    res.cookies.set("ui_mode", "full", cookieOpts());
    return res;
  }

  // 1) Уже залогинен и пришёл на /login → уводим на next (или /)
  if (pathname === "/login" && isAuth) {
    const next = searchParams.get("next") || "/";
    const url = new URL(next, req.url);
    url.protocol = new URL(req.url).protocol;
    url.host = new URL(req.url).host;

    const res = NextResponse.redirect(url);
    res.cookies.set("ui_mode", computeUiMode(url.pathname), cookieOpts());
    return res;
  }

  // 2) Защита приватных разделов (пример: /profile и /me)
  const protectedPrefixes = ["/profile", "/me"];
  const wantsProtected = protectedPrefixes.some((p) => pathname.startsWith(p));

  if (wantsProtected && !isAuth) {
    const loginUrl = new URL("/login", req.url);
    const next = pathname + (req.nextUrl.search || "");
    loginUrl.searchParams.set("next", next);

    const res = NextResponse.redirect(loginUrl);
    res.cookies.set("ui_mode", "shell", cookieOpts());
    return res;
  }

  return baseNext;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|woff|woff2|ttf|otf)$).*)",
  ],
};
