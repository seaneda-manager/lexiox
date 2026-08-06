'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type Word = { id: string; text: string; meanings_ko?: string[] };
type SpellingResult = { spellingFailedIds: string[] };

function safeWords(v: any): Word[] {
  return Array.isArray(v) ? (v as Word[]).filter(Boolean) : [];
}

function norm(s: string): string {
  return String(s ?? '').trim().toLowerCase();
}

function createConfetti() {
  if (typeof window === 'undefined') return;
  const colors = ['#0F766E', '#F97316', '#F59E0B', '#EC4899'];
  const particles = 30;

  for (let i = 0; i < particles; i++) {
    const confetti = document.createElement('div');
    const x = Math.random() * window.innerWidth;
    const y = -10;
    const size = Math.random() * 6 + 2;
    const duration = Math.random() * 3 + 2;
    const color = colors[Math.floor(Math.random() * colors.length)];

    confetti.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      animation: fall ${duration}s ease-in forwards;
    `;

    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), duration * 1000);
  }
}

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
  const [value, setValue] = useState('');
  const [failedIds, setFailedIds] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [completedWords, setCompletedWords] = useState<Word[]>([]);
  const [showStreakEffect, setShowStreakEffect] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const cur = list[i] ?? null;
  const answer = cur?.text ?? '';
  const meaning = (cur?.meanings_ko ?? []).filter(Boolean).slice(0, 2);

  const done = (nextFailed: string[]) => onFinish({ spellingFailedIds: nextFailed });

  const goNext = (nextFailed: string[], isCorrect: boolean = false) => {
    const nextIndex = i + 1;

    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setBestStreak(Math.max(bestStreak, newStreak));

      if (newStreak > 0 && newStreak % 5 === 0) {
        setShowStreakEffect(true);
        createConfetti();
        setTimeout(() => setShowStreakEffect(false), 600);
      }

      if (cur) setCompletedWords((p) => [...p, cur]);

      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(answer);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
      }
    } else {
      setStreak(0);
    }

    if (nextIndex >= total) return done(nextFailed);
    setAnimKey((k) => k + 1);
    setI(nextIndex);
    setValue('');
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const markFailAndNext = () => {
    if (!cur?.id) return;
    const nextFailed = failedIds.includes(cur.id) ? failedIds : [...failedIds, cur.id];
    setFailedIds(nextFailed);
    goNext(nextFailed, false);
  };

  const submit = () => {
    if (!cur?.id) return;
    const ok = norm(value) === norm(answer);
    if (ok) {
      goNext(failedIds, true);
      return;
    }
    setShake(true);
    window.setTimeout(() => setShake(false), 280);
    setStreak(0);
    if (!failedIds.includes(cur.id)) setFailedIds((p) => [...p, cur.id]);
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        markFailAndNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
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
    <div className="fixed inset-0 w-screen h-screen flex bg-[#F7FAF9] z-50 overflow-hidden">
      <div className="flex-[7] flex flex-col justify-center items-center px-6 py-8 overflow-y-auto">
        <div
          className="w-full flex flex-col gap-6 items-center px-6"
          key={animKey}
          style={{
            maxWidth: '500px',
            animation: 'lx-card-in 220ms cubic-bezier(0.22,1,0.36,1) both',
          }}
        >
          <div className="space-y-3 w-full">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold tracking-widest text-[#0F766E] uppercase">
                LEXiOX
              </span>
              <span className="text-sm text-slate-300">·</span>
              <span className="text-sm font-semibold text-slate-400">철자 확인</span>
            </div>
            <ProgressBar current={i + 1} total={total} />
          </div>

          <div
            className={[
              'rounded-3xl bg-white shadow-[0_4px_32px_rgba(0,0,0,0.08)] border border-slate-100 px-8 py-8 space-y-5 w-full',
              'flex flex-col justify-center',
              shake ? 'lx-shake' : '',
              showStreakEffect ? 'scale-105' : '',
            ].join(' ')}
            style={{
              minHeight: '350px',
              boxSizing: 'border-box',
              transition: 'transform 200ms ease-out',
            }}
          >
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">뜻</p>
              <p className="font-bold text-slate-700" style={{ fontSize: 'clamp(24px, 5cqi, 48px)' }}>
                {meaning.length ? meaning.join(' / ') : '뜻 없음'}
              </p>
            </div>

            <div className="w-10 h-[2px] bg-[#0F766E] mx-auto rounded-full opacity-30" />

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-400 text-center">영어 단어를 입력하세요</p>
              <input
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="철자 입력..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 font-bold text-slate-900 text-center outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20 transition-all"
                style={{ fontSize: 'clamp(24px, 5cqi, 48px)' }}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full">
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

      <div className="flex-[3] bg-white border-l border-slate-200 px-6 py-8 flex flex-col gap-6 overflow-y-auto">
        <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 p-5 space-y-2">
          <div className="text-sm font-semibold text-slate-600 uppercase tracking-wider">🔥 Streak</div>
          <div className="text-4xl font-black text-orange-600">{streak}x</div>
          <div className="text-xs text-slate-500 pt-2 border-t border-orange-200">
            최고 기록: <span className="font-bold text-orange-600">{bestStreak}x</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold text-slate-600 uppercase tracking-wider">✅ 완료한 단어</div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {completedWords.length === 0 ? (
              <p className="text-xs text-slate-400 italic">아직 완료한 단어가 없습니다</p>
            ) : (
              completedWords.map((word) => (
                <div key={word.id} className="text-xs bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg font-medium">
                  {word.text}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes lx-card-in {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes lx-shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes fall {
          to {
            transform: translateY(100vh) rotateZ(360deg);
            opacity: 0;
          }
        }
        .lx-shake { animation: lx-shake 260ms ease; }
      `}</style>
    </div>
  );
}
