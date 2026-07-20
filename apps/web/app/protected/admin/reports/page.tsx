// apps/web/app/(protected)/admin/reports/page.tsx
export const dynamic = 'force-dynamic';

type Row = {
  passage_id: string;
  title: string;
  answers: number;
  correct: number;
  accuracy: number; // %
  avg_ms: number | null;
};

type Resp = {
  summary: {
    passages: number;
    sessions: number;
    users: number;
    answers: number;
    accuracy: number;
  };
  list: Row[];
};

async function fetchReports(): Promise<{ data: Resp | null; err: string | null }> {
  try {
    // 서버 컴포넌트에서 내부 API 상대경로로 직접 호출 (헤더/쿠키 수동 전파 불필요)
    const res = await fetch('/api/admin/reports/reading', { cache: 'no-store' });
    if (!res.ok) {
      const txt = await res.text();
      return { data: null, err: txt || `HTTP ${res.status}` };
    }
    const json = (await res.json()) as Resp;
    return { data: json, err: null };
  } catch (e: any) {
    return { data: null, err: e?.message ?? 'Network error' };
  }
}

export default async function ReportsPage() {
  const { data, err } = await fetchReports();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reading Reports</h1>
        <p className="text-sm text-muted-foreground">지문별 응답/정답 및 평균 소요시간</p>
      </div>

      {data && (
        <div className="grid gap-3 sm:grid-cols-5">
          <KPI label="Passages" value={data.summary.passages} />
          <KPI label="Sessions" value={data.summary.sessions} />
          <KPI label="Users" value={data.summary.users} />
          <KPI label="Answers" value={data.summary.answers} />
          <KPI label="Accuracy" value={`${data.summary.accuracy}%`} />
        </div>
      )}

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left">Passage</th>
              <th className="px-3 py-2 text-left">Answers</th>
              <th className="px-3 py-2 text-left">Correct</th>
              <th className="px-3 py-2 text-left">Accuracy</th>
              <th className="px-3 py-2 text-left">Avg Time</th>
            </tr>
          </thead>
          <tbody>
            {(data?.list ?? []).map((r) => (
              <tr key={r.passage_id} className="border-t">
                <td className="px-3 py-2">{r.title}</td>
                <td className="px-3 py-2">{r.answers}</td>
                <td className="px-3 py-2">{r.correct}</td>
                <td className="px-3 py-2">{r.accuracy}%</td>
                <td className="px-3 py-2">
                  {r.avg_ms !== null ? `${Math.round(r.avg_ms / 1000)}s` : '-'}
                </td>
              </tr>
            ))}
            {(data?.list?.length ?? 0) === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-neutral-500" colSpan={5}>
                  데이터가 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
