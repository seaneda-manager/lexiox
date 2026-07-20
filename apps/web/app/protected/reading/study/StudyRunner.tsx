// apps/web/components/reading/StudyRunner.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { startReadingSession, submitReadingAnswer, finishReadingSession } from '@/actions/reading';

type RChoice = { id: string; label?: string; text?: string; is_correct?: boolean };
type RQuestion = { id: string; number?: number; stem?: string; choices?: RChoice[] };
type Passage = { id: string; title?: string; content?: string; questions?: RQuestion[] };

export default function StudyRunner({ passage }: { passage: Passage }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const questions = useMemo<RQuestion[]>(
    () => (Array.isArray(passage.questions) ? [...passage.questions] : []),
    [passage.questions]
  );

  const total = questions.length;
  const q = questions[current];

  /** Start a study session (fallback to local session if API fails) */
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await startReadingSession({ passageId: String(passage.id), mode: 'study' as const });
        if (!active) return;
        const sid = (res && 'sessionId' in res) ? String(res.sessionId) : null;
        setSessionId(sid ?? `local-${Date.now()}`);
      } catch {
        if (active) setSessionId(`local-${Date.now()}`);
      }
    })();
    return () => {
      active = false;
    };
  }, [passage.id]);

  /** Pick an answer (optimistic), sync to server if session exists */
  const pick = useCallback(
    async (questionId: string, choiceId: string) => {
      setAnswers((prev) => ({ ...prev, [questionId]: choiceId }));
      if (!sessionId) return;
      await submitReadingAnswer({
        sessionId,
        questionId: String(questionId),
        choiceId: String(choiceId),
      });
    },
    [sessionId]
  );

  const onFinish = useCallback(async () => {
    if (sessionId) {
      await finishReadingSession({ sessionId });
    }
    // TODO: navigate to review page if desired
  }, [sessionId]);

  if (!q) {
    return <div className="p-4 text-sm text-gray-500">No questions available.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Passage */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{passage.title ?? 'Passage'}</h2>
        <div className="prose whitespace-pre-wrap">{passage.content ?? ''}</div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {Math.min(current + 1, total)} / {total}
          </div>
          <div className="space-x-2">
            <button
              className="rounded-xl border px-3 py-2"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current <= 0}
            >
              &larr; Prev
            </button>
            <button
              className="rounded-xl border px-3 py-2"
              onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
              disabled={current >= total - 1}
            >
              Next &rarr;
            </button>
          </div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="mb-2 font-medium whitespace-pre-wrap">
            {/* 모지바케/미종결 방지: 두 조각으로 안전하게 분리 */}
            {q.number ? `${q.number}. ` : ''}
            {q.stem ?? ''}
          </div>

          <div className="grid grid-cols-1 gap-2">
            {(q.choices ?? []).map((c) => {
              const selected = answers[q.id] === c.id;
              return (
                <button
                  key={c.id}
                  className={[
                    'rounded-md border px-3 py-2 text-left',
                    selected ? 'bg-black text-white' : 'bg-white',
                  ].join(' ')}
                  onClick={() => pick(String(q.id), String(c.id))}
                >
                  {c.label ? `${c.label}. ` : ''}
                  {c.text ?? ''}
                </button>
              );
            })}
            {(q.choices ?? []).length === 0 && (
              <div className="text-sm text-neutral-500">No choices for this question.</div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            className="rounded-xl border px-4 py-2"
            onClick={onFinish}
            disabled={!sessionId}
            title={sessionId ? undefined : 'Start a session first'}
          >
            Finish
          </button>
        </div>
      </div>
    </div>
  );
}
