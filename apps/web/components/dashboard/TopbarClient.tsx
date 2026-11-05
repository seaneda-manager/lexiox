// components/dashboard/TopbarClient.tsx
'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabaseBrowser';
import { ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useLang } from '@/contexts/LangContext';
import { VIEW_AS_COOKIE, VIEW_AS_OPTIONS, type ViewAs } from '@/lib/auth/viewAs';

const PATH_LABELS: Record<string, { label: string; skill?: string }> = {
  '/student':              { label: '학습 현황' },
  '/student/home':         { label: '홈' },
  '/student/schedule':     { label: '스케줄' },
  '/student/homework':     { label: '내 숙제' },
  '/student/test-center':  { label: '시험' },
  '/student/exams':        { label: '예상문제' },
  '/student/tests':        { label: 'TOEFL 테스트' },
  '/student/daily-tests':  { label: 'Daily Tests' },
  '/student/deepcheck':    { label: 'DeepCheck' },
  '/student/level-test':   { label: '레벨 테스트' },
  '/student/lectures':     { label: '강의' },
  '/student/review':       { label: '복습' },
  '/student/progress':     { label: '진도 현황' },
  '/vocab/exams':          { label: '선생님 단어 시험' },
  '/vocab/test':           { label: '단어 시험' },
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
  /** 진짜 계정 역할 (역할 미리보기 스위처는 admin 에게만 보인다) */
  role?: 'student' | 'teacher' | 'admin' | 'franchisee' | 'hq_staff';
  /** Super 가 미리보기 중인 역할 (없으면 Super 화면) */
  viewAs?: ViewAs | null;
};

export default function TopbarClient({ email: initialEmail, role, viewAs = null }: Props) {
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

  // Super 의 역할 미리보기 전환: 쿠키에 저장하고 서버 레이아웃을 다시 그린다 (메뉴 구성만 바뀜)
  const switchViewAs = (next: ViewAs) => {
    try {
      if (next === 'admin') {
        document.cookie = `${VIEW_AS_COOKIE}=; path=/; max-age=0; samesite=lax`;
      } else {
        document.cookie = `${VIEW_AS_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
      }
    } catch {
      /* 쿠키를 못 쓰면 전환만 안 된다 */
    }
    router.refresh();
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
    <header className="flex h-14 items-center justify-between border-b border-neutral-200/70 bg-white px-3 md:px-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
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
        <div className="flex items-center gap-2.5 shrink-0">
          <Image src="/LEXiOX.png" alt="LEXiOX" height={40} width={133} className="h-10 w-auto" priority unoptimized />
          {role === 'admin' ? (
            // Super 계정: 본사직원/원장/선생님 화면으로 전환해서 볼 수 있다 (메뉴 구성만 바뀐다)
            <div
              className="hidden md:flex items-center gap-0.5 rounded-lg bg-amber-50 p-0.5 ring-1 ring-amber-200"
              role="group"
              aria-label="역할 미리보기"
              title="이 계정은 Super 입니다. 다른 역할이 보는 화면을 미리 볼 수 있어요 (권한은 그대로)"
            >
              {VIEW_AS_OPTIONS.map((o) => {
                const active = (viewAs ?? 'admin') === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => switchViewAs(o.value)}
                    aria-pressed={active}
                    className={[
                      'rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors',
                      active
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-amber-800 hover:bg-amber-100',
                    ].join(' ')}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          ) : role === 'franchisee' ? (
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-emerald-800">
              원장
            </span>
          ) : role === 'hq_staff' ? (
            <span className="rounded bg-sky-100 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-sky-800">
              본사
            </span>
          ) : null}
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
