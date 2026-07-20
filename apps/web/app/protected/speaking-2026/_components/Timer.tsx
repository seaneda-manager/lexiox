'use client';

import React, { useEffect, useState } from 'react';

interface TimerProps {
  initialSeconds: number;
  onTimeUp?: () => void;
  isRunning?: boolean;
}

/**
 * 타이머 컴포넌트
 * - 우측 상단 배치
 * - MM:SS 포맷
 * - 10초 미만 시 빨간색
 */
export function Timer({ initialSeconds, onTimeUp, isRunning = true }: TimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialSeconds);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, onTimeUp]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isAlert = timeRemaining < 10;

  return (
    <div className="fixed top-6 right-6 text-right">
      <div className="text-sm text-gray-600 font-semibold mb-1">
        Time Remaining
      </div>
      <div
        className={`text-4xl font-mono font-bold transition-colors ${
          isAlert ? 'text-red-600' : 'text-gray-800'
        }`}
      >
        {timeString}
      </div>
    </div>
  );
}
