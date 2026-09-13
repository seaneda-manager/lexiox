// apps/web/components/typing/RetryChallenge.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { TypingSession } from '@/lib/typing/engine';
import type { TypingUnit } from '@/lib/typing/types';
import TypingCanvas from './TypingCanvas';

type Props = {
  words: string[];
  durationSec?: number;
  onFinish: (result: { completedCount: number; total: number }) => void;
};

/** A short, ungraded follow-up round: retype the words you just mistyped, against a countdown. */
export default function RetryChallenge({ words, durationSec = 15, onFinish }: Props) {
  const sessionRef = useRef<TypingSession | null>(null);
  const finishedRef = useRef(false);
  const [, setTick] = useState(0);
  const [timeLeft, setTimeLeft] = useState(durationSec);

  useEffect(() => {
    const units: TypingUnit[] = words.map((w, i) => ({ id: `retry-${i}`, text: w }));
    const session = new TypingSession({ units, revealMode: 'full', blankRatio: 0, shuffled: false, strict: false });
    session.start();
    sessionRef.current = session;
    setTick((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          finish();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const completed = sessionRef.current?.getProgress().current ?? 0;
    onFinish({ completedCount: completed, total: words.length });
  };

  const handleKey = (key: string) => {
    const session = sessionRef.current;
    if (!session || finishedRef.current) return;

    session.pressKey(key);

    if (session.isCurrentUnitComplete()) {
      session.completeUnit();
      if (session.isSessionComplete()) {
        finish();
        return;
      }
    }
    setTick((n) => n + 1);
  };

  const session = sessionRef.current;
  if (!session) return null;
  const progress = session.getProgress();

  return (
    <div className="space-y-3 text-left">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-gray-700">오타 단어 다시 치기</span>
        <span className={`font-bold tabular-nums ${timeLeft <= 5 ? 'text-red-600' : 'text-gray-600'}`}>⏱ {timeLeft}s</span>
      </div>
      <p className="text-xs text-gray-500">{progress.current}/{progress.total} 단어</p>
      <TypingCanvas chars={session.getRenderChars()} onKey={handleKey} />
    </div>
  );
}
