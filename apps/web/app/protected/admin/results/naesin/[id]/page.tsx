import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

function fmt(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export default async function AdminNaesinResultDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const { data: session, error: sessionErr } = await supabase
    .from("naesin_reading_sessions")
    .select("id, student_id, mode, status, total_score, started_at, submitted_at, set_id")
    .eq("id", id)
    .single();

  if (sessionErr || !session) return notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, name, email")
    .eq("id", session.student_id)
    .single();

  const studentLabel =
    (profile as any)?.full_name ||
    (profile as any)?.name ||
    profile?.email ||
    `…${session.student_id.slice(-6)}`;

  const { data: setRow } = session.set_id
    ? await supabase
        .from("naesin_reading_sets")
        .select("title")
        .eq("id", session.set_id)
        .single()
    : { data: null };

  const setTitle = (setRow as any)?.title ?? session.set_id ?? "-";

  const { data: questions } = session.set_id
    ? await supabase
        .from("naesin_reading_questions")
        .select("id, order_index, number_label, type, stem, score")
        .eq("set_id", session.set_id)
        .order("order_index", { ascending: true })
    : { data: [] };

  const { data: answers } = await supabase
    .from("naesin_reading_answers")
    .select("question_id, is_correct, elapsed_sec, flagged, omitted, wrong_reason_tags")
    .eq("session_id", id);

  const answerMap = new Map<string, (typeof answers)[0]>();
  for (const a of answers ?? []) answerMap.set(a.question_id, a);

  const rows = (questions ?? []).map((q) => {
    const a = answerMap.get(q.id);
    return {
      number: (q as any).number_label ?? String((q as any).order_index + 1),
      type: (q as any).type ?? "-",
      stem: (q as any).stem ?? "-",
      isCorrect: a ? a.is_correct : null,
      omitted: a?.omitted ?? false,
      elapsedSec: a?.elapsed_sec != null ? `${a.elapsed_sec}s` : "-",
      wrongReasons: Array.isArray(a?.wrong_reason_tags) ? (a.wrong_reason_tags as string[]) : [],
      score: (q as any).score ?? null,
    };
  });

  const totalCount = rows.length;
  const correctCount = rows.filter((r) => r.isCorrect === true).length;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Admin / Results / 내신 / 상세
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{setTitle}</h1>
          <p className="text-sm text-slate-500">
            {studentLabel} · {session.mode ?? "-"}
          </p>
        </div>
        <Link
          href="/admin/results?tab=naesin"
          className="self-start rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← 목록
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">학생</p>
          <p className="mt-1 font-semibold text-slate-900">{studentLabel}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">총점</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {session.total_score != null ? session.total_score : "-"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">정답률</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {totalCount > 0
              ? `${correctCount}/${totalCount} (${Math.round((correctCount / totalCount) * 100)}%)`
              : "-"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">완료 시각</p>
          <p className="mt-1 font-semibold text-slate-900">{fmt(session.submitted_at)}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">문항별 결과</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr className="[&>th]:px-4 [&>th]:py-3">
                <th>#</th>
                <th>유형</th>
                <th className="min-w-[260px]">문제</th>
                <th>결과</th>
                <th>소요시간</th>
                <th>오답 태그</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    제출된 답안이 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={i} className="border-t border-slate-100 [&>td]:px-4 [&>td]:py-3">
                    <td className="font-semibold text-slate-700">{row.number}</td>
                    <td className="text-slate-500">{row.type}</td>
                    <td className="max-w-xs text-slate-700">{row.stem}</td>
                    <td>
                      {row.omitted ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500">
                          미응답
                        </span>
                      ) : row.isCorrect === true ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          정답
                        </span>
                      ) : row.isCorrect === false ? (
                        <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                          오답
                        </span>
                      ) : (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500">
                          -
                        </span>
                      )}
                    </td>
                    <td className="text-slate-500">{row.elapsedSec}</td>
                    <td className="text-slate-500">
                      {row.wrongReasons.length > 0 ? row.wrongReasons.join(", ") : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
