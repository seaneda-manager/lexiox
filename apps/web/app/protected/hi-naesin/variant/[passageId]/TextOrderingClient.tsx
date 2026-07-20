'use client';

import { useState } from 'react';

type Segment = { id: string; text: string };

export default function TextOrderingClient({
  questionId,
  sessionId,
  passageId,
  fixedText,
  segments,
  correctOrder,
  action,
  alreadyAnswered,
  previousOrder,
  isCorrect: initialCorrect,
}: {
  questionId: string;
  sessionId: string;
  passageId: string;
  fixedText: string;
  segments: Segment[];
  correctOrder: string[];
  action: (fd: FormData) => Promise<void>;
  alreadyAnswered: boolean;
  previousOrder: string[] | null;
  isCorrect: boolean | null;
}) {
  // 학생이 선택한 순서 (id 배열)
  const [chosen, setChosen] = useState<string[]>(previousOrder ?? []);
  const [submitted, setSubmitted] = useState(alreadyAnswered);
  const [correct, setCorrect]     = useState<boolean | null>(initialCorrect);

  function toggleSegment(id: string) {
    if (submitted) return;
    setChosen((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= segments.length) return prev; // 이미 모두 선택
      return [...prev, id];
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (chosen.length !== segments.length) return;

    const fd = new FormData(e.currentTarget);
    // 선택 순서 전달
    chosen.forEach((id) => fd.append('order', id));

    setSubmitted(true);
    setCorrect(JSON.stringify(chosen) === JSON.stringify(correctOrder));
    await action(fd);
  }

  const remaining = segments.filter((s) => !chosen.includes(s.id));

  // 결과 표시
  if (submitted && correct !== null) {
    return (
      <div className="space-y-4">
        {/* 결과 배너 */}
        <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
          correct
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {correct ? '✓ 정답입니다!' : '✗ 오답입니다.'}
        </div>

        {/* 내 답 */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-500">내 답</p>
          {chosen.map((id, i) => {
            const seg = segments.find((s) => s.id === id)!;
            return (
              <div key={id} className={`rounded-xl border p-3 text-sm ${
                correct ? 'border-emerald-200 bg-emerald-50' : 'border-red-100 bg-red-50'
              }`}>
                <span className="mr-2 text-xs font-bold text-neutral-400">{i + 1}</span>
                <span className="font-semibold text-neutral-700 mr-2">[{id}]</span>
                {seg.text}
              </div>
            );
          })}
        </div>

        {/* 정답 (오답일 때) */}
        {!correct && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-emerald-600">정답 순서</p>
            {correctOrder.map((id, i) => {
              const seg = segments.find((s) => s.id === id)!;
              return (
                <div key={id} className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
                  <span className="mr-2 text-xs font-bold text-neutral-400">{i + 1}</span>
                  <span className="font-semibold text-emerald-700 mr-2">[{id}]</span>
                  {seg.text}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="question_id"   value={questionId} />
      <input type="hidden" name="session_id"    value={sessionId} />
      <input type="hidden" name="correct_order" value={JSON.stringify(correctOrder)} />

      {/* 선택된 순서 */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-neutral-500">
          선택한 순서 ({chosen.length} / {segments.length})
        </p>
        {chosen.length === 0 ? (
          <div className="rounded-xl border border-dashed p-4 text-center text-xs text-neutral-400">
            아래 단락을 순서대로 클릭하세요
          </div>
        ) : (
          chosen.map((id, i) => {
            const seg = segments.find((s) => s.id === id)!;
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleSegment(id)}
                className="w-full rounded-xl border border-blue-200 bg-blue-50 p-3 text-left text-sm hover:bg-blue-100 transition-colors"
              >
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="font-semibold text-neutral-700 mr-2">[{id}]</span>
                <span className="text-neutral-600">{seg.text.slice(0, 80)}{seg.text.length > 80 ? '…' : ''}</span>
              </button>
            );
          })
        )}
      </div>

      {/* 남은 단락 */}
      {remaining.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-500">단락 선택</p>
          {remaining.map((seg) => (
            <button
              key={seg.id}
              type="button"
              onClick={() => toggleSegment(seg.id)}
              className="w-full rounded-xl border border-neutral-200 bg-white p-3 text-left text-sm hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <span className="font-semibold text-neutral-700 mr-2">[{seg.id}]</span>
              <span className="text-neutral-600">{seg.text}</span>
            </button>
          ))}
        </div>
      )}

      {chosen.length > 0 && chosen.length < segments.length && (
        <button
          type="button"
          onClick={() => setChosen([])}
          className="text-xs text-neutral-400 underline"
        >
          초기화
        </button>
      )}

      <button
        type="submit"
        disabled={chosen.length !== segments.length}
        className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        제출
      </button>
    </form>
  );
}
