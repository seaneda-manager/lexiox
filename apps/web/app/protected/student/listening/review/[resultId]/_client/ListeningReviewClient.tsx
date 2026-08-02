'use client';

import { useState } from 'react';

interface ReviewQuestion {
  id: string;
  number: number;
  stem: string;
  audioUrl?: string;
  choices: any[];
  isCorrect: boolean;
  userAnswer: string | null;
  correctAnswer: string;
  correctChoiceId?: string;
}

interface ReviewData {
  testId: string;
  testLabel: string;
  score: number;
  correct: number;
  total: number;
  questions: ReviewQuestion[];
}

export function ListeningReviewClient({ reviewData }: { reviewData: ReviewData }) {
  const [selectedId, setSelectedId] = useState(reviewData.questions[0]?.id || '');
  const [stage, setStage] = useState(0);

  const selected = reviewData.questions.find((q) => q.id === selectedId);
  if (!selected) return <div className="p-6 text-rose-700">문제가 없습니다</div>;

  const STAGES = [
    '1. 정답/오답 확인',
    '2. 단어 분석',
    '3. 해석하기',
    '4. 근거 찾기',
    '5. 문제 유형',
    '6. 설명 채우기',
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <h2 className="text-xl font-bold">Listening 리뷰</h2>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-xs font-bold uppercase mb-2">질문</p>
        <div className="grid grid-cols-10 gap-2">
          {reviewData.questions.map((q) => (
            <button
              key={q.id}
              onClick={() => { setSelectedId(q.id); setStage(0); }}
              className={`rounded border-2 py-2 text-xs font-semibold ${
                selectedId === q.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {q.isCorrect ? '✓' : '✗'}{q.number}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b overflow-x-auto">
        <div className="flex gap-1 px-6">
          {STAGES.map((s, i) => (
            <button
              key={i}
              onClick={() => setStage(i)}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap ${
                i === stage
                  ? 'border-b-2 border-blue-500 text-blue-700'
                  : 'text-slate-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 rounded-lg border border-slate-200 bg-white p-6">
          {stage === 0 && (
            <>
              {selected.audioUrl && (
                <div className="mb-6">
                  <p className="text-xs text-slate-600 mb-2">🎧 오디오</p>
                  <audio controls className="w-full rounded" src={selected.audioUrl} />
                </div>
              )}
              <p className="mb-4 text-sm">{selected.stem}</p>
              <div className="space-y-2">
                {selected.choices.map((c, i) => (
                  <div
                    key={c.id}
                    className={`rounded border-2 p-3 text-sm ${
                      c.id === selected.correctChoiceId
                        ? 'border-green-500 bg-green-50'
                        : c.id === selected.userAnswer
                        ? 'border-red-500 bg-red-50'
                        : 'border-slate-200'
                    }`}
                  >
                    {String.fromCharCode(65 + i)}. {c.text}
                  </div>
                ))}
              </div>
            </>
          )}
          {stage > 0 && <p className="text-slate-600">준비 중...</p>}
        </div>

        <div className="col-span-4 rounded-lg border border-slate-200 bg-white p-6">
          <p className="text-xs font-bold uppercase mb-2">테스트</p>
          <p className="text-sm">{reviewData.testLabel}</p>
          <p className="mt-4 font-bold text-blue-700">
            {reviewData.correct}/{reviewData.total} ({reviewData.score}%)
          </p>
        </div>
      </div>
    </div>
  );
}
