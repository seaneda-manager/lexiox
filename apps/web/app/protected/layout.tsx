// apps/web/app/protected/layout.tsx
import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import TopbarClient from '@/components/dashboard/TopbarClient';
import SidebarClient from '@/components/dashboard/SidebarClient';
import SidebarProfile from '@/components/dashboard/SidebarProfile';
import MobileLexioxTabBar from '@/components/dashboard/MobileLexioxTabBar';
import PWAInstallBanner from '@/components/PWAInstallBanner';
import { LangProvider } from '@/contexts/LangContext';
import ProtectedLayoutClient from './_client/ProtectedLayoutClient';

type Role = 'student' | 'teacher' | 'admin';
type Program = 'gap' | 'toefl' | 'lexiox' | null;

export const revalidate = 0;

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // TODO: 테스트 후 인증 체크 복구
  // if (!user) redirect('/auth/login');

  const email = user?.email ?? 'test@example.com';

  let role: Role = 'student';
  let program: Program = null;
  let avatarUrl: string | null = null;
  let fullName: string | null = null;

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('role, program, full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null };

  if (profile?.role === 'admin' || profile?.role === 'teacher' || profile?.role === 'student') {
    role = profile.role;
  }
  if (profile?.program === 'gap' || profile?.program === 'toefl' || profile?.program === 'lexiox') {
    program = profile.program;
  }
  avatarUrl = profile?.avatar_url ?? null;
  fullName = profile?.full_name ?? null;

  const showMobileTabBar = role === 'student' && program === 'lexiox';

  // program 필드 하나로는 "복수 배정"을 못 나타낸다 — 예: program이 'toefl'인 학생도
  // Hi-내신 과제를 따로 배정받을 수 있는데, 그러면 사이드바에 Hi-내신 메뉴가 아예 안 보이는
  // 문제가 있었다(kimseung74@lexiox.com 사례). program이 'lexiox'가 아니어도 실제
  // hi_naesin_assignments가 있으면 사이드바에 Hi-내신 섹션을 추가로 보여준다.
  let hasHiNaesin = false;
  if (user && role === 'student' && program !== 'lexiox') {
    const { data: hiNaesinRow } = await supabase
      .from('hi_naesin_assignments')
      .select('id')
      .eq('student_id', user.id)
      .limit(1)
      .maybeSingle();
    hasHiNaesin = !!hiNaesinRow;
  }

  return (
    <LangProvider>
      <ProtectedLayoutClient
        email={email}
        role={role}
        program={program}
        avatarUrl={avatarUrl}
        fullName={fullName}
        showMobileTabBar={showMobileTabBar}
        hasHiNaesin={hasHiNaesin}
      >
        {children}
      </ProtectedLayoutClient>
    </LangProvider>
  );
}
