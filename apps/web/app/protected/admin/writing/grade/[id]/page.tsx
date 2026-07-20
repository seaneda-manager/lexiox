// app/(protected)/admin/writing/grade/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { EMAIL_DESCRIPTORS, DISCUSSION_DESCRIPTORS, type EtsWritingScore } from "@/lib/writing/rubric";
import WritingGradeClient from "./_client/WritingGradeClient";
import type { WWritingTest2026 } from "@/models/writing";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function WritingGradeDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const { data: session, error } = await supabase
    .from("writing_2026_sessions")
    .select(`
      id, test_id, raw_answers, grading_status, created_at,
      ai_email_score, ai_discussion_score, ai_total_score, ai_grade_feedback,
      final_email_score, final_discussion_score, final_total_score, final_grade_feedback,
      graded_at,
      profiles:user_id (full_name, name, email)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !session) return notFound();

  const { data: testRow } = await supabase
    .from("writing_tests")
    .select("label, payload")
    .eq("id", session.test_id)
    .maybeSingle();

  const test = testRow?.payload as WWritingTest2026 | null;
  const answers = (session.raw_answers ?? {}) as Record<string, string>;

  const profile = Array.isArray(session.profiles) ? session.profiles[0] : session.profiles;
  const studentName =
    (profile as { full_name?: string | null } | null)?.full_name ||
    (profile as { name?: string | null } | null)?.name ||
    (profile as { email?: string | null } | null)?.email ||
    "학생";

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
        <Link
          href="/admin/writing/grade"
          className="self-start rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← 목록
        </Link>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 왼쪽: 답변 내용 */}
        <div className="space-y-4">
          {test?.items.map((item) => {
            const isEmail = item.taskKind === "email";
            const isDiscussion = item.taskKind === "academic_discussion";
            if (!isEmail && !isDiscussion) return null;

            const answerText = answers[item.id] ?? "";
            const prompt = isEmail
              ? `상황: ${(item as { situation: string }).situation}\n지시: ${(item as { prompt: string }).prompt}`
              : `상황: ${(item as { context: string }).context}\n교수: ${(item as { professorPrompt: string }).professorPrompt}`;

            return (
              <div key={item.id} className="space-y-2">
                <section className="rounded-2xl border border-blue-200 bg-blue-50/60 px-4 py-3">
                  <p className="mb-1 text-xs font-bold text-blue-800">
                    {isEmail ? "Email Writing" : "Academic Discussion"} Prompt
                  </p>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-blue-900">{prompt}</p>
                </section>
                <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <p className="mb-2 text-xs font-bold text-slate-700">학생 답변</p>
                  {answerText ? (
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-800">{answerText}</p>
                  ) : (
                    <p className="text-xs text-slate-400">답변 없음</p>
                  )}
                </section>
              </div>
            );
          })}

          {/* Rubric 참고표 */}
          <section className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
            <p className="mb-3 text-xs font-bold text-slate-600">ETS Writing Rubric 참고 (0~5)</p>
            <div className="space-y-1.5">
              {([5, 4, 3, 2, 1, 0] as EtsWritingScore[]).map((score) => (
                <div key={score} className="text-[11px] leading-relaxed text-slate-700">
                  <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-700">
                    {score}
                  </span>
                  {EMAIL_DESCRIPTORS[score]}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 오른쪽: 채점 UI */}
        <div>
          <WritingGradeClient
            sessionId={session.id}
            gradingStatus={status}
            aiScores={{
              email: session.ai_email_score,
              discussion: session.ai_discussion_score,
              total: session.ai_total_score,
              feedback: session.ai_grade_feedback,
            }}
            finalScores={{
              email: session.final_email_score,
              discussion: session.final_discussion_score,
              total: session.final_total_score,
              feedback: session.final_grade_feedback,
            }}
          />
        </div>
      </div>
    </main>
  );
}
