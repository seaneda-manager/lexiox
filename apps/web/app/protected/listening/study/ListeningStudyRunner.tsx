'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LTimer from '@/app/protected/listening/components/LTimer';
import {
  startListeningSession,
  submitListeningAnswer,
  finishListeningSession,
} from '@/actions/listening';
import type { ListeningTrack, LQuestion } from '@/types/types-listening';
import { isChoiceCorrect } from '@/types/types-listening';

import TopBar from '@/components/test/TopBar';
import AudioPanel from '@/components/test/AudioPanel';

type Props = {
  track: ListeningTrack | undefined;
  onFinish?: (sessionId: string) => void;
};

type LChoice = NonNullable<LQuestion['choices']>[number];

export default function ListeningStudyRunner({ track, onFinish }: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [current, setCurrent] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [showCorrect, setShowCorrect] = useState<boolean>(true);
  const [showTimer, setShowTimer] = useState<boolean>(true);
  const [startErr, setStartErr] = useState<string | null>(null);

  const qs: LQuestion[] = useMemo(() => track?.questions ?? [], [track?.questions]);
  const total: number = qs.length;

  const clamp = useCallback(
    (i: number) => Math.min(Math.max(0, i), Math.max(0, total - 1)),
    [total]
  );

  // 트랙 변경 시 초기화
  const trackId = track?.id;
  useEffect(() => {
    setCurrent(0);
    setAnswers({});
    setShowTimer(true);
  }, [trackId]);

  // 세션 시작
  const startedForIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!trackId) return;
    if (startedForIdRef.current === trackId) return;
    let cancelled = false;
    (async () => {
      try {
        setStartErr(null);
        const { sessionId: sid } = await startListeningSession({
          setId: (track as any)?.setId ?? trackId,
          mode: 'p', // practice
        });
        if (!cancelled) {
          setSessionId(sid);
          startedForIdRef.current = trackId;
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to start session';
        setStartErr(msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trackId, track]);

  const q: LQuestion | undefined = total > 0 ? qs[clamp(current)] : undefined;
  const qKey: string = q ? String(q.id) : '';

  const guardedGo = useCallback(
    (to: number) => {
      if (total === 0) return;
      setCurrent(clamp(to));
    },
    [clamp, total]
  );

  const pick = useCallback(
    async (choiceId: string) => {
      if (!q) return;
      const key = String(q.id);
      setAnswers((s) => ({ ...s, [key]: choiceId }));
      if (!sessionId) return;

      try {
        await submitListeningAnswer({
          sessionId,
          questionId: key,
          choiceId,
        });
      } catch {
        // ignore
      }
    },
    [q, sessionId]
  );

  const finish = useCallback(async () => {
    if (!sessionId) return;
    try {
      await finishListeningSession({ sessionId });
    } finally {
      onFinish?.(sessionId);
    }
  }, [onFinish, sessionId]);

  const handleNext = useCallback(() => {
    if (current < total - 1) {
      guardedGo(current + 1);
    } else {
      void finish();
    }
  }, [current, total, guardedGo, finish]);

  const answeredByIndex = useMemo(() => {
    const map: Record<number, boolean> = {};
    qs.forEach((qq, i) => {
      map[i] = answers[String(qq.id)] != null;
    });
    return map;
  }, [qs, answers]);

  const answeredCount = useMemo(
    () => Object.values(answeredByIndex).filter(Boolean).length,
    [answeredByIndex]
  );
  const progressPct = Math.round((answeredCount / Math.max(1, total)) * 100);

  const choiceLabel = useCallback((i: number) => String.fromCharCode(65 + i), []);
  const limitSec = track?.timeLimitSec ?? track?.durationSec ?? 600;

  // -------- 렌더 --------
  return (
    <div className="space-y-3">
      {/* progress */}
      <div className="h-1 overflow-hidden rounded bg-gray-200" aria-hidden>
        <div className="h-1 bg-black" style={{ width: `${progressPct}%` }} />
      </div>

      {/* top bar */}
      <TopBar
        mode="study"
        section="listening"
        qIndex={clamp(current)}
        total={total}
        onBack={() => guardedGo(current - 1)}
        onNext={handleNext}
        onPause={() => {}}
        onReview={() => {}}
        onToggleTime={() => setShowTimer((v) => !v)}
        showTime={showTimer}
      />

      {/* session start error */}
      {startErr && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Session start failed: {startErr}
        </div>
      )}

      {/* empty states */}
      {!track ? (
        <div className="p-6 text-center text-gray-600">No listening track. Please select a track.</div>
      ) : total === 0 ? (
        <div className="p-6 text-center text-gray-600">No questions.</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px,1fr]">
          {/* left */}
          <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-5rem)] lg:overflow-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Listening (Study){' '}
                <span className="text-sm text-gray-500">#{trackId}</span>
              </h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded border px-3 py-1.5 text-sm"
                  onClick={() => setShowCorrect((v) => !v)}
                  aria-pressed={showCorrect}
                  title="Toggle show correct"
                >
                  {showCorrect ? 'Hide correct' : 'Show correct'}
                </button>
                {showTimer && (
                  <LTimer key={trackId} totalSeconds={limitSec} onExpire={finish} />
                )}
              </div>
            </div>

            {/* audio */}
            <div className="mt-4">
              <AudioPanel key={trackId} src={track.audioUrl} allowSeek allowSpeed />
            </div>

            {/* answered count */}
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span>
                {answeredCount}/{total} answered
              </span>
            </div>

            {/* navigator */}
            <div className="mt-2 flex flex-wrap gap-2">
              {Array.from({ length: total }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => guardedGo(i)}
                  className={[
                    'h-10 w-10 rounded-md border text-sm',
                    i === clamp(current) ? 'border-black bg-black text-white' : 'bg-white',
                    answeredByIndex[i] ? 'border-green-500' : 'border-gray-300',
                  ].join(' ')}
                  aria-current={i === clamp(current) ? 'page' : undefined}
                  aria-label={`Go to question ${i + 1}`}
                  title={`Question ${qs[i]?.number ?? i + 1}`}
                >
                  {qs[i]?.number ?? i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* right */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {(q?.number ?? clamp(current) + 1)} / {total}{' '}
                {answers[qKey] ? '' : '(unanswered)'}
              </div>
              <div className="space-x-2">
                <button
                  type="button"
                  className="rounded border px-3 py-2"
                  onClick={() => guardedGo(current - 1)}
                  disabled={clamp(current) <= 0 || !sessionId}
                >
                  ← Prev
                </button>
                {clamp(current) < total - 1 ? (
                  <button
                    type="button"
                    className="rounded border px-3 py-2"
                    onClick={() => guardedGo(current + 1)}
                    disabled={!sessionId}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    type="button"
                    className="rounded border bg-white/10 px-3 py-2"
                    onClick={finish}
                    disabled={!sessionId}
                    title={sessionId ? undefined : 'Session not started yet'}
                  >
                    Finish
                  </button>
                )}
              </div>
            </div>

            {q ? (
              <div className="space-y-3 rounded border p-4">
                <div id={`q-label-${qKey}`} className="font-medium">{q.prompt}</div>
                <div className="space-y-2" role="radiogroup" aria-labelledby={`q-label-${qKey}`}>
                  {q.choices?.map((c: LChoice, idx: number) => {
                    const selected = answers[qKey] === c.id;
                    const correct = isChoiceCorrect(q, c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`q-${qKey}`}
                          checked={selected || false}
                          onChange={() => pick(c.id)}
                        />
                        <span className="flex items-center gap-2">
                          <span className="font-mono">{choiceLabel(idx)}.</span>
                          <span>{c.text}</span>
                          {showCorrect && correct ? (
                            <span
                              className="inline-flex items-center rounded border px-2 py-0.5 text-xs"
                              aria-label="correct"
                              title="correct"
                            >
                              ✓
                            </span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded bg-amber-50 p-4 text-amber-800">
                No current question.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
