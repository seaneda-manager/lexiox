'use client';

import { useEffect, useState } from 'react';

type Show = 'all' | 'summary' | 'quiz';

// 인쇄 범위(전체/요약만/퀴즈만)와 정답지 포함 여부를 .summary 요소의 data 속성으로 넘긴다. (CSS 가 처리)
export function PrintControls() {
  const [show, setShow] = useState<Show>('all');
  const [answers, setAnswers] = useState(false);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.summary');
    if (!el) return;
    el.dataset.show = show;
    el.dataset.answers = answers ? 'on' : 'off';
  }, [show, answers]);

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
      <select
        value={show}
        onChange={(e) => setShow(e.target.value as Show)}
        className="rounded-xl border px-3 py-2"
        aria-label="인쇄 범위"
      >
        <option value="all">요약 + 퀴즈</option>
        <option value="summary">요약만</option>
        <option value="quiz">퀴즈만</option>
      </select>
      <label className="flex items-center gap-1.5">
        <input type="checkbox" checked={answers} onChange={(e) => setAnswers(e.target.checked)} />
        정답 포함(인쇄)
      </label>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-xl bg-neutral-900 px-4 py-2 font-semibold text-white hover:bg-neutral-800"
      >
        🖨 인쇄 / PDF 저장
      </button>
    </div>
  );
}
