// components/dashboard/TopbarClient.tsx
'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabaseBrowser';
import { ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useLang } from '@/contexts/LangContext';

const PATH_LABELS: Record<string, { label: string; skill?: string }> = {
  '/student':              { label: '대시보드' },
  '/student/homework':     { label: '숙제 채점' },
  '/student/tests':        { label: '시험 목록' },
  '/student/review':       { label: '복습' },
  '/student/progress':     { label: '진도 현황' },
  '/updated-reading/study':   { label: 'Reading',   skill: 'reading' },
  '/updated-listening/study': { label: 'Listening', skill: 'listening' },
  '/speaking-2026/study':  { label: 'Speaking',  skill: 'speaking' },
  '/writing-2026/study':   { label: 'Writing',   skill: 'writing' },
  '/vocab':                { label: '단어 학습' },
  '/hi-naesin':            { label: '내신 드릴' },
  '/hi-naesin/stats':      { label: '학습 현황' },
  '/hi-naesin/review':     { label: '직전정리' },
  '/settings':             { label: '설정' },
  '/admin':                { label: '관리자' },
  '/teacher/home':         { label: '선생님 홈' },
  '/teacher/students':     { label: '학생 관리' },
  '/teacher/tasks':        { label: '할 일 관리' },
};

const SKILL_LABEL_COLOR: Record<string, string> = {
  reading:   'text-blue-600',
  listening: 'text-violet-600',
  speaking:  'text-orange-500',
  writing:   'text-teal-600',
};

type Props = {
  /** 서버에서 이메일을 넘길 수 있고, 없으면 클라이언트에서 조회 */
  email?: string;
  role?: 'student' | 'teacher' | 'admin';
};

export default function TopbarClient({ email: initialEmail, role }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { lang, toggle: toggleLang } = useLang();
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState<string>(initialEmail ?? '');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 초기 이메일이 없으면 클라이언트에서 불러오기
  useEffect(() => {
    if (initialEmail) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (mounted) setEmail(data.user?.email ?? '');
    })();
    return () => {
      mounted = false;
    };
  }, [initialEmail, supabase]);

  // 브라우저 fullscreen 상태 추적
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const handleSignOut = () => {
    startTransition(async () => {
      await supabase.auth.signOut();
      router.replace('/auth/login');
    });
  };

  const toggleSidebar = () => {
    document.dispatchEvent(new Event('toggle-sidebar'));
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.error('Fullscreen toggle error:', e);
    }
  };

  const initial = (email || 'guest')[0]?.toUpperCase() ?? '?';

  // Breadcrumb: match longest prefix
  const breadcrumb = useMemo(() => {
    const clean = (pathname ?? '/').split('?')[0].replace(/\/+$/, '') || '/';
    const match = Object.keys(PATH_LABELS)
      .filter((k) => clean === k || clean.startsWith(k + '/'))
      .sort((a, b) => b.length - a.length)[0];
    return match ? PATH_LABELS[match] : null;
  }, [pathname]);

  return (
    <header className="flex h-14 items-center justify-between border-b border-neutral-100 bg-white px-3 md:px-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* 왼쪽: 로고 + breadcrumb (모바일에서 사이드바/풀스크린 버튼 숨김) */}
      <div className="flex items-center gap-1 min-w-0">
        {/* 사이드바 토글 — 데스크탑만 */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="hidden md:flex rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          aria-label="Toggle sidebar"
        >
          ☰
        </button>

        {/* 풀스크린 — 데스크탑만 */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="hidden md:flex rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          aria-label="Toggle fullscreen"
        >
          {isFullscreen ? '⤢' : '⛶'}
        </button>

        <div className="hidden md:block mx-2 h-5 w-px bg-neutral-200" />

        {/* 로고 */}
        <div className="flex items-center gap-2 shrink-0">
          <Image src="/LEXiOX.png" alt="LEXiOX" height={36} width={120} className="h-9 w-auto" priority unoptimized />
          {role === 'admin' && (
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
              Admin
            </span>
          )}
        </div>

        {/* Breadcrumb — 데스크탑만 */}
        {breadcrumb && (
          <>
            <ChevronRight className="hidden md:block mx-1 h-3.5 w-3.5 text-neutral-300 shrink-0" />
            <span className={[
              'hidden md:block text-sm font-semibold truncate',
              breadcrumb.skill ? SKILL_LABEL_COLOR[breadcrumb.skill] : 'text-neutral-600',
            ].join(' ')}>
              {breadcrumb.label}
            </span>
          </>
        )}
      </div>

      {/* 오른쪽: 언어토글 + 프로필 + Sign out */}
      <div className="flex items-center gap-2 text-sm shrink-0">
        <button
          type="button"
          onClick={toggleLang}
          className="rounded-lg border border-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 transition-colors"
        >
          {lang === 'ko' ? 'EN' : '한'}
        </button>

        <span className="hidden max-w-[160px] truncate text-neutral-400 sm:block text-xs">
          {email || 'guest'}
        </span>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white shadow-sm shrink-0">
          {initial}
        </div>

        <button
          type="button"
          className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-60 transition-colors"
          onClick={handleSignOut}
          disabled={isPending}
          aria-busy={isPending || undefined}
        >
          {isPending ? '...' : 'Sign out'}
        </button>
      </div>
    </header>
  );
}
