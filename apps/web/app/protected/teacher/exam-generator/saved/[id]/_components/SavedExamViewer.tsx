'use client';

import { useState } from 'react';
import type { ExamQuestion } from '../../../_actions/generate';

type Props = {
  exam: {
    id: string;
    questions: ExamQuestion[];
    school: string;
    grade: string;
    exam_year: number;
    exam_month: number;
    created_at: string;
  };
  examLabel: string;
};

const typeColor: Record<string, string> = {
  '글의 목적':   'bg-sky-100 text-sky-700',
  '심경':        'bg-violet-100 text-violet-700',
  '심경 변화':   'bg-violet-100 text-violet-700',
  '필자 주장':   'bg-indigo-100 text-indigo-700',
  '요지':        'bg-indigo-100 text-indigo-700',
  '주제':        'bg-indigo-100 text-indigo-700',
  '제목':        'bg-indigo-100 text-indigo-700',
  '내용 일치':   'bg-green-100 text-green-700',
  '내용 불일치': 'bg-green-100 text-green-700',
  '어법':        'bg-blue-100 text-blue-700',
  '어휘':        'bg-purple-100 text-purple-700',
  '빈칸 추론':   'bg-amber-100 text-amber-700',
  '빈칸추론':    'bg-amber-100 text-amber-700',
  '문단 순서':   'bg-rose-100 text-rose-700',
  '순서':        'bg-rose-100 text-rose-700',
  '문장 삽입':   'bg-pink-100 text-pink-700',
  '문장삽입':    'bg-pink-100 text-pink-700',
  '서술형':      'bg-orange-100 text-orange-700',
};

export default function SavedExamViewer({ exam, examLabel }: Props) {
  const questions: ExamQuestion[] = Array.isArray(exam.questions) ? exam.questions : [];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswers, setShowAnswers] = useState(false);

  if (questions.length === 0) {
    return <p className="text-sm text-neutral-400">문제가 없습니다.</p>;
  }

  const q = questions[currentIdx];

  return (
    <div className="space-y-4">
      {/* 인쇄용 헤더 */}
      <div className="hidden print:block text-center mb-6">
        <h2 className="text-xl font-bold">{examLabel} 영어 예상문제</h2>
        <p className="text-sm text-gray-500 mt-1">
          총 {questions.length}문항 · {new Date(exam.created_at).toLocaleDateString('ko-KR')}
        </p>
      </div>

      {/* 버튼들 */}
      <div className="print:hidden flex flex-wrap gap-2">
        <button onClick={() => setShowAnswers(!showAnswers)}
          className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition">
          {showAnswers ? '🙈 정답 숨기기' : '👁️ 정답 보기'}
        </button>
        <button onClick={() => window.print()}
          className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition">
          🖨️ 인쇄
        </button>
      </div>

      {/* 네비게이션 */}
      <div className="print:hidden flex items-center gap-2">
        <button
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-30 transition"
        >
          ← 이전
        </button>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            max={questions.length}
            value={currentIdx + 1}
            onChange={(e) => {
              const n = Number(e.target.value) - 1;
              if (n >= 0 && n < questions.length) setCurrentIdx(n);
            }}
            className="w-14 rounded-lg border border-neutral-200 px-2 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <span className="text-sm text-neutral-500">/ {questions.length}</span>
        </div>
        <button
          onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
          disabled={currentIdx === questions.length - 1}
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-30 transition"
        >
          다음 →
        </button>
      </div>

      {/* 문제 카드 */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            {q.number}
          </span>
          <div className="flex-1 space-y-3">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeColor[q.type] ?? 'bg-neutral-100 text-neutral-600'}`}>
              {q.type}
            </span>
            <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-4 text-sm leading-relaxed whitespace-pre-wrap text-neutral-800">
              {q.passageOverride ?? q.passageText}
            </div>
            <p className="text-sm font-medium text-neutral-700">{q.question}</p>
            {q.options && q.options.length > 0 && (
              <ul className="space-y-1.5 pl-1">
                {q.options.map((opt, i) => <li key={i} className="text-sm text-neutral-700">{opt}</li>)}
              </ul>
            )}
            {q.type === '서술형' && (
              <div className="hidden print:block border border-dashed border-neutral-300 rounded p-2 h-20 mt-2">
                <span className="text-xs text-neutral-400">답안 작성란</span>
              </div>
            )}
            <div className={`rounded-lg bg-indigo-50 border border-indigo-100 p-3 space-y-1 ${showAnswers ? '' : 'hidden'}`}>
              <p className="text-xs font-semibold text-indigo-700">정답: {q.answer}</p>
              <p className="text-xs text-indigo-600 leading-relaxed whitespace-pre-wrap">{q.explanation}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
