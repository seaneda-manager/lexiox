'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import TopbarClient from '@/components/dashboard/TopbarClient';
import SidebarClient from '@/components/dashboard/SidebarClient';
import SidebarProfile from '@/components/dashboard/SidebarProfile';
import MobileLexioxTabBar from '@/components/dashboard/MobileLexioxTabBar';
import PWAInstallBanner from '@/components/PWAInstallBanner';

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

  // Hide sidebar and topbar for test/assignment routes
  const isFullscreenTest = /\/(updated-reading|updated-writing|updated-listening|updated-speaking|reading|listening|speaking|writing|speaking-2026).*(test|assignments)/.test(pathname);

  if (isFullscreenTest) {
    return <>{children}</>;
  }

  return (
    <div className="h-screen overflow-hidden grid grid-rows-[auto_1fr] bg-neutral-50 text-neutral-900" suppressHydrationWarning>
      <div>
        <TopbarClient email={email} role={role} />
      </div>
      <div className="grid grid-cols-[auto_1fr] min-h-0">
        <aside className="hidden md:flex md:flex-col h-full min-h-0 bg-neutral-50 border-r border-neutral-200/70">
          <div className="flex-1 min-h-0 overflow-hidden">
            <SidebarClient role={role} program={program} hasHiNaesin={hasHiNaesin} />
          </div>
          {role === 'student' && (
            <div className="shrink-0 mx-2 mb-1">
              <Link
                href="/student?tour=1"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-neutral-400 hover:bg-neutral-200/50 hover:text-neutral-600 transition-colors"
              >
                ❓ 가이드 다시보기
              </Link>
            </div>
          )}
          <div className="shrink-0">
            <SidebarProfile name={fullName ?? email} avatarUrl={avatarUrl} />
          </div>
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
