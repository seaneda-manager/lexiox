// apps/web/app/(protected)/listening/review/[sessionId]/page.tsx
import { getSupabaseServer } from '@/lib/supabaseServer';

type Row = {
  q_no: number;
  question: string | null;
  user_choice: string | null;
  correct_choice: string | null;
  is_correct: boolean | null;
};

type Score = { total: number; correct: number };

export default async function ListeningReviewPage(props: any) {
  const { params } = props as { params: { sessionId: string } };

  const supabase = await getSupabaseServer(); // ✅ await 추가

  // 세션ID는 bigint 기준 number로 사용
  const sid = Number(params.sessionId);

  // 점수 한 줄
  const { data: scoreRow, error: scoreErr } = await supabase
    .rpc('listening_review_score', { session_id: sid })
    .returns<Score>()
    .single();

  // 문항별
  const { data: rowsRaw, error } = await supabase
    .rpc('listening_review_rows', { session_id: sid })
    .returns<unknown>();

  // 오류/비어있음 대응 (모킹)
  if (error || scoreErr || !rowsRaw || !scoreRow) {
    const mock: Row[] = [
      { q_no: 1, question: 'Mock Q1', user_choice: 'A', correct_choice: 'B', is_correct: false },
      { q_no: 2, question: 'Mock Q2', user_choice: 'C', correct_choice: 'C', is_correct: true },
      { q_no: 3, question: 'Mock Q3', user_choice: 'B', correct_choice: 'D', is_correct: false },
    ];
    const score: Score = {
      total: mock.length,
      correct: mock.filter((m) => m.is_correct === true).length,
    };

    return (
      <div className="mx-auto space-y-6 pb-8 max-w-4xl">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Listening Review</h1>
          <p className="text-sm opacity-70">
            sessionId: {params.sessionId} · Score: {score.correct}/{score.total} (mock)
          </p>
        </header>
        <Table rows={mock} />
      </div>
    );
  }

  // ✅ rows 정규화: 항상 Row[]로 만들어서 Table에 전달
  const rows: Row[] = Array.isArray(rowsRaw)
    ? (rowsRaw as Row[])
    : (isRow(rowsRaw) ? [rowsRaw as Row] : []);

  const score: Score = scoreRow ?? { total: 0, correct: 0 };

  return (
    <div className="mx-auto space-y-6 pb-8 max-w-4xl">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Listening Review</h1>
        <p className="text-sm opacity-70">
          sessionId: {params.sessionId} · Score: {score.correct}/{score.total}
        </p>
      </header>
      <Table rows={rows} />
    </div>
  );
}

// 런타임 가드: 최소 필드(q_no) 기준으로 Row 형태인지 확인
function isRow(x: unknown): x is Row {
  return typeof x === 'object' && x !== null && 'q_no' in x;
}

function Table({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto rounded border">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
            <th>#</th>
            <th>Question</th>
            <th>Your Answer</th>
            <th>Correct</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody className="[&>tr>*]:align-top">
          {rows.map((r) => (
            <tr key={r.q_no} className="[&>td]:px-3 [&>td]:py-2 border-t">
              <td className="font-medium">{r.q_no}</td>
              <td>{r.question ?? '-'}</td>
              <td>{r.user_choice ?? <span className="opacity-60">—</span>}</td>
              <td>{r.correct_choice ?? <span className="opacity-60">—</span>}</td>
              <td>
                {r.is_correct === null ? (
                  <span className="opacity-60">—</span>
                ) : r.is_correct ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-red-600">✗</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
