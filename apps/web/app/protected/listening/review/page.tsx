// apps/web/app/(protected)/listening/review/page.tsx
export const dynamic = 'force-dynamic';

import { getSupabaseServer } from '@/lib/supabaseServer';

type ReviewScore = {
  total: number;
  answered: number;
  correct: number;
  percent: number | string | null;
};

function getParam(sp: Record<string, string | string[] | undefined> | undefined, k: string) {
  const v = sp?.[k];
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

export default async function Page({
  searchParams,
}: { searchParams?: Record<string, string | string[] | undefined> }) {
  const sessionId = getParam(searchParams, 'sessionId');
  if (!sessionId) return <div className="p-6">Missing <b>sessionId</b></div>;

  const supabase = await getSupabaseServer();

 // NOTE: handle the .single() result safely here.
  const { data, error } = await supabase
    .rpc('listening_review_score', { p_session_id: sessionId })
    .single();

  if (error) return <div className="p-6 text-red-600">Review error: {error.message}</div>;
  const score = (data as unknown as ReviewScore) ?? null;
  if (!score) return <div className="p-6">No score</div>;

  const pctNum = Number(score.percent ?? 0);
  const pctSafe = Number.isFinite(pctNum) ? Math.max(0, Math.min(100, pctNum)) : 0;

  return (
    <div className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-xl font-semibold">Listening Review</h1>

      <ul className="rounded-2xl border bg-white p-5 space-y-2">
        <li className="flex justify-between"><span>Total (seen)</span><b>{score.total}</b></li>
        <li className="flex justify-between"><span>Answered</span><b>{score.answered}</b></li>
        <li className="flex justify-between"><span>Correct</span><b>{score.correct}</b></li>
        <li className="flex justify-between"><span>Percent</span><b>{pctSafe.toFixed(1)}%</b></li>
      </ul>

      <div className="rounded-xl border bg-white p-4">
        <div className="text-sm mb-2">Accuracy</div>
        <div className="h-2 w-full rounded bg-neutral-200 overflow-hidden">
          <div className="h-full" style={{ width: `${pctSafe}%`, background: 'linear-gradient(90deg,#fde047,#facc15)' }} />
        </div>
      </div>

      <div className="text-sm text-neutral-600">
        Session: <code className="bg-neutral-100 px-1.5 py-0.5 rounded">{sessionId}</code>
      </div>
    </div>
  );
}




