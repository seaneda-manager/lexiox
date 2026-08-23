// apps/web/middleware.ts - Route rewrites for protected paths

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  let pathname = req.nextUrl.pathname;

  // Normalize uppercase letters to lowercase in path
  // /admin/vocab/Tracks -> /admin/vocab/tracks
  const hasUppercase = /[A-Z]/.test(pathname);
  if (hasUppercase) {
    const normalizedPath = pathname
      .split('/')
      .map(segment => segment.toLowerCase())
      .join('/');

    if (normalizedPath !== pathname) {
      pathname = normalizedPath;
    }
  }

  // Production에서는 /jr도 protected로 rewrite
  // Development에서는 localhost:3001로 proxy할 수 있으나, production은 /protected/jr 사용
  if (process.env.NODE_ENV === 'development' && pathname.startsWith("/jr")) {
    const url = req.nextUrl.clone();
    url.hostname = 'localhost';
    url.port = '3001';
    return NextResponse.rewrite(url);
  }

  // Rewrite protected routes to /protected prefix
  // Preserves /admin, /student, /teacher, etc. but serves from /protected/...
  if (
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/student/") ||
    pathname.startsWith("/student") ||
    pathname.startsWith("/teacher/") ||
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/vocab/") ||
    pathname === "/vocab" ||
    pathname.startsWith("/workout/") ||
    pathname === "/workout" ||
    pathname.startsWith("/speaking-2026") ||
    pathname.startsWith("/listening-2026") ||
    pathname.startsWith("/reading-2026") ||
    pathname.startsWith("/writing-2026") ||
    pathname.startsWith("/grammar-2026") ||
    pathname.startsWith("/updated-speaking") ||
    pathname.startsWith("/updated-listening") ||
    pathname.startsWith("/updated-reading") ||
    pathname.startsWith("/updated-writing") ||
    pathname.startsWith("/hi-naesin") ||
    pathname.startsWith("/jr") ||
    pathname === "/naesin" ||
    pathname.startsWith("/naesin/")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = `/protected${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets/|legacy/|api/).*)",
  ],
};
