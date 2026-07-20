"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Word = {
  id: string;
  text: string;
  meanings_ko?: string[];
};

type SpellingResult = {
  spellingFailedIds: string[];
};

function safeWords(v: any): Word[] {
  return Array.isArray(v) ? (v as Word[]).filter(Boolean) : [];
}

function norm(s: string) {
  return String(s ?? "").trim().toLowerCase();
}

/* ── Progress Bar ─────────────────────────────────────────── */
function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span className="text-[#0F766E]">철자 확인</span>
        <span className="text-slate-400">
          <span className="text-[#F97316] font-bold">{current}</span>
          <span className="text-slate-300 mx-0.5">/</span>
          {total}
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#0F766E] transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────── */
export default function PrescreenSpellingBoard({
  words,
  onFinish,
}: {
  words: Word[];
  onFinish: (r: SpellingResult) => void;
}) {
  const list = useMemo(() => safeWords(words), [words]);
  const total = list.length;

  const [i, setI] = useState(0);
  const [value, setValue] = useState("");
  const [failedIds, setFailedIds] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const cur = list[i] ?? null;
  const answer = cur?.text ?? "";
  const meaning = (cur?.meanings_ko ?? []).filter(Boolean).slice(0, 2);

  const done = (nextFailed: string[]) => onFinish({ spellingFailedIds: nextFailed });

  const goNext = (nextFailed: string[]) => {
    const nextIndex = i + 1;
    if (nextIndex >= total) return done(nextFailed);
    setAnimKey((k) => k + 1);
    setI(nextIndex);
    setValue("");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const markFailAndNext = () => {
    if (!cur?.id) return;
    const nextFailed = failedIds.includes(cur.id) ? failedIds : [...failedIds, cur.id];
    setFailedIds(nextFailed);
    goNext(nextFailed);
  };

  const submit = () => {
    if (!cur?.id) return;
    const ok = norm(value) === norm(answer);
    if (ok) {
      goNext(failedIds);
      return;
    }
    setShake(true);
    window.setTimeout(() => setShake(false), 280);
    if (!failedIds.includes(cur.id)) setFailedIds((p) => [...p, cur.id]);
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") { e.preventDefault(); submit(); }
      if (e.key === "Escape") { e.preventDefault(); markFailAndNext(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, value, answer, failedIds, cur?.id]);

  if (!list.length) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#F7FAF9]">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 text-sm">
          단어가 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-screen flex flex-col bg-[#F7FAF9] z-50">
      <div
        className="flex-1 flex flex-col justify-center items-center px-6 py-8"
        key={animKey}
        style={{ animation: "lx-card-in 220ms cubic-bezier(0.22,1,0.36,1) both" }}
      >
        <div className="w-full max-w-sm flex flex-col gap-6">
        {/* 헤더 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold tracking-widest text-[#0F766E] uppercase">
              LEXiOX
            </span>
            <span className="text-sm text-slate-300">·</span>
            <span className="text-sm font-semibold text-slate-400">철자 확인</span>
          </div>
          <ProgressBar current={i + 1} total={total} />
        </div>

        {/* 카드 */}
        <div
          className={[
            "rounded-3xl bg-white shadow-[0_4px_32px_rgba(0,0,0,0.08)] border border-slate-100 px-8 py-8 space-y-5",
            shake ? "lx-shake" : "",
          ].join(" ")}
        >
          {/* 뜻 힌트 */}
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">뜻</p>
            <p className="text-2xl font-bold text-slate-700">
              {meaning.length ? meaning.join(" / ") : "뜻 없음"}
            </p>
          </div>

          <div className="w-10 h-[2px] bg-[#0F766E] mx-auto rounded-full opacity-30" />

          {/* 입력 */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-400 text-center">영어 단어를 입력하세요</p>
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="철자 입력..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 text-2xl font-bold text-slate-900 text-center outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20 transition-all"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          {failedIds.length > 0 && (
            <p className="text-center text-xs text-slate-400">
              틀린 단어: <span className="font-bold text-rose-500">{failedIds.length}개</span>
            </p>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={submit}
            className="w-full rounded-2xl bg-[#0F766E] hover:bg-[#115E59] active:scale-[0.98] text-white font-bold text-lg py-5 transition-all duration-150 shadow-sm"
          >
            확인 <span className="ml-2 opacity-50 text-xs">(Enter)</span>
          </button>
          <button
            type="button"
            onClick={markFailAndNext}
            className="w-full rounded-2xl bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-500 font-semibold text-base py-4 transition-all duration-150 border border-slate-200"
          >
            모르겠어요 <span className="ml-2 opacity-40 text-xs">(Esc)</span>
          </button>
        </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes lx-card-in {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes lx-shake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-6px); }
          40%     { transform: translateX(6px); }
          60%     { transform: translateX(-4px); }
          80%     { transform: translateX(4px); }
        }
        .lx-shake { animation: lx-shake 260ms ease; }
      `}</style>
    </div>
  );
}
