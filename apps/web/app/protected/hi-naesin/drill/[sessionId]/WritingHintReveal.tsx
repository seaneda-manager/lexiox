'use client';

import { useState, useEffect, useRef } from 'react';

type Props = {
  answerEn: string;
  hintWords: string[];
  grammarHints: string[];
  wordCount?: number;
};

const FLASH_SECONDS = 4; // 모범 답안 표시 시간

const STOP = new Set([
  'the','a','an','is','are','was','were','be','been','have','has','had',
  'do','does','did','will','would','could','should','may','might','to',
  'of','in','on','at','for','with','by','from','and','but','or','so',
  'that','this','it','its','they','we','he','she','not','as','if',
  'there','here','all','some','more','most',
]);

export default function WritingHintReveal({ answerEn, hintWords, grammarHints, wordCount }: Props) {
  const [level, setLevel]             = useState(0);
  // 모범 답안 플래시 상태: 'hidden' | 'visible' | 'gone'
  const [answerState, setAnswerState] = useState<'hidden' | 'visible' | 'gone'>('hidden');
  const [countdown, setCountdown]     = useState(FLASH_SECONDS);
  const intervalRef                   = useRef<ReturnType<typeof setInterval> | null>(null);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  // 추가 힌트 단어
  const extraWords = [...new Set(
    answerEn
      .replace(/[^a-zA-Z\s]/g, '')
      .split(/\s+/)
      .map((w) => w.toLowerCase())
      .filter((w) => w.length >= 4 && !STOP.has(w) && !hintWords.includes(w))
  )].slice(0, 4);

  // 문장 첫 4단어
  const sentenceStart = answerEn.split(/\s+/).slice(0, 4).join(' ') + ' ...';

  // 모범 답안 제외한 일반 힌트
  const normalHints = [
    extraWords.length > 0
      ? { label: '단어 힌트 더 보기', content: extraWords.join(',  '), color: 'border-blue-100 bg-blue-50 text-blue-700' }
      : null,
    { label: '문장 시작 보기', content: sentenceStart, color: 'border-violet-100 bg-violet-50 text-violet-700' },
  ].filter(Boolean) as { label: string; content: string; color: string }[];

  const totalLevels = normalHints.length + 1; // +1 for 모범 답안

  function flashAnswer() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setAnswerState('visible');
    setCountdown(FLASH_SECONDS);
    setLevel(totalLevels); // 버튼 숨기기

    let remaining = FLASH_SECONDS;
    intervalRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setAnswerState('gone');
      }
    }, 1000);
  }

  function flashAgain() {
    setAnswerState('hidden');
    setTimeout(() => flashAnswer(), 50);
  }

  return (
    <div className="space-y-2">
      {/* 항상 표시 */}
      {wordCount && (
        <p className="text-xs text-neutral-400">
          총 <strong className="text-neutral-600">{wordCount}단어</strong> 내외
        </p>
      )}
      {hintWords.length > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs text-blue-700">
          <span className="font-semibold">힌트 단어 · </span>{hintWords.join(',  ')}
        </div>
      )}
      {grammarHints.length > 0 && (
        <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-2 text-xs text-purple-700">
          <span className="font-semibold">문법 포인트 · </span>{grammarHints.join(' / ')}
        </div>
      )}

      {/* 일반 단계 힌트 (열린 것들) */}
      {normalHints.slice(0, Math.min(level, normalHints.length)).map((hint, i) => (
        <div key={i} className={`rounded-xl border px-4 py-2 text-xs ${hint.color}`}>
          <span className="font-semibold">{hint.label.replace(' 보기', '')} · </span>
          {hint.content}
        </div>
      ))}

      {/* 모범 답안 플래시 */}
      {answerState === 'visible' && (
        <div className="relative rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-emerald-600">모범 답안</span>
            {/* 카운트다운 링 */}
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold text-emerald-700">
              {countdown}
            </span>
          </div>
          <p className="leading-relaxed">{answerEn}</p>
        </div>
      )}

      {answerState === 'gone' && (
        <div className="rounded-xl border border-dashed border-neutral-200 px-4 py-2.5 text-xs text-neutral-400 flex items-center justify-between">
          <span>이제 기억에서 작문해봐요! ✍️</span>
          <button
            type="button"
            onClick={flashAgain}
            className="text-xs font-medium text-neutral-500 underline underline-offset-2 hover:text-neutral-700"
          >
            다시 보기
          </button>
        </div>
      )}

      {/* 다음 힌트 버튼 */}
      {level < normalHints.length && (
        <button
          type="button"
          onClick={() => setLevel((l) => l + 1)}
          className="flex items-center gap-1.5 rounded-xl border border-dashed border-neutral-300 px-4 py-2 text-xs font-medium text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 transition-colors"
        >
          <span className="text-base leading-none">+</span>
          {normalHints[level].label}
        </button>
      )}

      {/* 모범 답안 버튼 (일반 힌트 다 열었거나 건너뛰고 바로) */}
      {answerState === 'hidden' && (
        <button
          type="button"
          onClick={flashAnswer}
          className="flex items-center gap-1.5 rounded-xl border border-dashed border-emerald-200 px-4 py-2 text-xs font-medium text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
        >
          <span className="text-base leading-none">👁</span>
          모범 답안 보기 ({FLASH_SECONDS}초)
        </button>
      )}
    </div>
  );
}
