// app/(protected)/_components/ReviewPage.tsx
import { getSupabaseServer } from "@/lib/supabaseServer";

type LegacyRow = {
  q_no?: number | null;
  question?: string | null;
  user_choice?: string | null;
  correct_choice?: string | null;
  is_correct?: boolean | null;
};

type ReadingRpcRow = {
  question_number?: number | null;
  stem?: string | null;
  user_choice_text?: string | null;
  correct_choice_text?: string | null;
  is_correct?: boolean | null;
};

type NormalizedRow = {
  q_no: number;
  question: string | null;
  user_choice: string | null;
  correct_choice: string | null;
  is_correct: boolean | null;
};

type LegacyScore = {
  total?: number | null;
  correct?: number | null;
};

type ReadingRpcScore = {
  total_count?: number | null;
  correct_count?: number | null;
};

function normalizeScore(raw: any): { total: number; correct: number } {
  const total =
    Number(raw?.total ?? raw?.total_count ?? 0) || 0;
  const correct =
    Number(raw?.correct ?? raw?.correct_count ?? 0) || 0;

  return { total, correct };
}

function normalizeRow(raw: LegacyRow & ReadingRpcRow, index: number): NormalizedRow {
  const qNo = Number(raw?.q_no ?? raw?.question_number ?? index + 1) || index + 1;

  return {
    q_no: qNo,
    question: raw?.question ?? raw?.stem ?? null,
    user_choice: raw?.user_choice ?? raw?.user_choice_text ?? null,
    correct_choice: raw?.correct_choice ?? raw?.correct_choice_text ?? null,
    is_correct:
      typeof raw?.is_correct === "boolean"
        ? raw.is_correct
        : raw?.is_correct == null
          ? null
          : Boolean(raw.is_correct),
  };
}

export default async function ReviewPage({
  title,
  scoreRpc,
  rowsRpc,
  sessionId,
}: {
  title: string;
  scoreRpc: string;
  rowsRpc: string;
  sessionId: string;
}) {
  const supabase = await getSupabaseServer();

  const [scoreRes, rowsRes] = await Promise.all([
    supabase.rpc(scoreRpc, { session_id: sessionId }),
    supabase.rpc(rowsRpc, { session_id: sessionId }),
  ]);

  const scoreErr = scoreRes.error;
  const rowsErr = rowsRes.error;

  const rawScoreRows = scoreRes.data as Array<LegacyScore & ReadingRpcScore> | null;
  const rawRows = rowsRes.data as Array<LegacyRow & ReadingRpcRow> | null;

  if (rowsErr || scoreErr || !rawRows || !rawScoreRows) {
    const mock: NormalizedRow[] = [
      {
        q_no: 1,
        question: "Mock Q1",
        user_choice: "A",
        correct_choice: "B",
        is_correct: false,
      },
      {
        q_no: 2,
        question: "Mock Q2",
        user_choice: "C",
        correct_choice: "C",
        is_correct: true,
      },
    ];

    const score = {
      total: mock.length,
      correct: mock.filter((m) => m.is_correct === true).length,
    };

    return (
      <div className="mx-auto max-w-5xl p-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm opacity-70">
            sessionId: {sessionId} · Score: {score.correct}/{score.total} (mock)
          </p>
          <p className="text-xs text-red-600">
            Review RPC fallback active.
            {scoreErr ? ` scoreErr: ${String(scoreErr.message || scoreErr)}` : ""}
            {rowsErr ? ` rowsErr: ${String(rowsErr.message || rowsErr)}` : ""}
          </p>
        </header>
        <Table rows={mock} />
      </div>
    );
  }

  const score = normalizeScore(rawScoreRows[0] ?? {});
  const rows = rawRows.map((r, i) => normalizeRow(r, i));

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm opacity-70">
          sessionId: {sessionId} · Score: {score.correct}/{score.total}
        </p>
      </header>
      <Table rows={rows} />
    </div>
  );
}

function Table({ rows }: { rows: NormalizedRow[] }) {
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
              <td>{r.question ?? <span className="opacity-60">-</span>}</td>
              <td>{r.user_choice ?? <span className="opacity-60">-</span>}</td>
              <td>{r.correct_choice ?? <span className="opacity-60">-</span>}</td>
              <td>
                {r.is_correct === null ? (
                  <span className="opacity-60">-</span>
                ) : r.is_correct ? (
                  <span className="text-green-600">Correct</span>
                ) : (
                  <span className="text-red-600">Wrong</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}