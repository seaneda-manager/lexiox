// apps/web/app/(protected)/admin/results/[id]/page.tsx
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

export default async function AdminResultDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  // 세션 + 지문 정보
  const { data: session, error: sessionErr } = await supabase
    .from("reading_sessions")
    .select(
      "id, user_id, mode, band_score, legacy_score, started_at, finished_at, reading_passages(id, title)"
    )
    .eq("id", id)
    .single();

  if (sessionErr || !session) return notFound();

  // 학생 이름
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, name, email")
    .eq("id", session.user_id)
    .single();

  const studentLabel =
    (profile as { full_name?: string | null } | null)?.full_name ||
    (profile as { name?: string | null } | null)?.name ||
    profile?.email ||
    `…${session.user_id.slice(-6)}`;

  // 제출 답안 (최종)
  const { data: answers } = await supabase
    .from("reading_answers")
    .select(
      "question_id, choice_id, elapsed_ms, reading_questions(number, stem, type), reading_choices(id, text, is_correct, label, ord)"
    )
    .eq("session_id", id);

  // 해당 지문의 모든 선지 (정답 확인용)
  const passage = Array.isArray(session.reading_passages)
    ? session.reading_passages[0]
    : session.reading_passages;
  const passageId = (passage as { id?: string } | null)?.id;

  const { data: allChoices } = passageId
    ? await supabase
        .from("reading_choices")
        .select("id, question_id, is_correct, label, ord")
        .in(
          "question_id",
          (answers ?? []).map((a) => a.question_id).filter(Boolean)
        )
    : { data: [] };

  // question_id → correct choice id map
  const correctChoiceMap = new Map<string, string>();
  for (const c of allChoices ?? []) {
    if (c.is_correct) correctChoiceMap.set(c.question_id, c.id);
  }

  type AnswerRow = {
    questionNumber: number;
    stem: string;
    type: string;
    choiceLabel: string;
    choiceText: string;
    isCorrect: boolean | null;
    elapsedSec: string;
  };

  const answerRows: AnswerRow[] = (answers ?? [])
    .map((a) => {
      const q = Array.isArray(a.reading_questions)
        ? a.reading_questions[0]
        : a.reading_questions;
      const c = Array.isArray(a.reading_choices)
        ? a.reading_choices[0]
        : a.reading_choices;
      const correctId = correctChoiceMap.get(a.question_id);

      return {
        questionNumber: (q as { number?: number } | null)?.number ?? 0,
        stem: (q as { stem?: string } | null)?.stem ?? "-",
        type: (q as { type?: string } | null)?.type ?? "-",
        choiceLabel:
          (c as { label?: string | null } | null)?.label ?? "-",
        choiceText: (c as { text?: string } | null)?.text ?? "-",
        isCorrect: a.choice_id != null ? a.choice_id === correctId : null,
        elapsedSec:
          a.elapsed_ms != null ? `${Math.round(a.elapsed_ms / 1000)}s` : "-",
      };
    })
    .sort((a, b) => a.questionNumber - b.questionNumber);

  const totalCount = answerRows.length;
  const correctCount = answerRows.filter((r) => r.isCorrect === true).length;
  const score = session.band_score ?? session.legacy_score;
  const passageTitle = (passage as { title?: string } | null)?.title ?? "-";

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Admin / Results / 상세
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {passageTitle}
          </h1>
          <p className="text-sm text-slate-500">
            {studentLabel} · {session.mode}
          </p>
        </div>
        <Link
          href="/admin/results"
          className="self-start rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← 목록
        </Link>
      </header>

      {/* 요약 */}
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">학생</p>
          <p className="mt-1 font-semibold text-slate-900">{studentLabel}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">점수</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {score != null ? score : "-"}
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
          <p className="mt-1 font-semibold text-slate-900">
            {fmt(session.finished_at)}
          </p>
        </div>
      </section>

      {/* 문항별 결과 */}
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
                <th className="min-w-[240px]">문제</th>
                <th>학생 답</th>
                <th>결과</th>
                <th>소요시간</th>
              </tr>
            </thead>
            <tbody>
              {answerRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    제출된 답안이 없습니다.
                  </td>
                </tr>
              ) : (
                answerRows.map((row) => (
                  <tr
                    key={row.questionNumber}
                    className="border-t border-slate-100 [&>td]:px-4 [&>td]:py-3"
                  >
                    <td className="font-semibold text-slate-700">
                      {row.questionNumber}
                    </td>
                    <td className="text-slate-500">{row.type}</td>
                    <td className="max-w-xs text-slate-700">{row.stem}</td>
                    <td className="text-slate-700">
                      {row.choiceLabel !== "-"
                        ? `${row.choiceLabel}. ${row.choiceText}`
                        : row.choiceText}
                    </td>
                    <td>
                      {row.isCorrect === true ? (
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
