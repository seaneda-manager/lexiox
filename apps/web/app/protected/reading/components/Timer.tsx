'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';

type Props = {
  totalSeconds: number;
  autoStart?: boolean;
  initialElapsed?: number; // ms 단위가 아닌 “초” 단위로 받음
  onTickAction?: (remainingSeconds: number) => void;
  onExpireAction?: () => void;
  clampToZero?: boolean;
  showControls?: boolean;
  ariaLive?: 'off' | 'polite' | 'assertive';
  className?: string;
  showTenths?: boolean;
  direction?: 'down' | 'up';
};

export default function Timer({
  totalSeconds,
  autoStart = true,
  initialElapsed = 0,
  onTickAction,
  onExpireAction,
  clampToZero = true,
  showControls = true,
  ariaLive = 'polite',
  className = '',
  showTenths = false,
  direction = 'down',
}: Props) {
  const totalMs = useMemo(() => Math.max(0, Math.floor(totalSeconds * 1000)), [totalSeconds]);
  const initialElapsedMs = Math.max(0, Math.floor(initialElapsed * 1000));

  const [running, setRunning] = useState<boolean>(autoStart);
  const [elapsedMs, setElapsedMs] = useState<number>(initialElapsedMs);

  const startAtRef = useRef<number | null>(null);
  const pausedAccRef = useRef<number>(initialElapsedMs);
  const expiredRef = useRef<boolean>(false);

  const start = useCallback(() => {
    if (expiredRef.current) return;
    if (startAtRef.current == null) startAtRef.current = Date.now();
    setRunning(true);
  }, []);

  const pause = useCallback(() => {
    if (!running || startAtRef.current == null) return;
    const now = Date.now();
    pausedAccRef.current += now - startAtRef.current;
    startAtRef.current = null;
    setRunning(false);
  }, [running]);

  const reset = useCallback(() => {
    expiredRef.current = false;
    startAtRef.current = null;
    pausedAccRef.current = initialElapsedMs;
    setElapsedMs(initialElapsedMs);
    setRunning(autoStart);
  }, [autoStart, initialElapsedMs]);

  // total/initial 변경 시 초기화
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalMs, initialElapsedMs]);

  // 틱 루프
  useEffect(() => {
    let tm = 0;
    const tick = () => {
      if (!running) {
        setElapsedMs(pausedAccRef.current);
      } else {
        const now = Date.now();
        if (startAtRef.current == null) startAtRef.current = now;
        const elapsed = (now - startAtRef.current) + pausedAccRef.current;
        setElapsedMs(elapsed);

        if (!expiredRef.current && elapsed >= totalMs) {
          expiredRef.current = true;
          setRunning(false);
          onExpireAction?.();
        }
      }

      const remainingSeconds =
        direction === 'down'
          ? Math.max(0, Math.ceil((totalMs - (running ? (Date.now() - (startAtRef.current ?? Date.now())) + pausedAccRef.current : pausedAccRef.current)) / 1000))
          : Math.floor(elapsedMs / 1000);

      onTickAction?.(remainingSeconds);
      tm = window.setTimeout(tick, showTenths ? 100 : 250);
    };

    tm = window.setTimeout(tick, showTenths ? 100 : 250);
    return () => window.clearTimeout(tm);
  }, [running, totalMs, onExpireAction, onTickAction, direction, showTenths, elapsedMs]);

  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const displayMs = direction === 'down' ? remainingMs : elapsedMs;
  const base = clampToZero ? Math.max(0, displayMs) : displayMs;

  const totalSec = showTenths ? base / 1000 : Math.round(base / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = Math.floor(totalSec % 60);
  const tenth = showTenths ? Math.floor((base % 1000) / 100) : null;

  return (
    <div className={className} aria-live={ariaLive}>
      <div className="inline-flex items-center gap-2">
        <span className="font-mono tabular-nums text-sm">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          {showTenths ? <small>.{tenth}</small> : null}
        </span>
        {showControls && (
          <div className="flex items-center gap-1">
            <button type="button" className="rounded border px-2 py-0.5 text-xs" onClick={running ? pause : start}>
              {running ? 'Pause' : 'Start'}
            </button>
            <button type="button" className="rounded border px-2 py-0.5 text-xs" onClick={reset}>
              Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
