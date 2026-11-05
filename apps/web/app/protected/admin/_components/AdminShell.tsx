// apps/web/app/(protected)/admin/_components/AdminShell.tsx
import type { ReactNode } from "react";

/**
 * 관리자 화면 본문 틀.
 * 예전에는 여기에 "Admin | 대시보드 | Problem Bank | Daily Tests" 상단 메뉴(sticky)가 있었지만,
 * 같은 메뉴가 사이드바에 이미 있고 스크롤할 때 콘텐츠를 덮어서 제거했다.
 * (앱 레이아웃이 이미 <main> 을 가지고 있으므로 여기서는 <div> 를 쓴다)
 */
export default function AdminShell({ children }: { children: ReactNode }) {
  return <div className="p-4 max-w-6xl w-full mx-auto">{children}</div>;
}
