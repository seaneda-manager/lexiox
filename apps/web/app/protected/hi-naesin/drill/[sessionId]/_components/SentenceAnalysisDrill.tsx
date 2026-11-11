'use client';

// 문장 분석 v2 (structure_svo, payload.version === 2) 학생 화면
// 문장 하나만 보고 지시를 순서대로 수행한다: 완전 주어 → 핵심 주어 → 동사 …
// 구간은 단어 인덱스로 저장하고, 채점은 서버가 DB 정답키로 한다.

import { useEffect, useMemo, useState } from 'react';
import {
  SA_STEP_LABEL,
  SA_STEP_PROMPT,
  spanText,
  stepsForLevel,
  acceptedFor,
  tokenizeSentence,
} from '@/lib/hi-naesin/sentenceAnalysis';
import type {
  SaItemId,
  SaResponse,
  SaSpan,
  SentenceAnalysisPayload,
} from '@/models/hi-naesin/drill';

type ResponseLike = {
  response_choice: string | null;
  is_correct: boolean | null;
  score_pct: number | null;
} | null;

const REASON_TEXT: Record<string, string> = {
  missing: '표시하지 않았어요',
  too_short: '범위가 너무 짧아요 (수식어까지 포함해야 해요)',
  too_long: '범위가 너무 넓어요',
  wrong_span: '다른 부분을 표시했어요',
};

// 항목별 표시 스타일
const MARK_CLASS: Record<SaItemId, string> = {
  fullS: 'border-b-2 border-blue-500',
  coreS: 'bg-blue-100 font-bold text-blue-900',
  V: 'bg-emerald-100 font-bold text-emerald-900 ring-1 ring-emerald-400',
};

export default function SentenceAnalysisDrill({
  payload, response, isAnswered, onSubmit, onNext, isLast, nextLabel,
}: {
  payload: SentenceAnalysisPayload;
  response: ResponseLike;
  isAnswered: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  onNext: () => void;
  isLast: boolean;
  nextLabel: string | null;
}) {
  const tokens = useMemo(() => tokenizeSentence(payload.sentence), [payload.sentence]);
  const stepIds = useMemo(() => stepsForLevel(payload.level), [payload.level]);

  const [confirmed, setConfirmed] = useState<Partial<Record<SaItemId, SaSpan>>>({});
  const [anchor, setAnchor] = useState<number | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stop = () => setDragging(false);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, []);

  const currentStepIdx = stepIds.findIndex((id) => !confirmed[id]);
  const allDone = currentStepIdx === -1;
  const currentId = allDone ? null : stepIds[currentStepIdx];

  const sel: SaSpan | null = anchor != null && focus != null
    ? [Math.min(anchor, focus), Math.max(anchor, focus)]
    : null;

  function clearSel() { setAnchor(null); setFocus(null); setDragging(false); }

  function confirmSel() {
    if (!sel || !currentId) return;
    setConfirmed((prev) => ({ ...prev, [currentId]: sel }));
    clearSel();
  }

  function undoLast() {
    const lastDone = [...stepIds].reverse().find((id) => confirmed[id]);
    if (!lastDone) return;
    setConfirmed((prev) => { const n = { ...prev }; delete n[lastDone]; return n; });
    clearSel();
  }

  // 토큰 사이 구두점·공백을 유지하며 렌더
  function renderSentence(marks: Partial<Record<SaItemId, SaSpan>>, interactive: boolean) {
    const out: React.ReactNode[] = [];
    let prevEnd = 0;
    tokens.forEach((t) => {
      const gap = payload.sentence.slice(prevEnd, t.start);
      if (gap) out.push(<span key={`g${t.index}`} className="whitespace-pre-wrap">{gap}</span>);
      prevEnd = t.end;

      const cls: string[] = [];
      (['fullS', 'coreS', 'V'] as SaItemId[]).forEach((id) => {
        const m = marks[id];
        if (m && t.index >= m[0] && t.index <= m[1]) cls.push(MARK_CLASS[id]);
      });
      const inSel = interactive && sel && t.index >= sel[0] && t.index <= sel[1];
      const base = 'rounded px-0.5 select-none';
      out.push(
        interactive ? (
          <button
            key={`w${t.index}`}
            type="button"
            disabled={allDone}
            onPointerDown={(e) => {
              (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
              setAnchor(t.index); setFocus(t.index); setDragging(true);
            }}
            onPointerEnter={() => { if (dragging) setFocus(t.index); }}
            className={`${base} ${cls.join(' ')} ${inSel ? 'bg-amber-200 ring-2 ring-amber-400' : 'hover:bg-neutral-100'}`}
          >
            {t.text}
          </button>
        ) : (
          <span key={`w${t.index}`} className={`${base} ${cls.join(' ')}`}>{t.text}</span>
        ),
      );
    });
    const tail = payload.sentence.slice(prevEnd);
    if (tail) out.push(<span key="tail">{tail}</span>);
    return out;
  }

  // ── 제출 후: 정답/내 답 비교 ─────────────────────────────
  if (isAnswered) {
    let saved: SaResponse | null = null;
    try { saved = response?.response_choice ? (JSON.parse(response.response_choice) as SaResponse) : null; } catch { /* noop */ }
    const key: Partial<Record<SaItemId, SaSpan>> = {};
    stepIds.forEach((id) => { const a = acceptedFor(payload, id)[0]; if (a) key[id] = a; });

    return (
      <>
        <div className="rounded-xl border bg-white p-4 text-base leading-9 text-neutral-900">
          {renderSentence(key, false)}
        </div>
        <div className="space-y-2">
          {stepIds.map((id) => {
            const item = saved?.items?.find((i) => i.id === id);
            const correct = acceptedFor(payload, id)[0];
            return (
              <div
                key={id}
                className={`rounded-xl border px-3 py-2 text-sm ${item?.ok ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-800">{SA_STEP_LABEL[id]}</span>
                  <span className={item?.ok ? 'text-emerald-700' : 'text-red-600'}>{item?.ok ? '✓ 정답' : '✗ 오답'}</span>
                </div>
                {!item?.ok && (
                  <div className="mt-1 space-y-0.5 text-xs text-neutral-600">
                    <p>내 답: {item?.student ? spanText(tokens, item.student) : '—'}</p>
                    <p>정답: <span className="font-medium text-neutral-800">{correct ? spanText(tokens, correct) : ''}</span></p>
                    {item?.reason && <p className="text-red-600">{REASON_TEXT[item.reason]}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {response?.score_pct != null && (
          <div className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${response.is_correct ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {response.score_pct}점 · {response.is_correct ? '정답' : '오답'}
          </div>
        )}
        <button
          type="button"
          onClick={onNext}
          className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          {isLast ? (nextLabel ? `다음 블록: ${nextLabel} →` : '결과 보기 →') : '다음 →'}
        </button>
      </>
    );
  }

  // ── 풀이 화면 ────────────────────────────────────────────
  const stepsPayload = stepIds.map((id) => ({ id, span: confirmed[id] ?? null }));

  return (
    <>
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-sm text-indigo-800">
        <span className="mr-1 font-semibold">
          {allDone ? '완료' : `${currentStepIdx + 1}/${stepIds.length}`}
        </span>
        {currentId ? <>{SA_STEP_LABEL[currentId]} — {SA_STEP_PROMPT[currentId]}</> : '모든 표시를 마쳤어요. 제출하세요.'}
      </div>

      <div className="touch-none rounded-xl border bg-white p-4 text-base leading-9 text-neutral-900">
        {renderSentence(confirmed, true)}
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-neutral-500">
        <span className="border-b-2 border-blue-500">완전 주어</span>
        <span className="rounded bg-blue-100 px-1 font-bold text-blue-900">핵심 주어</span>
        <span className="rounded bg-emerald-100 px-1 font-bold text-emerald-900 ring-1 ring-emerald-400">동사</span>
      </div>

      {!allDone ? (
        <div className="flex gap-2">
          {(sel || Object.keys(confirmed).length > 0) && (
            <button
              type="button"
              onClick={sel ? clearSel : undoLast}
              className="rounded-xl border px-4 py-2.5 text-sm text-neutral-500 hover:bg-neutral-50"
            >
              {sel ? '선택 취소' : '이전 단계 다시'}
            </button>
          )}
          <button
            type="button"
            onClick={confirmSel}
            disabled={!sel}
            className="flex-1 rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
          >
            {sel ? `“${spanText(tokens, sel)}” 확정` : '구간을 드래그하세요'}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={undoLast}
            className="rounded-xl border px-4 py-2.5 text-sm text-neutral-500 hover:bg-neutral-50"
          >
            이전 단계 다시
          </button>
          <form
            className="flex-1"
            onSubmit={async (e) => { setSubmitting(true); await onSubmit(e); setSubmitting(false); }}
          >
            <input type="hidden" name="drill_type" value="structure_svo" />
            <input type="hidden" name="sa_version" value="2" />
            <input type="hidden" name="response_choice" value={JSON.stringify({ v: 2, steps: stepsPayload })} />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
            >
              {submitting ? '채점 중...' : '제출'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
