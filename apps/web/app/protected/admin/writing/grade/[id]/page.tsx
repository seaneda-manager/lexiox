import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import type { WWritingTest2026 } from "@/models/writing";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function WritingGradeDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const { data: session, error } = await supabase
    .from("writing_2026_sessions")
    .select(`
      id, test_id, user_id, raw_answers, grading_status, created_at,
      ai_email_score, ai_discussion_score, ai_total_score, ai_grade_feedback,
      final_email_score, final_discussion_score, final_total_score, final_grade_feedback,
      graded_at
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !session) return notFound();

  // 학생명 조회 (별도 쿼리)
  let studentName = "학생";
  if ((session as any).user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, name, email")
      .eq("id", (session as any).user_id)
      .maybeSingle();

    studentName = (profile as any)?.full_name || (profile as any)?.name || (profile as any)?.email || "학생";
  }

  const { data: testRow } = await supabase
    .from("writing_tests")
    .select("label, payload")
    .eq("id", session.test_id)
    .maybeSingle();

  const test = testRow?.payload as WWritingTest2026 | null;
  const answers = (session.raw_answers ?? {}) as Record<string, string>;

  const status = session.grading_status ?? "ungraded";
  const createdAt = new Date(session.created_at).toLocaleString("ko-KR");

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Admin / Writing / 채점
          </p>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {studentName} — {testRow?.label ?? session.test_id ?? "-"}
          </h1>
          <p className="text-sm text-slate-500">제출: {createdAt}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-slate-900">
            {session.final_total_score ?? session.ai_total_score ?? "-"}
          </div>
          <div className="text-xs text-slate-500">점수</div>
        </div>
      </header>

      {/* 상태 */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">채점 상태</span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            status === "teacher_graded"
              ? "bg-emerald-100 text-emerald-700"
              : status === "ai_graded"
              ? "bg-blue-100 text-blue-700"
              : "bg-amber-100 text-amber-700"
          }`}>
            {status === "ungraded" ? "미채점" : status === "ai_graded" ? "AI 초안" : "채점 완료"}
          </span>
        </div>
      </div>

      {/* 점수 상세 */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="text-sm font-medium text-slate-700">AI 초안 점수</div>
          <div className="mt-2 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Email: </span>
              <span className="font-semibold text-slate-900">{session.ai_email_score ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Discussion: </span>
              <span className="font-semibold text-slate-900">{session.ai_discussion_score ?? "-"}</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="text-slate-600">합계</span>
              <span className="font-bold text-slate-900">{session.ai_total_score ?? "-"}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          <div className="text-sm font-medium text-slate-700">최종 점수</div>
          <div className="mt-2 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Email: </span>
              <span className="font-semibold text-slate-900">{session.final_email_score ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Discussion: </span>
              <span className="font-semibold text-slate-900">{session.final_discussion_score ?? "-"}</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="text-slate-600">합계</span>
              <span className="font-bold text-emerald-700 text-lg">{session.final_total_score ?? "-"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 학생 답변 */}
      <div className="rounded-lg border border-slate-200 p-4">
        <h2 className="text-sm font-bold text-slate-900 mb-4">학생 답변</h2>
        <div className="space-y-4">
          {Object.entries(answers).map(([key, value]) => (
            <div key={key} className="border-t pt-3">
              <div className="text-xs font-semibold text-slate-600 mb-1">{key}</div>
              <div className="text-sm text-slate-700 whitespace-pre-wrap">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="flex gap-3">
        <Link
          href="/admin/writing/grade"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← 돌아가기
        </Link>
      </div>
    </main>
  );
}
