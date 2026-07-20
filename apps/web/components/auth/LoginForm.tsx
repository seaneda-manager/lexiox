'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
// 브라우저용 Supabase 헬퍼 (없으면 아래 주석의 파일도 생성)
import { getBrowserSupabase } from '@/lib/supabase/client';

export default function LoginForm() {
  const supabase = getBrowserSupabase();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [rememberId, setRememberId] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 저장된 아이디 자동 채우기
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kp.rememberId');
      const savedId = localStorage.getItem('kp.savedId');
      if (saved === '1' && savedId) {
        setRememberId(true);
        setId(savedId);
      }
    } catch {
      // localStorage 접근 불가 시 무시
    }
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setErr(null);
    try {
      // 아이디 저장/삭제
      if (rememberId) {
        localStorage.setItem('kp.rememberId', '1');
        localStorage.setItem('kp.savedId', id);
      } else {
        localStorage.removeItem('kp.rememberId');
        localStorage.removeItem('kp.savedId');
      }

      // 1) Supabase 비밀번호 로그인
      const { error } = await supabase.auth.signInWithPassword({
        email: id, // 이메일 또는 아이디 입력란을 이메일로 사용
        password: pw,
      });
      if (error) throw error;

      // 2) 서버에서 최종 role 확인(쿠키 인증 기준)
      const res = await fetch('/api/debug/role', { cache: 'no-store' });
      const json = await res.json();
      const role = json?.me?.role ?? 'student';

      // 3) 역할별 라우팅
      if (role === 'admin' || role === 'teacher') {
        location.href = '/admin/content/list';
      } else {
        location.href = '/home/student';
      }
    } catch (e: any) {
      // 친절한 에러 메시지
      const msg =
        e?.message?.includes('Invalid login') || e?.status === 400
          ? '이메일 또는 비밀번호가 올바르지 않습니다.'
          : e?.message ?? '로그인 처리 중 오류가 발생했습니다.';
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="inline-block">
      <div className="grid grid-cols-[320px_minmax(140px,1fr)] items-stretch gap-3">
        {/* 아이디 */}
        <div className="col-start-1">
          <label className="sr-only" htmlFor="login-id">아이디</label>
          <input
            id="login-id"
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="이메일"
            value={id}
            onChange={(e) => setId(e.target.value)}
            className="h-12 w-[320px] rounded-xl border px-4 text-[15px]
                       placeholder:text-neutral-400
                       focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        {/* 로그인 버튼 (오른쪽 열 전체 높이) */}
        <div className="col-start-2 row-span-3">
          <button
            type="submit"
            disabled={loading}
            className="h-full min-h-[130px] w-full rounded-xl border
                       bg-blue-600 text-white font-semibold
                       hover:bg-blue-600/90 active:scale-[0.99]
                       disabled:opacity-60 disabled:cursor-not-allowed
                       transition"
            aria-busy={loading}
            title={loading ? '로그인 중…' : '로그인'}
          >
            {loading ? '로그인 중…' : '로그인'}
          </button>
        </div>

        {/* 비밀번호 */}
        <div className="col-start-1">
          <label className="sr-only" htmlFor="login-pw">비밀번호</label>
          <input
            id="login-pw"
            type="password"
            autoComplete="current-password"
            placeholder="비밀번호"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="h-12 w-[320px] rounded-xl border px-4 text-[15px]
                       placeholder:text-neutral-400
                       focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        {/* 옵션/링크 + 에러 */}
        <div className="col-start-1 col-span-1 row-start-3 mt-1 flex flex-col gap-2">
          <label className="inline-flex items-center gap-2 select-none text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={rememberId}
              onChange={(e) => setRememberId(e.target.checked)}
              className="accent-blue-600"
            />
            아이디 저장
          </label>

          {err && <div className="text-sm text-red-600">{err}</div>}

          <div className="flex items-center gap-4 text-sm text-neutral-600">
            <Link
              href="#"
              className="underline-offset-2 hover:underline"
              onClick={(e) => { e.preventDefault(); alert('아이디 찾기 페이지 연결 예정'); }}
            >
              아이디 찾기
            </Link>
            <Link
              href="#"
              className="underline-offset-2 hover:underline"
              onClick={(e) => { e.preventDefault(); alert('비밀번호 찾기 페이지 연결 예정'); }}
            >
              비밀번호 찾기
            </Link>
          </div>
        </div>
      </div>
    </form>
  );
}
