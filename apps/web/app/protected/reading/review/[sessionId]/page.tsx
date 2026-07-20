// apps/web/app/(protected)/reading/review/[sessionId]/page.tsx
import { getSupabaseServer } from "@/lib/supabaseServer";

type RawRow = {
  question_id?: string | null;

  // legacy
  q_no?: number | null;
  question?: string | null;
  user_choice?: string | null;
  correct_choice?: string | null;

  // reading_review_rows RPC
  question_number?: number | null;
  stem?: string | null;
  user_choice_text?: string | null;
  correct_choice_text?: string | null;

  is_correct?: boolean | null;
};

type NormalizedRow = {
  question_id?: string | null;
  q_no: number;
  question: string | null;
  user_choice: string | null;
  correct_choice: string | null;
  is_correct: boolean | null;
};

type RawScore = {
  // legacy
  total?: number | null;
  correct?: number | null;

  // reading_review_score RPC
  total_count?: number | null;
  correct_count?: number | null;
};

type PageProps = {
  params: Promise<{ sessionId: string }>;
  searchParams?: Promise<{ view?: "table" | "runner"; profileId?: string }>;
};

export const dynamic = "force-dynamic";

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function normalizeScore(raw: RawScore | null | undefined, fallbackRows: NormalizedRow[]) {
  const total = Number(raw?.total ?? raw?.total_count ?? fallbackRows.length) || 0;
  const correct =
    Number(
      raw?.correct ??
        raw?.correct_count ??
        fallbackRows.filter((r) => r.is_correct === true).length,
    ) || 0;

  return { total, correct };
}

function normalizeRow(raw: RawRow, index: number): NormalizedRow {
  return {
    question_id: raw.question_id ?? null,
    q_no: Number(raw.q_no ?? raw.question_number ?? index + 1) || index + 1,
    question: raw.question ?? raw.stem ?? null,
    user_choice: raw.user_choice ?? raw.user_choice_text ?? null,
    correct_choice: raw.correct_choice ?? raw.correct_choice_text ?? null,
    is_correct:
      typeof raw.is_correct === "boolean"
        ? raw.is_correct
        : raw.is_correct == null
          ? null
          : Boolean(raw.is_correct),
  };
}

export default async function ReadingReviewPage({ params, searchParams }: PageProps) {
  const supabase = await getSupabaseServer();

  const p = await params;
  const sp = searchParams ? await searchParams : undefined;

  const raw = p.sessionId ?? "";
  const sid = safeDecode(raw);

  if (!sid || sid === "<sessionId>" || sid.includes("<") || sid.includes(">")) {
    return (
      <div className="mx-auto max-w-5xl p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Reading Review</h1>
        <div className="rounded-xl border bg-white p-4 text-sm">
          <div className="font-semibold text-red-700">Invalid sessionId</div>
          <div className="mt-2 text-neutral-700">
            지금 URL에 <code className="rounded bg-neutral-100 px-1">&lt;sessionId&gt;</code> 같은
            플레이스홀더가 들어가 있어요.
          </div>
          <div className="mt-3 text-neutral-600">
            <b>/reading</b>에서 실제 세트를 선택해서 테스트를 끝까지 진행하면 진짜 sessionId로 자동 이동합니다.
          </div>
        </div>
      </div>
    );
  }

  const view = sp?.view ?? "table";

  const [scoreRes, rowsRes] = await Promise.all([
    supabase.rpc("reading_review_score", { session_id: sid }),
    supabase.rpc("reading_review_rows", { session_id: sid }),
  ]);

  const scoreErr = scoreRes.error;
  const rowsErr = rowsRes.error;

  const rawScoreRows = scoreRes.data as RawScore[] | null;
  const rawRows = rowsRes.data as RawRow[] | null;

  if (scoreErr || rowsErr || !rawRows || !rawScoreRows) {
    return (
      <div className="mx-auto max-w-5xl p-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Reading Review</h1>
          <p className="text-sm opacity-70">sessionId: {sid} · Score: 0/0</p>
        </header>

        <div className="space-y-2 rounded-xl border bg-white p-4 text-sm">
          <div className="font-semibold text-red-700">Review data not found</div>
          <div className="text-neutral-700">
            이 sessionId로 DB에서 리뷰 데이터를 찾지 못했습니다.
          </div>

          <div className="text-neutral-600">
            가장 흔한 원인:
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>테스트를 실제 setId로 시작하지 않음 (demo-set 등)</li>
              <li>start/submit/finish가 DB에 저장되지 않음 (RLS/액션 실패)</li>
              <li>sessionId를 수동으로 입력함</li>
            </ul>
          </div>

          <div className="pt-2 text-neutral-600">
            에러:
            <div className="mt-1 rounded bg-neutral-50 p-2 font-mono text-xs">
              {String(scoreErr?.message ?? "") || "(score ok)"}
              {"\n"}
              {String(rowsErr?.message ?? "") || "(rows ok)"}
            </div>
          </div>

          <div className="pt-2">
            <a className="text-emerald-800 underline" href="/reading">
              /reading 으로 가서 실제 세트 선택하기 →
            </a>
          </div>
        </div>
      </div>
    );
  }

  const rows = rawRows.map((r, i) => normalizeRow(r, i));
  const score = normalizeScore(rawScoreRows[0], rows);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="space-y-1">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Reading Review</h1>
            <p className="text-sm opacity-70">
              sessionId: {sid} · Score: {score.correct}/{score.total}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
              href={`/reading/review/${encodeURIComponent(sid)}?view=table`}
            >
              Table
            </a>
            <a
              className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
              href={`/reading/review/${encodeURIComponent(sid)}?view=runner`}
            >
              Full Review (later)
            </a>
          </div>
        </div>
      </header>

      {view === "table" ? <Table rows={rows} /> : <Table rows={rows} />}
    </div>
  );
}

function Table({ rows }: { rows: NormalizedRow[] }) {
  return (
    <div className="overflow-x-auto rounded border bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr className="text-left [&>th]:px-3 [&>th]:py-2">
            <th>#</th>
            <th>Question</th>
            <th>Your Answer</th>
            <th>Correct</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody className="[&>tr>*]:align-top">
          {rows.map((r, idx) => (
            <tr
              key={`${r.question_id ?? "no-qid"}-${r.q_no ?? "no-qno"}-${idx}`}
              className="border-t [&>td]:px-3 [&>td]:py-2"
            >
              <td className="font-medium">{r.q_no}</td>
              <td>{r.question ?? <span className="opacity-60">—</span>}</td>
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