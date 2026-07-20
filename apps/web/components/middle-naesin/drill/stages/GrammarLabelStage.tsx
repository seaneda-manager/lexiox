'use client';

import { useState } from 'react';
import { MIDDLE_GRAMMAR_PATTERNS, type MiddleDrillSentence, type MiddleGrammarPattern } from '@/models/middle-naesin/drill';

type SentenceState = {
  selected: Set<MiddleGrammarPattern>;
  checked: boolean;
  revealed: boolean;
};

type Props = {
  sentences: MiddleDrillSentence[];
};

// Group patterns for display
const PATTERN_GROUPS: { label: string; patterns: readonly MiddleGrammarPattern[] }[] = [
  {
    label: '문장 형식',
    patterns: ['1형식', '2형식', '3형식', '4형식', '5형식'],
  },
  {
    label: '시제',
    patterns: ['현재', '과거', '미래', '현재완료', '과거완료', '진행형'],
  },
  {
    label: '조동사',
    patterns: ['can', 'will', 'must', 'should', 'may'],
  },
  {
    label: '준동사',
    patterns: ['부정사(명사)', '부정사(형용사)', '부정사(부사)', '동명사', '현재분사', '과거분사'],
  },
  {
    label: '관계사·접속사',
    patterns: ['관계대명사', '관계부사', '접속사', '간접의문문'],
  },
  {
    label: '기타',
    patterns: ['수동태', '비교급', '최상급', '가정법', '분사구문', '강조', '도치'],
  },
];

export default function GrammarLabelStage({ sentences }: Props) {
  const [states, setStates] = useState<SentenceState[]>(
    sentences.map(() => ({ selected: new Set(), checked: false, revealed: false })),
  );
  const [current, setCurrent] = useState(0);

  const togglePattern = (sentenceIdx: number, pattern: MiddleGrammarPattern) => {
    setStates((prev) =>
      prev.map((s, i) => {
        if (i !== sentenceIdx) return s;
        const next = new Set(s.selected);
        if (next.has(pattern)) next.delete(pattern);
        else next.add(pattern);
        return { ...s, selected: next, checked: false };
      }),
    );
  };

  const check = (idx: number) =>
    setStates((prev) => prev.map((s, i) => (i === idx ? { ...s, checked: true } : s)));

  const reveal = (idx: number) =>
    setStates((prev) => prev.map((s, i) => (i === idx ? { ...s, revealed: true, checked: true } : s)));

  const sentence = sentences[current];
  const st = states[current];
  const hasAnswer = sentence?.grammarAnswers && sentence.grammarAnswers.length > 0;

  let score: { correct: number; total: number } | null = null;
  if (st?.checked && hasAnswer) {
    const answers = sentence.grammarAnswers!;
    const correct = answers.filter((a) => st.selected.has(a)).length;
    score = { correct, total: answers.length };
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      {/* Sentence list */}
      <div className="rounded-2xl border bg-white p-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
          문장 선택
        </div>
        <div className="space-y-1">
          {sentences.map((s, idx) => {
            const done = states[idx].checked;
            return (
              <button
                key={s.index}
                type="button"
                onClick={() => setCurrent(idx)}
                className={[
                  'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition',
                  idx === current
                    ? 'bg-violet-50 font-semibold text-violet-800'
                    : 'text-neutral-500 hover:bg-neutral-50',
                ].join(' ')}
              >
                <span className={['h-2 w-2 shrink-0 rounded-full', done ? 'bg-emerald-400' : idx === current ? 'bg-violet-400' : 'bg-neutral-200'].join(' ')} />
                <span className="truncate">문장 {idx + 1}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main panel */}
      {sentence && (
        <div className="space-y-4">
          {/* Sentence display */}
          <div className="rounded-2xl border bg-white p-5">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              문장 {current + 1} / {sentences.length}
            </div>
            <p className="text-base leading-7 text-neutral-900">{sentence.en}</p>
            {sentence.ko && (
              <p className="mt-2 text-sm text-neutral-400">{sentence.ko}</p>
            )}
          </div>

          {/* Pattern selector */}
          <div className="rounded-2xl border bg-white p-5 space-y-4">
            <div className="text-sm font-semibold text-neutral-700">
              이 문장에 해당하는 문법 패턴을 모두 선택하세요.
            </div>

            {PATTERN_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  {group.label}
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.patterns.map((pattern) => {
                    const isSelected = st.selected.has(pattern);
                    const isCorrect = sentence.grammarAnswers?.includes(pattern);
                    const showCorrect = st.revealed && isCorrect;
                    const showWrong = st.checked && !st.revealed && isSelected && !isCorrect;

                    return (
                      <button
                        key={pattern}
                        type="button"
                        onClick={() => togglePattern(current, pattern)}
                        disabled={st.revealed}
                        className={[
                          'rounded-full border px-3 py-1 text-xs font-medium transition',
                          showCorrect
                            ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
                            : showWrong
                            ? 'border-rose-300 bg-rose-50 text-rose-600'
                            : isSelected
                            ? 'border-violet-300 bg-violet-50 text-violet-700'
                            : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50',
                        ].join(' ')}
                      >
                        {pattern}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Answer reveal (if teacher annotation exists) */}
            {st.revealed && hasAnswer && (
              <div className="rounded-xl bg-violet-50 px-4 py-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-violet-400">
                  정답
                </div>
                <div className="flex flex-wrap gap-2">
                  {sentence.grammarAnswers!.map((a) => (
                    <span key={a} className="rounded-full border border-violet-300 bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              {!st.revealed && (
                <button
                  type="button"
                  onClick={() => check(current)}
                  disabled={st.selected.size === 0}
                  className="rounded-xl bg-neutral-800 px-4 py-1.5 text-xs text-white disabled:opacity-40"
                >
                  확인
                </button>
              )}
              {hasAnswer && (
                <button
                  type="button"
                  onClick={() => reveal(current)}
                  className="rounded-xl border px-4 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
                >
                  정답 보기
                </button>
              )}
              {!hasAnswer && (
                <span className="text-xs text-neutral-300">정답 데이터 없음 (에디터에서 추가)</span>
              )}
              {score && (
                <span className={['text-xs font-semibold', score.correct === score.total ? 'text-emerald-600' : 'text-amber-600'].join(' ')}>
                  {score.correct}/{score.total} 정답
                </span>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCurrent((v) => Math.max(0, v - 1))}
              disabled={current <= 0}
              className="flex-1 rounded-xl border py-2.5 text-sm disabled:opacity-40"
            >
              ← 이전
            </button>
            <button
              type="button"
              onClick={() => setCurrent((v) => Math.min(sentences.length - 1, v + 1))}
              disabled={current >= sentences.length - 1}
              className="flex-1 rounded-xl border bg-neutral-800 py-2.5 text-sm text-white disabled:opacity-40"
            >
              다음 →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
