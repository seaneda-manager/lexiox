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
  "/writing",
  "/writing-2026",
  "/grammar-2026",
  "/toefl-2026",
  "/dev",
  // ── 기타 앱 영역 ────────────────────────────────────────
  "/toefl",
  "/lingox",
  "/focus",
  "/install",
];

function isAppRoute(pathname: string) {
  if (pathname === "/") return true; // 랜딩 페이지는 자체 헤더 포함
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