// app/(protected)/admin/writing/grade/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { EMAIL_DESCRIPTORS, type EtsWritingScore } from "@/lib/writing/rubric";
import WritingGradeClient from "./_client/WritingGradeClient";
import type { WWritingTest2026 } from "@/models/writing";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function WritingGradeDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  // select("*")로 조회한다. 컬럼을 나열하면 프로덕션 스키마에 하나라도 없을 때
  // 쿼리 전체가 실패해 원인이 안 보이는 404가 된다 (raw_answers가 실제로 그랬다).
  const { data: session, error } = await supabase
    .from("writing_2026_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-8">
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          세션 조회 오류: {error.message}
        </p>
        <Link href="/admin/writing/grade" className="mt-4 inline-block text-sm text-blue-600 underline">
          ← 목록으로
        </Link>
      </main>
    );
  }
  if (!session) return notFound();

  const s = session as Record<string, any>;

  // 답안은 writing_2026_answers 테이블에 문항별로 저장된다 (submit API 참고).
  // 과거 스키마의 세션 raw_answers가 있으면 폴백으로 합친다.
  const answers: Record<string, string> = {};
  if (s.raw_answers && typeof s.raw_answers === "object") {
    Object.assign(answers, s.raw_answers);
  }
  const { data: answerRows, error: answersError } = await supabase
    .from("writing_2026_answers")
    .select("item_key, content")
    .eq("session_id", id);
  for (const row of answerRows ?? []) {
    if (row.item_key) answers[row.item_key] = row.content ?? "";
  }

  // 학생명 조회 (FK 조인은 스키마 캐시에 관계가 없어 실패하므로 별도 쿼리)
  let studentName = "학생";
  if (s.user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, name, email")
      .eq("id", s.user_id)
      .maybeSingle();
    studentName =
      (profile as any)?.full_name || (profile as any)?.name || (profile as any)?.email || "학생";
  }

  const { data: testRow } = await supabase
    .from("writing_tests")
    .select("label, payload")
    .eq("id", s.test_id)
    .maybeSingle();

  const test = testRow?.payload as WWritingTest2026 | null;
  const status = s.grading_status ?? "ungraded";
  const createdAt = new Date(s.created_at).toLocaleString("ko-KR");

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Admin / Writing / 채점
          </p>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {studentName} — {testRow?.label ?? s.test_id ?? "-"}
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

      {answersError && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          답안 조회 오류: {answersError.message}
        </p>
      )}

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

          {/* 테스트 payload가 없어도 저장된 답안은 그대로 보여준다 */}
          {!test && Object.keys(answers).length > 0 && (
            <div className="space-y-2">
              {Object.entries(answers).map(([key, value]) => (
                <section key={key} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <p className="mb-2 text-xs font-bold text-slate-700">{key}</p>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-800">{value}</p>
                </section>
              ))}
            </div>
          )}

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
            sessionId={s.id}
            gradingStatus={status}
            aiScores={{
              email: s.ai_email_score ?? null,
              discussion: s.ai_discussion_score ?? null,
              total: s.ai_total_score ?? null,
              feedback: s.ai_grade_feedback ?? null,
            }}
            finalScores={{
              email: s.final_email_score ?? null,
              discussion: s.final_discussion_score ?? null,
              total: s.final_total_score ?? null,
              feedback: s.final_grade_feedback ?? null,
            }}
          />
        </div>
      </div>
    </main>
  );
}
