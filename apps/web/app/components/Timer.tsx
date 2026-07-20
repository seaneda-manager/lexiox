/* apps/web/app/components/Timer.tsx */
'use client';
import { useEffect, useState } from 'react';

export default function Timer({ totalSec, onTimeUp }: { totalSec: number; onTimeUp?: () => void }) {
  const [left, setLeft] = useState(totalSec);

  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (left === 0) onTimeUp?.();
  }, [left, onTimeUp]);

  const m = Math.floor(left / 60).toString().padStart(2, '0');
  const s = (left % 60).toString().padStart(2, '0');
  const pct = ((totalSec - left) / totalSec) * 100;

  return (
    <div className="flex items-center gap-3">
      <div aria-live="polite" className={`text-lg font-semibold tabular-nums ${left <= 30 ? 'text-red-600' : 'text-gray-900'}`}>
        {m}:{s}
      </div>
      <div className="w-40">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full ${left <= 30 ? 'bg-red-500' : 'bg-brand-500'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}





