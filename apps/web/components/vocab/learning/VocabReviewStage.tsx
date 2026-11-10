'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { normEnglish, cleanTypedEnglish } from '@/lib/vocab/test/englishMatch';
import { groupMeaningsByPos, flattenMeanings } from '@/lib/vocab/learning/meaningMatch';
import LetterTiles from './LetterTiles';

export type ReviewStageWord = {
  id: string;
  text: string;
  meanings_ko: string[];
  meaning_pos?: string[] | null;
  wasWrong?: boolean;
};

export type ReviewResult = { wordId: string; correct: boolean; usedHint: boolean };

type Props = {
  words: ReviewStageWord[];
  windowDays?: number[];
  onFinish: (results: ReviewResult[]) => void;
};

/** 앞글자 힌트: 짧은 단어는 2글자, 긴 단어는 3글자 (공백·기호는 세지 않음) */
function hintPrefix(text: string): string {
  const need = text.replace(/[^a-zA-Z]/g, '').length <= 6 ? 2 : 3;
  let letters = 0;
  let out = '';
  for (const ch of text) {
    if (letters >= need) break;
    out += ch;
    if (/[a-zA-Z]/.test(ch)) letters++;
  }
  return out;
}

const MAX_TRIES = 2;

export default function VocabReviewStage({ words, windowDays, onFinish }: Props) {
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [tries, setTries] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [showTiles, setShowTiles] = useState(false);
  const [state, setState] = useState<'answering' | 'correct' | 'revealed'>('answering');
  const [msg, setMsg] = useState('');
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [finished, setFinished] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const word = words[idx];

  const groups = useMemo(() => (word ? groupMeaningsByPos(word.meanings_ko, word.meaning_pos) : null), [word]);
  const flat = useMemo(() => (word ? flattenMeanings(word.meanings_ko) : []), [word]);

  useEffect(() => {
    if (state === 'answering') inputRef.current?.focus();
  }, [idx, state]);

  const record = (correct: boolean) => {
    const next = [...results, { wordId: word.id, correct, usedHint: hintUsed }];
    setResults(next);
    return next;
  };

  const advance = () => {
    if (idx + 1 < words.length) {
      setIdx(idx + 1);
      setInput('');
      setTries(0);
      setHintUsed(false);
      setMsg('');
      setState('answering');
    } else {
      setFinished(true);
    }
  };

  const handleChange = (raw: string) => {
    if (state !== 'answering') return;
    const cleaned = cleanTypedEnglish(raw.toLowerCase());
    setInput(cleaned);
    setMsg('');
    if (normEnglish(cleaned) === normEnglish(word.text)) {
      setState('correct');
      record(true);
      setTimeout(() => advance(), 700);
    }
  };

  const submitWrong = () => {
    const t = tries + 1;
    setTries(t);
    if (t >= MAX_TRIES) {
      record(false);
      setState('revealed');
      setMsg('');
    } else {
      setMsg('아직 달라요. 한 번 더 써 보세요. 막히면 힌트를 눌러요.');
    }
  };

  const giveUp = () => {
    record(false);
    setState('revealed');
  };

  const useHint = () => {
    setHintUsed(true);
    const prefix = hintPrefix(word.text);
    if (normEnglish(input).length < normEnglish(prefix).length) setInput(prefix);
    inputRef.current?.focus();
  };

  if (finished) {
    const correct = results.filter((r) => r.correct).length;
    const missed = results.filter((r) => !r.correct).map((r) => words.find((w) => w.id === r.wordId)).filter(Boolean) as ReviewStageWord[];
    return (
      <div className="mx-auto w-full max-w-xl space-y-4 rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 text-center">
        <div className="text-4xl">✅</div>
        <div className="text-2xl font-bold text-emerald-900">복습 끝!</div>
        <div className="text-lg font-semibold text-emerald-800">
          {words.length}개 중 {correct}개 맞았어요
        </div>
        {missed.length > 0 && (
          <div className="rounded-xl bg-white p-3 text-left">
            <p className="mb-1 text-sm font-bold text-slate-700">다시 볼 단어</p>
            <ul className="space-y-0.5 text-sm text-slate-700">
              {missed.map((w) => (
                <li key={w.id}>
                  <b>{w.text}</b> — {flattenMeanings(w.meanings_ko).join('; ')}
                </li>
              ))}
            </ul>
          </div>
        )}
        <button
          type="button"
          onClick={() => onFinish(results)}
          className="w-full rounded-xl bg-emerald-600 py-3 text-lg font-bold text-white hover:bg-emerald-700"
        >
          오늘 학습 시작
        </button>
      </div>
    );
  }

  if (!word) return null;

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 rounded-2xl border-2 border-purple-200 bg-white p-5">
      <div className="flex items-center justify-between text-sm font-semibold text-purple-700">
        <span>
          🔁 지난 단어 복습{windowDays && windowDays.length > 0 ? ` (Day ${windowDays[0]}~${windowDays[windowDays.length - 1]})` : ''}
        </span>
        <span>
          {idx + 1} / {words.length}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-purple-500 transition-all" style={{ width: `${(idx / words.length) * 100}%` }} />
      </div>

      <div className="rounded-xl bg-slate-100 p-4 text-center">
        <p className="mb-2 text-sm text-slate-500">뜻을 보고 영어 단어를 써 보세요</p>
        {groups ? (
          <div className="space-y-1">
            {groups.map((g, i) => (
              <div key={i} className="text-xl font-bold text-slate-900">
                {g.pos && <span className="mr-2 rounded-full bg-slate-200 px-2 py-0.5 text-sm font-bold text-slate-700">{g.pos}</span>}
                {g.items.join('; ')}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xl font-bold text-slate-900">{flat.join('; ') || '(뜻 없음)'}</div>
        )}
        {word.wasWrong && <span className="mt-2 inline-block rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">지난번에 틀렸던 단어</span>}
      </div>

      {state === 'revealed' ? (
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold text-rose-600">정답은 이거예요</p>
          <p className="text-4xl font-bold text-slate-900">{word.text}</p>
          <button
            type="button"
            autoFocus
            onClick={() => advance()}
            className="w-full rounded-xl bg-purple-600 py-3 text-lg font-bold text-white hover:bg-purple-700"
          >
            다음 →
          </button>
        </div>
      ) : state === 'correct' ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 py-4 text-center">
          <p className="text-3xl font-bold text-slate-900">{word.text}</p>
          <p className="text-sm font-semibold text-emerald-700">✅ 맞았어요!</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="min-h-[2.5rem] text-center" aria-live="polite">
            <span style={{ fontFamily: 'monospace', fontSize: '1.6rem', letterSpacing: '0.15em' }}>
              {input.split('').map((ch, i) => {
                const target = word.text[i];
                const ok = target !== undefined && ch.toLowerCase() === target.toLowerCase();
                return (
                  <span key={i} className={ok ? 'font-bold text-emerald-600' : 'font-bold text-rose-600 underline decoration-rose-400'}>
                    {ch}
                  </span>
                );
              })}
            </span>
          </div>
          <input
            key={`rv-${idx}`}
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && input.trim().length > 0) {
                e.preventDefault();
                submitWrong();
              }
            }}
            placeholder="영어 철자를 입력하세요..."
            lang="en"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-center text-2xl font-bold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {msg && <p className="text-center text-sm font-semibold text-rose-600">{msg}</p>}
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={useHint} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800 hover:bg-amber-100">
              💡 힌트 (앞 글자)
            </button>
            <button type="button" onClick={() => setShowTiles((v) => !v)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              {showTiles ? '글자 타일 접기' : '🧩 글자 눌러서 입력'}
            </button>
            <button type="button" onClick={giveUp} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              모르겠어요
            </button>
          </div>
          {showTiles && <LetterTiles key={word.id} target={word.text} value={input} onChange={handleChange} />}
        </div>
      )}
    </div>
  );
}
