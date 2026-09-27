'use client';

import { useState } from 'react';
import type { MiddleGrammarPoint } from '@/components/middle-naesin/drill/types';

type Props = {
  points: MiddleGrammarPoint[];
};

export default function GrammarStage({ points }: Props) {
  if (points.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-sm text-neutral-400">
        등록된 문법 포인트가 없습니다. 단원 에디터에서 문법 포인트를 추가해주세요.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {points.map((point) => (
        <GrammarPointCard key={point.id} point={point} />
      ))}
    </div>
  );
}

function GrammarPointCard({ point }: { point: MiddleGrammarPoint }) {
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const select = (qIdx: number, choiceIdx: number) => {
    setAnswers((prev) => ({ ...prev, [qIdx]: choiceIdx }));
  };

  const answeredCount = Object.keys(answers).length;
  const correctCount = point.quiz.filter((q, i) => answers[i] === q.answerIndex).length;

  return (
    <div className="rounded-2xl border bg-white p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-neutral-900">{point.title}</h3>
        {point.quiz.length > 0 && (
          <span className="shrink-0 text-xs text-neutral-500">
            {answeredCount}/{point.quiz.length}개 응답 · {correctCount}개 정답
          </span>
        )}
      </div>

      {point.explanationEn && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
          {point.explanationEn}
        </p>
      )}

      {point.explanationKo && (
        <div>
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="rounded-lg border px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
          >
            {revealed ? '한글 설명 숨기기' : '한글 설명 보기'}
          </button>
          {revealed && (
            <p className="mt-2 whitespace-pre-wrap rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900">
              {point.explanationKo}
            </p>
          )}
        </div>
      )}

      {point.quiz.length > 0 && (
        <div className="space-y-3 border-t pt-4">
          <div className="text-xs font-semibold text-neutral-500">간단 퀴즈</div>
          {point.quiz.map((q, qIdx) => {
            const selected = answers[qIdx];
            const isChecked = selected !== undefined;

            return (
              <div key={qIdx} className="space-y-2 rounded-xl border bg-neutral-50 p-4">
                <p className="text-sm font-medium text-neutral-800">
                  {qIdx + 1}. {q.prompt}
                </p>
                <div className="flex flex-wrap gap-2">
                  {q.choices.map((choice, cIdx) => {
                    const isSelected = selected === cIdx;
                    const isCorrectChoice = cIdx === q.answerIndex;
                    const showState = isChecked && (isSelected || isCorrectChoice);

                    return (
                      <button
                        key={cIdx}
                        type="button"
                        onClick={() => select(qIdx, cIdx)}
                        className={[
                          'rounded-full border px-3 py-1.5 text-sm transition',
                          showState
                            ? isCorrectChoice
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                              : 'border-rose-300 bg-rose-50 text-rose-700'
                            : 'bg-white text-neutral-700 hover:bg-neutral-100',
                        ].join(' ')}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>
                {isChecked && (
                  <p className={['text-xs font-semibold', selected === q.answerIndex ? 'text-emerald-600' : 'text-rose-600'].join(' ')}>
                    {selected === q.answerIndex ? '✓ 정답' : `✗ 오답 · 정답: ${q.choices[q.answerIndex]}`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
