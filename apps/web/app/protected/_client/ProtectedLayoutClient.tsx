'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import TopbarClient from '@/components/dashboard/TopbarClient';
import SidebarClient from '@/components/dashboard/SidebarClient';
import SidebarProfile from '@/components/dashboard/SidebarProfile';
import MobileLexioxTabBar from '@/components/dashboard/MobileLexioxTabBar';
import PWAInstallBanner from '@/components/PWAInstallBanner';
import { isExamRoute } from '@/lib/utils/examRoute';

type Role = 'student' | 'teacher' | 'admin';
type Program = 'gap' | 'toefl' | 'lexiox' | null;

type Props = {
  children: ReactNode;
  email: string;
  role: Role;
  program: Program;
  avatarUrl: string | null;
  fullName: string | null;
  showMobileTabBar: boolean;
  hasHiNaesin: boolean;
};

export default function ProtectedLayoutClient({
  children,
  email,
  role,
  program,
  avatarUrl,
  fullName,
  showMobileTabBar,
  hasHiNaesin,
}: Props) {
  const pathname = usePathname();
  const examRoute = isExamRoute(pathname);

  // 사이드바 접힘 상태를 여기서 소유한다 — SidebarClient 내부 state였을 때는 프로필 카드가
  // 접힘 여부를 전혀 몰라서, 시험/드릴 화면(사이드바가 자동으로 아이콘 폭으로 줄어드는 곳)에서
  // 프로필 카드만 원래 크기 그대로 남아 본문 위를 덮는 문제가 있었다.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (examRoute) setCollapsed(true);
  }, [examRoute]);

  useEffect(() => {
    const handler = () => setCollapsed((v) => !v);
    document.addEventListener('toggle-sidebar', handler);
    return () => document.removeEventListener('toggle-sidebar', handler);
  }, []);

  // Hide sidebar and topbar for test/assignment routes
  const isFullscreenTest = /\/(updated-reading|updated-writing|updated-listening|updated-speaking|reading|listening|speaking|writing|speaking-2026).*(test|assignments)/.test(pathname);

  if (isFullscreenTest) {
    return <>{children}</>;
  }

  const asideWidthClass = collapsed
    ? examRoute ? 'w-0 border-0 overflow-hidden' : 'w-14'
    : 'w-60';

  return (
    <div className="h-screen overflow-hidden grid grid-rows-[auto_1fr] bg-neutral-50 text-neutral-900" suppressHydrationWarning>
      <div>
        <TopbarClient email={email} role={role} />
      </div>
      <div className="grid grid-cols-[auto_1fr] min-h-0">
        <aside
          className={[
            'hidden md:flex md:flex-col h-full min-h-0 bg-neutral-50 border-r border-neutral-200/70 transition-all duration-300',
            asideWidthClass,
          ].join(' ')}
        >
          <div className="flex-1 min-h-0 overflow-hidden">
            <SidebarClient role={role} program={program} hasHiNaesin={hasHiNaesin} collapsed={collapsed} />
          </div>
          {!collapsed && role === 'student' && (
            <div className="shrink-0 mx-2 mb-1">
              <Link
                href="/student?tour=1"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-neutral-400 hover:bg-neutral-200/50 hover:text-neutral-600 transition-colors"
              >
                ❓ 가이드 다시보기
              </Link>
            </div>
          )}
          {!collapsed && (
            <div className="shrink-0">
              <SidebarProfile name={fullName ?? email} avatarUrl={avatarUrl} />
            </div>
          )}
        </aside>
        <main
          className={[
            'min-h-0 overflow-y-auto p-4 md:p-6',
            showMobileTabBar ? 'pb-20 md:pb-6' : '',
          ].join(' ')}
        >
          {children}
        </main>
      </div>
      {showMobileTabBar && <MobileLexioxTabBar />}
      <PWAInstallBanner />
    </div>
  );
}
