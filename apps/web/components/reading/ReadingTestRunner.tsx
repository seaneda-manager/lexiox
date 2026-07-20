// apps/web/components/reading/ReadingTestRunner.tsx
'use client';

import { useCallback, useMemo, useState } from 'react';
import type { RPassage, RQuestion } from '@/models/reading';
import PassagePane from './PassagePane';

type AnswerPayload = { sessionId: string; questionId: string; choiceId: string };

type Props = {
  passage: RPassage;
  sessionId: string;
  onAnswer?: (a: AnswerPayload) => Promise<{ ok: true }> | { ok: true };
  onFinish?: (a: { sessionId: string }) => Promise<{ ok: true }> | { ok: true };
};

type SummaryMeta = {
  candidates?: string[];
  correct?: number[];
  selectionCount?: number;
};

export default function ReadingTestRunner({
  passage,
  sessionId,
  onAnswer,
  onFinish,
}: Props) {
  // 질문 목록 (memo 없이)
  const qs = (passage.questions ?? []) as RQuestion[];
  const total = qs.length;

  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<Record<string, string | string[]>>({});
  const [viewTextSeen, setViewTextSeen] = useState<Record<string, boolean>>({});
  const [showFull, setShowFull] = useState(false);

  // 본문 문자열
  const contentStr = useMemo(
    () =>
      Array.isArray((passage as any).paragraphs)
        ? (passage as any).paragraphs.join('\n\n')
        : ((passage as any).content ?? ''),
    [passage]
  );

  // ✅ 안정화: useMemo로 래핑 (deps: [onAnswer], [onFinish])
  const onAnswerSafe = useMemo(
    () => onAnswer ?? (async () => ({ ok: true as const })),
    [onAnswer]
  );
  const onFinishSafe = useMemo(
    () => onFinish ?? (async () => ({ ok: true as const })),
    [onFinish]
  );

  const clamp = useCallback(
    (i: number) => Math.min(Math.max(0, i), Math.max(0, total - 1)),
    [total]
  );

  const q = qs[clamp(idx)] ?? null;
  const qKey = q?.id ?? '';
  const isSummary = q?.type === 'summary';

  const summaryMeta: SummaryMeta = ((q?.meta as any)?.summary ?? {}) as SummaryMeta;
  const selectionCount = Math.max(1, Number(summaryMeta.selectionCount ?? 2) || 2);

  const getSelArray = useCallback((): string[] => {
    if (!qKey) return [];
    const v = picked[qKey];
    return Array.isArray(v) ? v : typeof v === 'string' && v ? [v] : [];
  }, [picked, qKey]);

  const canInteract = !!q && (!isSummary || !!viewTextSeen[q.id]);
  const selArr = getSelArray();
  const remaining = isSummary ? selectionCount - selArr.length : 0;

  const prev = useCallback(() => setIdx((i) => clamp(i - 1)), [clamp]);

  const next = useCallback(async () => {
    if (!q) return;

    if (isSummary) {
      if (selArr.length !== selectionCount) {
        alert(`요약형 문항입니다. 정확히 ${selectionCount}개 선택해 주세요. (현재: ${selArr.length})`);
        return;
      }
      await onAnswerSafe({
        sessionId,
        questionId: q.id,
        choiceId: selArr.join('|'),
      });
    } else {
      const choiceId = picked[q.id] as string | undefined;
      if (!choiceId) {
        alert('하나를 선택해줘!');
        return;
      }
      await onAnswerSafe({ sessionId, questionId: q.id, choiceId });
    }

    if (idx < total - 1) setIdx(idx + 1);
    else {
      await onFinishSafe({ sessionId });
      alert('풀이 완료!');
    }
  }, [q, isSummary, selArr, selectionCount, onAnswerSafe, sessionId, picked, idx, total, onFinishSafe]);

  const toggle = useCallback(
    (cid: string) => {
      if (!qKey) return;
      setPicked((s) => {
        const cur = s[qKey];

        if (isSummary) {
          const arr = Array.isArray(cur) ? [...cur] : [];
          const i = arr.indexOf(cid);
          if (i >= 0) {
            arr.splice(i, 1);
            return { ...s, [qKey]: arr };
          }
          if (arr.length >= selectionCount) return s;
          return { ...s, [qKey]: [...arr, cid] };
        }

        return s[qKey] === cid ? s : { ...s, [qKey]: cid };
      });
    },
    [isSummary, qKey, selectionCount]
  );

  const canNext = useMemo(() => {
    if (!q) return false;
    if (isSummary) return selArr.length === selectionCount;
    return !!picked[q.id];
  }, [isSummary, picked, q, selArr.length, selectionCount]);

  const looksLikeHTML = useMemo(() => /<[a-z][\s\S]*>/i.test(contentStr), [contentStr]);

  // 문항 없음 안내 박스
  const noQuestionBox =
    total === 0 ? (
      <div className="p-6 rounded-xl border text-sm">
        로드된 문항이 없습니다. (passage: <b>{passage?.title ?? 'untitled'}</b>)
      </div>
    ) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:h-[calc(100vh-120px)] p-6">
      {/* 좌측: 문제 */}
      <div className="flex flex-col min-w-0">
        {noQuestionBox}

        {total > 0 && (
          <>
            <div className="text-sm text-neutral-500">
              Question {q?.number ?? idx + 1} / {total}{' '}
              {isSummary && (
                <span className="ml-2 rounded bg-purple-600/15 px-2 py-0.5 text-[11px] text-purple-700">
                  Summary: pick {selectionCount}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between mt-2 mb-3">
              <h2 className="text-lg font-semibold">{q?.stem ?? ''}</h2>
              {isSummary && !!q && (
                <button
                  type="button"
                  className="px-3 py-1.5 border rounded-lg text-sm"
                  onClick={() => {
                    setShowFull(true);
                    setViewTextSeen((s) => ({ ...s, [q.id]: true }));
                  }}
                >
                  View Text
                </button>
              )}
            </div>

            {isSummary && !!q && !canInteract && (
              <div className="mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                요약형 문항입니다. <b>View Text</b>를 눌러 본문을 확인한 뒤 선택할 수 있어요.
              </div>
            )}

            <ul className="space-y-2">
              {(q?.choices ?? []).map((c: any, i: number) => {
                const checked = isSummary ? selArr.includes(c.id) : picked[q!.id] === c.id;
                return (
                  <li key={c.id}>
                    <label
                      className={`flex gap-2 items-start border rounded-xl p-3 ${
                        canInteract ? 'cursor-pointer hover:bg-white/5' : 'opacity-50 cursor-not-allowed'
                      } ${checked ? 'ring-2 ring-purple-400/40' : ''}`}
                    >
                      <input
                        type={isSummary ? 'checkbox' : 'radio'}
                        name={`q-${q?.id ?? 'x'}`}
                        disabled={!canInteract}
                        checked={!!checked}
                        onChange={() => canInteract && toggle(String(c.id))}
                        className="mt-1"
                        aria-label={`Choice ${i + 1}`}
                      />
                      <span>{c.text}</span>
                    </label>
                  </li>
                );
              })}
            </ul>

            {isSummary && (
              <div className="mt-2 text-xs text-neutral-500">
                선택: {selArr.length} / {selectionCount} {remaining > 0 ? `(남은 개수: ${remaining})` : ''}
              </div>
            )}

            <div className="mt-auto flex justify-between pt-4">
              <button className="px-4 py-2 rounded border" disabled={idx === 0} onClick={prev}>
                Prev
              </button>
              <button
                className={`px-4 py-2 rounded border ${canNext ? '' : 'opacity-50 cursor-not-allowed'}`}
                onClick={next}
                disabled={!canNext}
              >
                {idx < total - 1 ? 'Next' : 'Finish'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* 우측: 지문 */}
      <div className="h-full border rounded-2xl p-4 overflow-auto">
        <PassagePane content={contentStr} q={q ?? undefined} />
      </div>

      {/* 전체 보기 모달 */}
      {showFull && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowFull(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white text-black max-w-3xl w-[90vw] max-h-[80vh] rounded-2xl p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Full Text</h3>
              <button className="px-3 py-1.5 border rounded-lg text-sm" onClick={() => setShowFull(false)}>
                Close
              </button>
            </div>

            {looksLikeHTML ? (
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: contentStr }} />
            ) : (
              <pre className="prose max-w-none whitespace-pre-wrap text-[15px] leading-7">{contentStr}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
