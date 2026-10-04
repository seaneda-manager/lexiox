// apps/web/components/layout/RootShell.tsx
"use client";

import React from "react";
import { usePathname } from "next/navigation";
import ClientSiteHeader from "@/components/layout/ClientSiteHeader";

const APP_PREFIXES = [
  // ── (protected) 라우트 ──────────────────────────────────
  "/student",
  "/teacher",
  "/admin",
  "/dashboard",
  "/settings",
  "/profile",
  "/home",
  "/hi-naesin",
  "/naesin",
  "/vocab",
  "/voca",
  "/reading",
  "/updated-reading",
  "/listening",
  "/updated-listening",
  "/speaking",
  "/speaking-2026",
  "/updated-writing",
  "/writing",
  "/writing-2026",
  "/grammar-2026",
  "/toefl-2026",
  "/langgym",
  "/dev",
  // ── 기타 앱 영역 ────────────────────────────────────────
  "/toefl",
  "/lingox",
  "/focus",
  "/install",
  // 학부모 읽기 전용 리포트(/p/[token]) — 로그인 없는 공개 페이지라 마케팅 헤더(로그인 링크 등)를 붙이지 않고
  // 페이지가 자체 최소 화면을 그린다. ("/p" 는 정확히 /p 또는 /p/... 만 일치하므로 /pricing 등과 겹치지 않는다)
  "/p",
];

function isAppRoute(pathname: string) {
  if (pathname === "/") return true; // 랜딩 페이지는 자체 헤더 포함
  // /protected/* 는 정의상 전부 앱 영역이다 (ProtectedLayout이 자체 header를 그림) —
  // 미들웨어 rewrite를 거치지 않고 내부 경로로 직접 들어와도(예: 옛 북마크) 이중 헤더가
  // 나지 않도록 접두사 목록과 별개로 항상 앱 영역으로 취급한다.
  if (pathname === "/protected" || pathname.startsWith("/protected/")) return true;
  return APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default function RootShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";

  // ✅ 앱 영역: 전역 header/container를 씌우지 않는다 (각 앱 레이아웃이 책임)
  if (isAppRoute(pathname)) return <>{children}</>;

  // ✅ 마케팅/기타 영역: 기존처럼 header + max width wrapper 적용
  return (
    <>
      <ClientSiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
    </>
  );
}