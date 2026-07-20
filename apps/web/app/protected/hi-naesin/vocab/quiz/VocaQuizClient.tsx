'use client';

import { useState, useCallback } from 'react';

export type QuizWord = {
  id: string;
  word: string;
  meaningKo: string;
  isExpression: boolean;
};

type Mode = 'word_to_meaning' | 'meaning_to_word' | 'expression_to_meaning';

const MODE_LABELS: Record<Mode, string> = {
  word_to_meaning:       '단어 → 뜻',
  meaning_to_word:       '뜻 → 단어',
  expression_to_meaning: '표현 → 뜻',
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildChoices(
  correct: QuizWord,
  pool: QuizWord[],
  mode: Mode,
): { label: string; isCorrect: boolean }[] {
  const wrongPool = pool.filter((w) => w.id !== correct.id);
  const wrongs = shuffle(wrongPool).slice(0, 3);

  const allChoices = [correct, ...wrongs].map((w) => ({
    label: mode === 'meaning_to_word' ? w.word : w.meaningKo,
    isCorrect: w.id === correct.id,
  }));
  return shuffle(allChoices);
}

export default function VocaQuizClient({ words }: { words: QuizWord[] }) {
  const [mode, setMode] = useState<Mode>('word_to_meaning');
  const [quizWords, setQuizWords] = useState<QuizWord[]>([]);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  const poolForMode = useCallback(
    (m: Mode) =>
      m === 'expression_to_meaning' ? words.filter((w) => w.isExpression) : words,
    [words],
  );

  const start = (m: Mode) => {
    const pool = shuffle(poolForMode(m));
    setMode(m);
    setQuizWords(pool);
    setStep(0);
    setSelected(null);
    setScore(0);
    setStarted(true);
    setFinished(false);
  };

  const restart = () => {
    setStarted(false);
    setFinished(false);
  };

  // ── 모드 선택 화면 ────────────────────────────────────────────
  if (!started) {
    const expressionCount = words.filter((w) => w.isExpression).length;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">문제 유형 선택</h2>
          <p className="mt-1 text-sm text-neutral-500">총 {words.length}개 단어</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {(['word_to_meaning', 'meaning_to_word', 'expression_to_meaning'] as Mode[]).map((m) => {
            const count = m === 'expression_to_meaning' ? expressionCount : words.length;
            const disabled = count < 4;
            return (
              <button
                key={m}
                type="button"
                disabled={disabled}
                onClick={() => start(m)}
                className={[
                  'rounded-2xl border p-5 text-left transition',
                  disabled
                    ? 'cursor-not-allowed border-neutral-100 bg-neutral-50 opacity-40'
                    : 'cursor-pointer border-neutral-200 bg-white hover:border-neutral-900 hover:shadow-sm',
                ].join(' ')}
              >
                <p className="text-base font-semibold text-neutral-900">{MODE_LABELS[m]}</p>
                <p className="mt-1 text-xs text-neutral-400">{count}개{disabled ? ' (4개 이상 필요)' : ''}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── 결과 화면 ─────────────────────────────────────────────────
  if (finished) {
    const total = quizWords.length;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    return (
      <div className="space-y-6 text-center">
        <div>
          <p className="text-5xl font-bold text-neutral-900">{pct}%</p>
          <p className="mt-2 text-sm text-neutral-500">
            {total}문제 중 {score}개 정답 · {MODE_LABELS[mode]}
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => start(mode)}
            className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            다시 풀기
          </button>
          <button
            type="button"
            onClick={restart}
            className="rounded-xl border px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            유형 바꾸기
          </button>
        </div>
      </div>
    );
  }

  // ── 퀴즈 화면 ─────────────────────────────────────────────────
  const current = quizWords[step];
  if (!current) return null;

  const choices = buildChoices(current, poolForMode(mode), mode);
  const prompt = mode === 'meaning_to_word' ? current.meaningKo : current.word;
  const isAnswered = selected !== null;
  const progress = Math.round(((step) / quizWords.length) * 100);

  const handleSelect = (label: string, isCorrect: boolean) => {
    if (isAnswered) return;
    setSelected(label);
    if (isCorrect) setScore((s) => s + 1);
  };

  const next = () => {
    if (step + 1 >= quizWords.length) {
      setFinished(true);
    } else {
      setStep((s) => s + 1);
      setSelected(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 상단 바 */}
      <div className="flex items-center justify-between text-xs text-neutral-400">
        <span>{MODE_LABELS[mode]}</span>
        <span>{step + 1} / {quizWords.length}</span>
      </div>

      {/* 진행 바 */}
      <div className="h-1.5 w-full rounded-full bg-neutral-100">
        <div
          className="h-1.5 rounded-full bg-neutral-900 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 문제 카드 */}
      <div className="rounded-2xl border bg-white p-6 text-center shadow-sm">
        <p className="text-xs uppercase tracking-widest text-neutral-400">
          {mode === 'meaning_to_word' ? '뜻을 보고 단어를 고르세요' : '단어를 보고 뜻을 고르세요'}
        </p>
        <p className="mt-4 text-2xl font-bold text-neutral-900 leading-snug">{prompt}</p>
      </div>

      {/* 보기 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {choices.map((c) => {
          let cls =
            'rounded-2xl border p-4 text-left text-sm font-medium transition cursor-pointer ';
          if (!isAnswered) {
            cls += 'border-neutral-200 bg-white hover:border-neutral-500 hover:bg-neutral-50';
          } else if (c.isCorrect) {
            cls += 'border-emerald-400 bg-emerald-50 text-emerald-800';
          } else if (selected === c.label && !c.isCorrect) {
            cls += 'border-red-300 bg-red-50 text-red-700';
          } else {
            cls += 'border-neutral-100 bg-neutral-50 text-neutral-400';
          }

          return (
            <button
              key={c.label}
              type="button"
              className={cls}
              onClick={() => handleSelect(c.label, c.isCorrect)}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* 다음 버튼 */}
      {isAnswered && (
        <div className="text-center">
          <button
            type="button"
            onClick={next}
            className="rounded-xl bg-neutral-900 px-8 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            {step + 1 >= quizWords.length ? '결과 보기' : '다음 →'}
          </button>
        </div>
      )}
    </div>
  );
}
