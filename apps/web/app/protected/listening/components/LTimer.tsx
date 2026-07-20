'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Lightweight timer for Listening pages.
 * - no setState during render
 * - no reading refs during render (only in handlers/effects)
 * - exposes minimal API: totalSeconds, onExpire, (optional) autoStart
 */
type Props = {
  totalSeconds: number;
  onExpire?: () => void | Promise<void>;
  autoStart?: boolean;
  className?: string;
};

export default function LTimer({
  totalSeconds,
  onExpire,
  autoStart = true,
  className = '',
}: Props) {
  // “시간 원천”은 Date.now()를 effects/RAF 안에서만 읽는다.
  const startMsRef = useRef<number | null>(null);
  const pausedAccMsRef = useRef(0); // 누적 일시정지 시간
  const runningRef = useRef<boolean>(false);
  const rafRef = useRef<number | null>(null);

  // 화면 표시만 state로 관리
  const [remainingMs, setRemainingMs] = useState<number>(totalSeconds * 1000);

  // totalSeconds 바뀌면 리셋 (render 중 setState 금지 -> effect에서)
  useEffect(() => {
    // 초기화
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    startMsRef.current = null;
    pausedAccMsRef.current = 0;
    runningRef.current = false;
    setRemainingMs(Math.max(0, totalSeconds * 1000));

    if (autoStart) {
      // 다음 tick 에서 시작
      requestAnimationFrame(() => {
        start();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSeconds, autoStart]);

  const updateFrame = useCallback(() => {
    // 렌더 중 ref 읽지 않음: 이 함수는 RAF 핸들러에서만 호출됨
    const start = startMsRef.current;
    const now = Date.now();
    const pausedAcc = pausedAccMsRef.current;

    let elapsed = 0;
    if (runningRef.current && start != null) {
      elapsed = now - start + pausedAcc;
    } else {
      elapsed = pausedAcc;
    }
    if (!Number.isFinite(elapsed) || elapsed < 0) elapsed = 0;

    const totalMs = Math.max(0, Math.floor(totalSeconds * 1000));
    const nextRemaining = Math.max(0, totalMs - elapsed);

    setRemainingMs(nextRemaining);

    if (nextRemaining <= 0) {
      runningRef.current = false;
      startMsRef.current = null;
      pausedAccMsRef.current = totalMs; // 소진
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      void onExpire?.();
      return;
    }

    rafRef.current = requestAnimationFrame(updateFrame);
  }, [onExpire, totalSeconds]);

  const start = useCallback(() => {
    if (runningRef.current) return;
    const now = Date.now();
    if (startMsRef.current == null) {
      startMsRef.current = now;
      pausedAccMsRef.current = 0;
    } else {
      // resume: start 지점을 now 로 옮기고 paused 누적은 유지
      startMsRef.current = now;
    }
    runningRef.current = true;

    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(updateFrame);
    }
  }, [updateFrame]);

  const pause = useCallback(() => {
    if (!runningRef.current) return;
    const now = Date.now();
    const start = startMsRef.current ?? now;
    pausedAccMsRef.current += now - start; // 경과분 누적
    runningRef.current = false;
    startMsRef.current = null;

    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // 남은 시간은 다음 render 의 RAF 재시작 시 계속 갱신
  }, []);

  const reset = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    startMsRef.current = null;
    pausedAccMsRef.current = 0;
    runningRef.current = false;
    setRemainingMs(Math.max(0, totalSeconds * 1000));
  }, [totalSeconds]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const { mm, ss } = useMemo(() => {
    const sec = Math.floor(remainingMs / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return {
      mm: String(m).padStart(2, '0'),
      ss: String(s).padStart(2, '0'),
    };
  }, [remainingMs]);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span aria-live="polite" aria-atomic="true" className="font-mono tabular-nums">
        {mm}:{ss}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="rounded border px-2 py-0.5 text-xs"
          onClick={start}
          title="Start"
        >
          Start
        </button>
        <button
          type="button"
          className="rounded border px-2 py-0.5 text-xs"
          onClick={pause}
          title="Pause"
        >
          Pause
        </button>
        <button
          type="button"
          className="rounded border px-2 py-0.5 text-xs"
          onClick={reset}
          title="Reset"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
