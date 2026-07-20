// apps/web/app/(protected)/_hooks/useDeadlineTimer.ts
'use client';
import { useEffect, useState } from 'react';

export function useDeadlineTimer(deadlineAtISO: string) {
  const [now, setNow] = useState<number>(() => (typeof window === 'undefined' ? 0 : Date.now()));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  const left = Math.max(0, new Date(deadlineAtISO).getTime() - now);
  return { msLeft: left, expired: left === 0 };
}
