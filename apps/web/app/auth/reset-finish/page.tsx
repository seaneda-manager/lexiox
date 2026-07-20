'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Stage = 'checking' | 'ready' | 'updating' | 'done' | 'error';

function parseHashParams(hash: string): Record<string, string> {
  const s = hash.startsWith('#') ? hash.slice(1) : hash;
  const qp = new URLSearchParams(s);
  const obj: Record<string, string> = {};
  qp.forEach((v, k) => (obj[k] = v));
  return obj;
}

export default function ResetFinishPage() {
  const [stage, setStage] = useState<Stage>('checking');
  const [err, setErr] = useState<string | null>(null);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function prepareSession() {
      try {
        const loc = typeof window !== 'undefined' ? window.location : null;
        const hash = loc?.hash ?? '';
        const search = loc?.search ?? '';

        const hashObj = parseHashParams(hash);
        const qs = new URLSearchParams(search);

        // 1) #access_token / #refresh_token / type=recovery
        const access_token = hashObj['access_token'];
        const refresh_token = hashObj['refresh_token'];
        const hashType = hashObj['type'];
        if (access_token && refresh_token && hashType === 'recovery') {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          try { history.replaceState(null, '', loc!.pathname); } catch {}
          if (!cancelled) setStage('ready');
          return;
        }

        // 2) ?token_hash=...&type=recovery
        const token_hash = qs.get('token_hash');
        const qsType = qs.get('type');
        if (token_hash && qsType === 'recovery') {
          const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash });
          if (error) throw error;
          try { history.replaceState(null, '', loc!.pathname); } catch {}
          if (!cancelled) setStage('ready');
          return;
        }

        // 3) ?code=...
        const code = qs.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          try { history.replaceState(null, '', loc!.pathname); } catch {}
          if (!cancelled) setStage('ready');
          return;
        }

        // 4) 이미 세션이 존재
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          if (!cancelled) setStage('ready');
          return;
        }

        // 5) 모두 해당 안되면 에러
        if (!cancelled) {
          setErr('유효한 비밀번호 재설정 링크가 아닙니다. 메일의 링크를 다시 클릭하거나, 재설정 메일을 다시 받아주세요.');
          setStage('error');
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message ?? '세션 준비 중 오류가 발생했습니다.');
          setStage('error');
        }
      }
    }

    prepareSession();
    return () => { cancelled = true; };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pw1.length < 6) { setErr('비밀번호는 6자 이상이어야 합니다.'); return; }
    if (pw1 !== pw2) { setErr('비밀번호가 서로 일치하지 않습니다.'); return; }

    setErr(null);
    setStage('updating');

    const { error } = await supabase.auth.updateUser({ password: pw1 });
    if (error) {
      setErr(error.message);
      setStage('ready');
      return;
    }
    setStage('done');
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">비밀번호 재설정</h1>

      {stage === 'checking' && (
        <p className="text-gray-600">링크를 확인하는 중입니다…</p>
      )}

      {stage === 'error' && (
        <div className="space-y-3">
          <p className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
            {err ?? '오류가 발생했습니다.'}
          </p>
          <a className="underline" href="/auth/login">로그인/재설정 페이지로 이동</a>
        </div>
      )}

      {(stage === 'ready' || stage === 'updating') && (
        <form onSubmit={onSubmit} className="space-y-3">
          {err && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
              {err}
            </div>
          )}

          <div>
            <label className="block text-sm mb-1">새 비밀번호</label>
            <input
              type="password"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              minLength={6}
              required
              className="w-full border rounded-lg px-3 py-2"
              placeholder="6자 이상"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">새 비밀번호 확인</label>
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              minLength={6}
              required
              className="w-full border rounded-lg px-3 py-2"
              placeholder="다시 입력"
            />
          </div>

          <button
            type="submit"
            disabled={stage === 'updating'}
            aria-busy={stage === 'updating'}
            className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-60"
          >
            {stage === 'updating' ? '변경 중…' : '비밀번호 변경'}
          </button>
        </form>
      )}

      {stage === 'done' && (
        <div className="space-y-3">
          <p className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-800">
            비밀번호가 성공적으로 변경되었습니다.
          </p>
          <a className="underline" href="/auth/login">로그인하러 가기</a>
        </div>
      )}
    </div>
  );
}




