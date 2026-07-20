// apps/web/components/reading/StudyRunner.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { startReadingSession, submitReadingAnswer, finishReadingSession } from '@/actions/reading';

type RChoice = { id: string; label?: string; text?: string; is_correct?: boolean };
type RQuestion = { id: string; number?: number; stem?: string; choices?: RChoice[] };
type Passage = { id: string; title?: string; content?: string; questions?: RQuestion[] };

export default function StudyRunner({ passage }: { passage: Passage }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [startError, setStartError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [isFinishing, setIsFinishing] = useState(false);

  const didStartRef = useRef(false);

  const questions = useMemo<RQuestion[]>(
    () => (Array.isArray(passage.questions) ? [...passage.questions] : []),
    [passage.questions]
  );

  const total = questions.length;
  const q = questions[current];

  useEffect(() => {
    if (didStartRef.current) return;
    didStartRef.current = true;

    let active = true;

    (async () => {
      try {
        setIsStarting(true);
        setStartError(null);

        const res = await startReadingSession({
          passageId: String(passage.id),
          mode: 'study' as const,
        });

        if (!active) return;

        const sid = res && 'sessionId' in res ? String(res.sessionId) : null;

        if (!sid || sid.startsWith('local-')) {
          throw new Error('Failed to create DB reading session');
        }

        setSessionId(sid);
      } catch (err) {
        console.error('[StudyRunner] failed to start reading session', err);
        if (!active) return;
        setSessionId(null);
        setStartError('Failed to start reading session.');
      } finally {
        if (active) setIsStarting(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [passage.id]);

  const pick = useCallback(
    async (questionId: string, choiceId: string) => {
      setAnswers((prev) => ({ ...prev, [questionId]: choiceId }));
      setSubmitError(null);

      if (!sessionId || sessionId.startsWith('local-')) {
        setSubmitError('Cannot save answer because the reading session was not created.');
        return;
      }

      try {
        await submitReadingAnswer({
          sessionId,
          questionId: String(questionId),
          choiceId: String(choiceId),
        });
      } catch (err) {
        console.error('[StudyRunner] failed to submit reading answer', err);
        setSubmitError('Failed to save answer.');
      }
    },
    [sessionId]
  );

  const onFinish = useCallback(async () => {
    setFinishError(null);

    if (!sessionId || sessionId.startsWith('local-')) {
      setFinishError('Cannot finish because the reading session was not created.');
      return;
    }

    try {
      setIsFinishing(true);
      await finishReadingSession({ sessionId });
      // TODO: navigate to review page if desired
    } catch (err) {
      console.error('[StudyRunner] failed to finish reading session', err);
      setFinishError('Failed to finish reading session.');
    } finally {
      setIsFinishing(false);
    }
  }, [sessionId]);

  if (!q) {
    return <div className="p-4 text-sm text-gray-500">No questions available.</div>;
  }

  const controlsDisabled = isStarting || !sessionId || !!startError;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Passage */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{passage.title ?? 'Passage'}</h2>
        <div className="prose whitespace-pre-wrap">{passage.content ?? ''}</div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {isStarting && (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
            Starting reading session...
          </div>
        )}

        {startError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {startError}
          </div>
        )}

        {submitError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {submitError}
          </div>
        )}

        {finishError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {finishError}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {Math.min(current + 1, total)} / {total}
          </div>
          <div className="space-x-2">
            <button
              className="rounded-xl border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current <= 0}
            >
              &larr; Prev
            </button>
            <button
              className="rounded-xl border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
              disabled={current >= total - 1}
            >
              Next &rarr;
            </button>
          </div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="mb-2 font-medium whitespace-pre-wrap">
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
                    'rounded-md border px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-50',
                    selected ? 'bg-black text-white' : 'bg-white',
                  ].join(' ')}
                  onClick={() => pick(String(q.id), String(c.id))}
                  disabled={controlsDisabled}
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
            className="rounded-xl border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onFinish}
            disabled={controlsDisabled || isFinishing}
            title={sessionId ? undefined : 'Start a session first'}
          >
            {isFinishing ? 'Finishing...' : 'Finish'}
          </button>
        </div>
      </div>
    </div>
  );
}