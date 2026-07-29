// apps/web/middleware.ts - Route rewrites for protected paths

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Jr 경로는 독립 서비스로 proxy (localhost:3001)
  if (pathname.startsWith("/jr")) {
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
    pathname.startsWith("/reading") ||
    pathname.startsWith("/listening") ||
    pathname.startsWith("/speaking") ||
    pathname.startsWith("/writing") ||
    pathname.startsWith("/vocab") ||
    pathname.startsWith("/grammar") ||
    pathname.startsWith("/naesin") ||
    pathname.startsWith("/hi-naesin") ||
    pathname.startsWith("/updated-") ||
    pathname.startsWith("/speaking-2026") ||
    pathname.match(/^\/\w+\/(study|test|drill|review)/)
  ) {
    const url = req.nextUrl.clone();
    url.pathname = `/protected${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets/|legacy/).*)",
  ],
};