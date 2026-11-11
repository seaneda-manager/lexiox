'use client';

import { useState, useTransition } from 'react';
import { markConceptDoneAction } from '../actions';

export default function DoneButton({ conceptId, level, initialDone }: { conceptId: string; level: number; initialDone: boolean }) {
  const [done, setDone] = useState(initialDone);
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();

  if (done) return <div className="rounded-xl bg-emerald-50 px-4 py-2.5 text-center text-sm font-medium text-emerald-700">✓ 이 레슨을 완료했어요</div>;
  return (
    <div className="space-y-1">
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            setErr('');
            const r = await markConceptDoneAction(conceptId, level);
            if ('error' in r) setErr(r.error);
            else setDone(true);
          })
        }
        className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending ? '저장 중…' : '레슨 완료'}
      </button>
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}
