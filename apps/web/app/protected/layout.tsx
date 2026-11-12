// apps/web/app/protected/layout.tsx
import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getServerSupabase } from '@/lib/supabase/server';
import TopbarClient from '@/components/dashboard/TopbarClient';
import SidebarClient from '@/components/dashboard/SidebarClient';
import SidebarProfile from '@/components/dashboard/SidebarProfile';
import MobileLexioxTabBar from '@/components/dashboard/MobileLexioxTabBar';
import PWAInstallBanner from '@/components/PWAInstallBanner';
import { LangProvider } from '@/contexts/LangContext';
import ProtectedLayoutClient from './_client/ProtectedLayoutClient';
import { VIEW_AS_COOKIE, parseViewAs, resolveEffectiveRole } from '@/lib/auth/viewAs';
import { defaultPermissionsForRole, type AppRole } from '@/lib/auth/permissions';

type Role = AppRole;
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

  if (
    profile?.role === 'admin' ||
    profile?.role === 'teacher' ||
    profile?.role === 'student' ||
    profile?.role === 'franchisee' ||
    profile?.role === 'hq_staff'
  ) {
    role = profile.role as Role;
  }
  if (profile?.program === 'gap' || profile?.program === 'toefl' || profile?.program === 'lexiox') {
    program = profile.program;
  }
  avatarUrl = profile?.avatar_url ?? null;
  fullName = profile?.full_name ?? null;

  const showMobileTabBar = role === 'student' && program === 'lexiox';

  // Super(admin) 계정의 "역할 미리보기": 본사직원/원장/선생님 화면을 로그아웃 없이 전환해서 본다.
  // 메뉴 구성만 바꾼다 — 실제 접근 권한은 진짜 역할(role)이 결정한다. admin 이 아니면 쿠키는 무시.
  const viewAs = role === 'admin' ? parseViewAs((await cookies()).get(VIEW_AS_COOKIE)?.value) : null;
  const effectiveRole = resolveEffectiveRole(role, viewAs);
  const permissions = defaultPermissionsForRole(effectiveRole);

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

  // 위와 동일한 이유로 중학내신도 program 필드만으로는 표현이 안 됨 — program이
  // 'toefl'인 학생도 middle_naesin_assignments를 따로 배정받을 수 있다.
  let hasMiddleNaesin = false;
  if (user && role === 'student' && program !== 'lexiox') {
    const { data: middleNaesinRow } = await supabase
      .from('middle_naesin_assignments')
      .select('id')
      .eq('student_id', user.id)
      .limit(1)
      .maybeSingle();
    hasMiddleNaesin = !!middleNaesinRow;
  }

  return (
    <LangProvider>
      <ProtectedLayoutClient
        email={email}
        role={effectiveRole}
        actualRole={role}
        viewAs={viewAs}
        permissions={permissions}
        program={program}
        avatarUrl={avatarUrl}
        fullName={fullName}
        showMobileTabBar={showMobileTabBar}
        hasHiNaesin={hasHiNaesin}
        hasMiddleNaesin={hasMiddleNaesin}
      >
        {children}
      </ProtectedLayoutClient>
    </LangProvider>
  );
}
