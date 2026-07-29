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

  // 답안은 writing_2026_answers 테이블에 문항별로 저장되거나,
  // 세션의 raw_answers JSON에 task_*_submission 형식으로 저장된다.
  const answers: Record<string, string> = {};
  if (s.raw_answers && typeof s.raw_answers === "object") {
    const raw = s.raw_answers as any;
    // test payload의 item.id가 "task_2", "task_3"이므로 이에 맞춰 매핑
    if (raw.task_2_submission !== undefined) {
      answers["task_2"] = raw.task_2_submission ?? "";
    }
    if (raw.task_3_submission !== undefined) {
      answers["task_3"] = raw.task_3_submission ?? "";
    }
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
          {/* Build a Sentence (Choose Response) - 10개 문항 */}
          {test?.items
            .filter((item) => item.taskKind === "choose_response" || item.taskKind === "build_a_sentence")
            .map((item) => {
              const questions = (item as any).questions ?? [];
              const studentAnswers = (answers[item.id] ?? "") as any;
              const studentAnswerArray = Array.isArray(studentAnswers)
                ? studentAnswers
                : typeof studentAnswers === "string"
                  ? studentAnswers.split(",").map((a: string) => a.trim())
                  : [];

              return (
                <div key={`${item.id}-section`} className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">1. Choose a Response (Build a Sentence)</h3>
                  <p className="text-xs text-slate-600">10개 문항</p>

                  {questions.map((q: any, idx: number) => {
                    const studentChoice = studentAnswerArray[idx] || "No Answer";
                    const correctAnswer = q.correctAnswer || "N/A";
                    const isCorrect = studentChoice === correctAnswer;

                    return (
                      <div key={`q-${idx}`} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="mb-1 text-xs font-bold text-slate-700">문항 {idx + 1}</p>
                            <p className="text-xs leading-relaxed text-slate-800">{q.stem || "Question not available"}</p>
                          </div>
                          <div className={`rounded-full px-2 py-1 text-xs font-bold ${isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                            {isCorrect ? "✓" : "✗"}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <div className="rounded-lg bg-blue-50 p-2">
                            <p className="text-xs font-semibold text-blue-800">학생 선택</p>
                            <p className="mt-1 text-sm font-bold text-blue-900">{studentChoice}</p>
                          </div>
                          <div className="rounded-lg bg-green-50 p-2">
                            <p className="text-xs font-semibold text-green-800">정답</p>
                            <p className="mt-1 text-sm font-bold text-green-900">{correctAnswer}</p>
                          </div>
                        </div>

                        {q.explanation && (
                          <div className="mt-2 border-l-2 border-slate-300 bg-slate-50 p-2">
                            <p className="text-xs text-slate-700">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

          {/* Email Writing & Academic Discussion */}
          {test?.items.map((item) => {
            const isBuildASentence = item.taskKind === "choose_response" || item.taskKind === "build_a_sentence";
            const isEmail = item.taskKind === "email";
            const isDiscussion = item.taskKind === "academic_discussion";
            if (!isBuildASentence && !isEmail && !isDiscussion) return null;

            const answerText = answers[item.id] ?? "";
            let title = "";
            let prompt = "";

            if (isBuildASentence) {
              title = "1. Choose a Response (Build a Sentence)";
              prompt = (item as any).prompt || "Choose the correct response";
            } else if (isEmail) {
              title = "2. Write an Email";
              prompt = `상황: ${(item as { situation: string }).situation}\n지시: ${(item as { prompt: string }).prompt}`;
            } else if (isDiscussion) {
              title = "3. Academic Discussion";
              prompt = `상황: ${(item as { context: string }).context}\n교수: ${(item as { professorPrompt: string }).professorPrompt}`;
            }

            return (
              <div key={item.id} className="space-y-2">
                <section className="rounded-2xl border border-blue-200 bg-blue-50/60 px-4 py-3">
                  <p className="mb-1 text-xs font-bold text-blue-800">{title} Prompt</p>
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
            <p className="mb-3 text-xs font-bold text-slate-600">Updated TOEFL 2026 Writing Rubric (1~6)</p>
            <div className="space-y-1.5">
              {([6, 5, 4, 3, 2, 1] as EtsWritingScore[]).map((score) => (
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
            rawAnswers={s.raw_answers ?? {}}
            aiScores={{
              buildASentence: s.ai_build_a_sentence_score ?? null,
              email: s.ai_email_score ?? null,
              discussion: s.ai_discussion_score ?? null,
              feedback: s.ai_grade_feedback ?? null,
            }}
            finalScores={{
              buildASentence: s.final_build_a_sentence_score ?? null,
              email: s.final_email_score ?? null,
              discussion: s.final_discussion_score ?? null,
              feedback: s.final_grade_feedback ?? null,
            }}
          />
        </div>
      </div>
    </main>
  );
}
