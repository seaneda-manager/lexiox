'use client';

import { ReactNode, useMemo } from 'react';
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
};

export default function ProtectedLayoutClient({
  children,
  email,
  role,
  program,
  avatarUrl,
  fullName,
  showMobileTabBar,
}: Props) {
  const pathname = usePathname();

  // Hide sidebar and topbar for reading/listening/speaking/writing tests and assignments
  const isFullscreenTest = useMemo(() => {
    return /\/(reading|listening|speaking|writing).*(test|assignments)/.test(pathname);
  }, [pathname]);

  if (isFullscreenTest) {
    return <>{children}</>;
  }

  return (
    <div className="h-screen overflow-hidden grid grid-rows-[auto_1fr] bg-neutral-50 text-neutral-900">
      <div>
        <TopbarClient email={email} role={role} />
      </div>
      <div className="grid grid-cols-[auto_1fr] min-h-0">
        <aside className="hidden md:flex md:flex-col h-full min-h-0 border-r border-neutral-100">
          <div className="flex-1 min-h-0 overflow-hidden">
            <SidebarClient role={role} program={program} />
          </div>
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
