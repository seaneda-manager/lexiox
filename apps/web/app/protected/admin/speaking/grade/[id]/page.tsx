// app/(protected)/admin/speaking/grade/[id]/page.tsx
// 스피킹 개별 채점 페이지
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  DELIVERY_DESCRIPTORS,
  LANGUAGE_DESCRIPTORS,
  TOPIC_INDEPENDENT_DESCRIPTORS,
  type EtsRubricScore,
} from "@/lib/speaking/rubric";
import GradeClient from "./_client/GradeClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function SpeakingGradeDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const { data: row, error } = await supabase
    .from("speaking_results_2026")
    .select(`
      id, test_id, task_id, mode, script, prompt, audio_url,
      grading_status, created_at,
      ai_delivery_score, ai_language_score, ai_topic_score, ai_total_score, ai_feedback,
      final_delivery_score, final_language_score, final_topic_score, final_total_score, final_feedback,
      graded_at,
      profiles:user_id (full_name, name, email)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !row) return notFound();

  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const studentName =
    (profile as { full_name?: string | null } | null)?.full_name ||
    (profile as { name?: string | null } | null)?.name ||
    (profile as { email?: string | null } | null)?.email ||
    "학생";

  const createdAt = new Date(row.created_at).toLocaleString("ko-KR");
  const status = row.grading_status ?? "ungraded";

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Admin / Speaking / 채점
          </p>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {studentName} — {row.test_id} / {row.task_id}
          </h1>
          <p className="text-sm text-slate-500">제출: {createdAt} · 모드: {row.mode ?? "-"}</p>
        </div>
        <Link
          href="/admin/speaking/grade"
          className="self-start rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← 목록
        </Link>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 왼쪽: 프롬프트 + 스크립트 + 오디오 */}
        <div className="space-y-4">
          {row.prompt && (
            <section className="rounded-2xl border border-blue-200 bg-blue-50/60 px-4 py-4">
              <p className="mb-1.5 text-xs font-bold text-blue-800">Task Prompt</p>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-blue-900">{row.prompt}</p>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <p className="mb-2 text-xs font-bold text-slate-700">학생 스크립트</p>
            {row.script ? (
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-800">{row.script}</p>
            ) : (
              <p className="text-xs text-slate-400">스크립트 없음</p>
            )}
          </section>

          {row.audio_url && (
            <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p className="mb-2 text-xs font-bold text-slate-700">음성 녹음</p>
              <audio controls className="w-full" src={row.audio_url} />
            </section>
          )}

          {/* ETS Rubric 참고표 */}
          <section className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
            <p className="mb-3 text-xs font-bold text-slate-600">ETS Rubric 참고</p>
            <div className="space-y-3">
              {([0, 1, 2, 3, 4] as EtsRubricScore[]).map((score) => (
                <div key={score} className="text-[11px] leading-relaxed text-slate-700">
                  <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-700">
                    {score}
                  </span>
                  {DELIVERY_DESCRIPTORS[score]}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 오른쪽: 채점 UI */}
        <div>
          <GradeClient
            resultId={row.id}
            gradingStatus={status}
            aiScores={{
              delivery: row.ai_delivery_score,
              language: row.ai_language_score,
              topic: row.ai_topic_score,
              total: row.ai_total_score,
              feedback: row.ai_feedback,
            }}
            finalScores={{
              delivery: row.final_delivery_score,
              language: row.final_language_score,
              topic: row.final_topic_score,
              total: row.final_total_score,
              feedback: row.final_feedback,
            }}
          />
        </div>
      </div>
    </main>
  );
}
