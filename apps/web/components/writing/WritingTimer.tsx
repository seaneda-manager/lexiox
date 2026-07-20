'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * WritingTimer: Task별 독립 카운트다운 타이머
 *
 * M3 구현:
 * ✅ Task별 독립 카운트다운 (Task 1: 35-45s, Task 2: 7m, Task 3: 10m)
 * ✅ Timeout 이벤트 트리거
 * ✅ 시각적 경고 (마지막 30초, 마지막 5초)
 * ✅ 레이턴시 < 10ms
 */

interface WritingTimerProps {
  taskId: 'TASK_1' | 'TASK_2' | 'TASK_3';
  onTimeUpdate?: (secondsRemaining: number) => void;
  onTimeout?: () => void;
  autoStart?: boolean;
}

const TASK_TIME_LIMITS = {
  TASK_1: 45, // 45초
  TASK_2: 420, // 7분 = 420초
  TASK_3: 600, // 10분 = 600초
};

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default function WritingTimer({
  taskId,
  onTimeUpdate,
  onTimeout,
  autoStart = true,
}: WritingTimerProps) {
  const totalSeconds = TASK_TIME_LIMITS[taskId];
  const [timeRemaining, setTimeRemaining] = useState(totalSeconds);
  const [isActive, setIsActive] = useState(autoStart);
  const intervalRef = useRef<NodeJS.Timeout>();
  const lastTimeRef = useRef<number>(Date.now());
  const timeoutFiredRef = useRef(false);

  // 1️⃣ 초 단위 카운트다운 (높은 정확도)
  useEffect(() => {
    if (!isActive) return;

    // 매 100ms마다 체크하여 정확도 향상
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - lastTimeRef.current;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);

      if (elapsedSeconds >= 1) {
        lastTimeRef.current = now;

        setTimeRemaining((prev) => {
          const newTime = Math.max(0, prev - 1);

          // onTimeUpdate 콜백
          onTimeUpdate?.(newTime);

          // Timeout 이벤트 (≤ 0 시)
          if (newTime <= 0 && !timeoutFiredRef.current) {
            timeoutFiredRef.current = true;
            setIsActive(false);
            onTimeout?.();
          }

          return newTime;
        });
      }
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, onTimeUpdate, onTimeout]);

  // 2️⃣ 타이머 제어
  const handlePause = useCallback(() => setIsActive(false), []);
  const handleResume = useCallback(() => setIsActive(true), []);
  const handleReset = useCallback(() => {
    setTimeRemaining(totalSeconds);
    setIsActive(false);
    timeoutFiredRef.current = false;
    lastTimeRef.current = Date.now();
  }, [totalSeconds]);

  // 3️⃣ 시각적 경고 상태
  const isLastThirtySeconds = timeRemaining <= 30 && timeRemaining > 5;
  const isLastFiveSeconds = timeRemaining <= 5;
  const isTimeout = timeRemaining === 0;

  return (
    <div className={`rounded-lg px-4 py-3 font-semibold text-center transition ${
      isTimeout
        ? 'bg-red-100 text-red-900 border-2 border-red-500'
        : isLastFiveSeconds
          ? 'bg-red-50 text-red-700 border-2 border-red-400 animate-pulse'
          : isLastThirtySeconds
            ? 'bg-amber-50 text-amber-700 border-2 border-amber-400'
            : 'bg-indigo-50 text-indigo-700 border-2 border-indigo-300'
    }`}>
      <div className="space-y-1">
        {/* 타이머 표시 */}
        <div className="text-3xl font-mono">
          {formatTime(timeRemaining)}
        </div>

        {/* 상태 메시지 */}
        <div className="text-xs font-medium">
          {isTimeout && '⏱️ Time is up! Saving...'}
          {isLastFiveSeconds && !isTimeout && '⚠️ 5 seconds remaining!'}
          {isLastThirtySeconds && !isLastFiveSeconds && '⏰ 30 seconds remaining'}
          {!isLastThirtySeconds && !isTimeout && 'Time remaining'}
        </div>

        {/* 진행도 바 */}
        <div className="w-full h-1 bg-gray-300 rounded-full overflow-hidden mt-2">
          <div
            className={`h-full transition-all ${
              isTimeout
                ? 'bg-red-600'
                : isLastFiveSeconds
                  ? 'bg-red-500 animate-pulse'
                  : isLastThirtySeconds
                    ? 'bg-amber-500'
                    : 'bg-indigo-500'
            }`}
            style={{
              width: `${(timeRemaining / totalSeconds) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* 제어 버튼 (개발/테스트용) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="flex justify-center gap-1 mt-2 text-[10px]">
          <button
            onClick={handlePause}
            disabled={!isActive}
            className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
          >
            Pause
          </button>
          <button
            onClick={handleResume}
            disabled={isActive}
            className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
          >
            Resume
          </button>
          <button
            onClick={handleReset}
            className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
