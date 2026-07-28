// apps/web/app/protected/layout.tsx
import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
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

  return (
    <LangProvider>
      <ProtectedLayoutClient
        email={email}
        role={role}
        program={program}
        avatarUrl={avatarUrl}
        fullName={fullName}
        showMobileTabBar={showMobileTabBar}
      >
        {children}
      </ProtectedLayoutClient>
    </LangProvider>
  );
}
