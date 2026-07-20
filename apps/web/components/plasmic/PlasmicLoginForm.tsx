// apps/web/components/plasmic/PlasmicLoginForm.tsx
"use client";

import React, { useEffect, useRef, useState, useId } from "react";
import Image from "next/image";

type Props = {
  email: string;
  password: string;
  remember: boolean;
  loading?: boolean;
  error?: string | null;
  onChangeEmail?: (v: string) => void;
  onChangePassword?: (v: string) => void;
  onToggleRemember?: (v: boolean) => void;
  onSubmit?: () => void;
  onFindId?: () => void;
  onForgotPw?: () => void;
};

export default function PlasmicLoginForm({
  email,
  password,
  remember,
  loading = false,
  error,
  onChangeEmail,
  onChangePassword,
  onToggleRemember,
  onSubmit,
  onFindId,
  onForgotPw,
}: Props) {
  const [showPw, setShowPw] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  // ✅ Stable, pure IDs (no Math.random in render)
  const emailId = useId();
  const pwId = useId();
  const errId = useId();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!loading) onSubmit?.();
  }

  function onPwKey(evt: React.KeyboardEvent<HTMLInputElement>) {
    // CapsLock 표시
    if (evt.getModifierState && typeof evt.getModifierState === "function") {
      setCapsOn(evt.getModifierState("CapsLock"));
    }
    // Enter로 제출
    if (evt.key === "Enter" && !loading) {
      onSubmit?.();
    }
  }

  // 폼 전체에서 Enter로 제출(텍스트영역 제외)
  function onFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key === "Enter" && !loading) {
      const target = e.target as HTMLElement;
      const isTextArea = target?.tagName?.toLowerCase() === "textarea";
      if (!isTextArea) onSubmit?.();
    }
  }

  // 로딩 시작 시 제출 버튼에 포커스(중복 제출 방지 UX)
  useEffect(() => {
    if (!loading) return;
    const btn = formRef.current?.querySelector<HTMLButtonElement>('button[type="submit"]');
    btn?.focus();
  }, [loading]);

  return (
    <div className="grid min-h-screen w-full place-items-center bg-neutral-950 p-4 text-neutral-100">
      <div className="grid w-full max-w-[960px] gap-6 md:grid-cols-[420px_1fr]">
        {/* Left: Login card */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow">
          <h1 className="mb-1 text-xl font-semibold">로그인</h1>
          <p className="mb-4 text-sm text-neutral-400">이메일과 비밀번호를 입력하세요.</p>

          <form
            ref={formRef}
            className="space-y-4"
            onSubmit={handleSubmit}
            onKeyDown={onFormKeyDown}
            noValidate
            aria-describedby={error ? errId : undefined}
          >
            <label className="block" htmlFor={emailId}>
              <span className="mb-1 block text-sm text-neutral-300">이메일</span>
              <input
                id={emailId}
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => onChangeEmail?.(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                inputMode="email"
                aria-invalid={!!error || undefined}
              />
            </label>

            <label className="block" htmlFor={pwId}>
              <span className="mb-1 block text-sm text-neutral-300">비밀번호</span>
              <div className="relative">
                <input
                  id={pwId}
                  name="password"
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => onChangePassword?.(e.target.value)}
                  onKeyUp={onPwKey}
                  onKeyDown={onPwKey}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 pr-20 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  autoComplete="current-password"
                  aria-invalid={!!error || undefined}
                  aria-describedby={
                    [capsOn ? `${pwId}-caps` : null, error ? errId : null]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-2 my-1 rounded-lg px-2 text-xs text-neutral-300 hover:bg-neutral-800"
                  onClick={() => setShowPw((s) => !s)}
                  aria-pressed={showPw}
                >
                  {showPw ? "숨기기" : "표시"}
                </button>
              </div>
              {capsOn && (
                <div id={`${pwId}-caps`} className="mt-1 text-xs text-amber-400">
                  Caps Lock이 켜져 있습니다.
                </div>
              )}
            </label>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-sm">
              <label className="inline-flex select-none items-center gap-2" htmlFor="remember">
                <input
                  id="remember"
                  name="remember"
                  type="checkbox"
                  className="size-4 accent-white"
                  checked={remember}
                  onChange={(e) => onToggleRemember?.(e.target.checked)}
                />
                아이디 저장
              </label>
              <span className="opacity-40">|</span>
              <button
                type="button"
                className="underline underline-offset-4 hover:opacity-80"
                onClick={() => onFindId?.()}
              >
                아이디 찾기
              </button>
              <span className="opacity-40">|</span>
              <button
                type="button"
                className="underline underline-offset-4 hover:opacity-80"
                onClick={() => onForgotPw?.()}
              >
                비밀번호 찾기
              </button>
            </div>

            {error && (
              <div id={errId} className="text-sm text-red-400" role="alert" aria-live="polite">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading || undefined}
              className="w-full rounded-xl bg-white py-2.5 font-semibold text-black hover:opacity-90 disabled:opacity-60"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner /> 로그인 중…
                </span>
              ) : (
                "로그인"
              )}
            </button>
          </form>
        </div>

        {/* Right: Visual/help */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:min-h-[420px]">
          <div className="grid h-full place-items-center text-center">
            <div>
              <div className="relative mx-auto mb-4 h-56 w-56 opacity-90">
                <Image
                  src="/images/login-hero.png"
                  alt="학습 일러스트"
                  fill
                  sizes="224px"
                  className="object-contain"
                  priority
                  unoptimized
                />
              </div>
              <h2 className="text-lg font-semibold">Klai Prime English</h2>
              <p className="mt-1 text-sm text-neutral-400">
                이 로그인/비주얼은 Plasmic에서 가져온 레이아웃을 코드로 재구성한 버전입니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 작은 UI: 스피너 */
function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true" role="img">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" fill="none" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.9" />
    </svg>
  );
}
