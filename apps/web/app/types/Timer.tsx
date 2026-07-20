'use client';
import { useEffect, useState } from 'react';

export default function Timer({
  seconds,
  onTimeUp
}: { seconds: number; onTimeUp?: () => void }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) { onTimeUp?.(); return; }
    const id = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(id);
  }, [left, onTimeUp]);
  return <div aria-label="timer">{left}s</div>;
}





