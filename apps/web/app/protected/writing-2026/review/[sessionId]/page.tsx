// app/protected/writing-2026/review/[sessionId]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { calcWritingRawScore, calcWritingBandScore } from "@/lib/writing/rubric";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ sessionId: string }> };

export default async function WritingReviewPage({ params }: Props) {
  const { sessionId } = await params;
  const supabase = await getServerSupabase();

  const { data: session, error } = await supabase
    .from("writing_2026_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !session) return notFound();

  const s = session as Record<string, any>;
  const rawAnswers = s.raw_answers ?? {};

  // 점수 계산
  const emailScore = s.final_email_score ?? 0;
  const discussionScore = s.final_discussion_score ?? 0;
  const buildASentenceScore = s.final_build_a_sentence_score ?? 0;

  const rawScore = calcWritingRawScore({
    buildASentence: buildASentenceScore,
    email: emailScore,
    discussion: discussionScore,
  });
  const bandScore = calcWritingBandScore(rawScore);

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
      {/* 헤더 */}
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Writing 2026 / Review
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          채점 결과
        </h1>
        <p className="text-sm text-slate-500">
          제출하신 Writing 답변에 대한 채점 결과를 확인하세요.
        </p>
      </header>

      {/* 점수 카드 */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-50/50 p-6">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">Build a Sentence</p>
            <div className="text-3xl font-bold text-blue-900">{buildASentenceScore}</div>
            <p className="text-xs text-slate-500">/ 10점</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">Email</p>
            <div className="text-3xl font-bold text-blue-900">{emailScore}</div>
            <p className="text-xs text-slate-500">/ 5점</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">Discussion</p>
            <div className="text-3xl font-bold text-blue-900">{discussionScore}</div>
            <p className="text-xs text-slate-500">/ 5점</p>
          </div>
        </div>

        <div className="mt-6 border-t border-blue-200 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">최종 밴드 스코어</p>
              <div className="mt-1 text-4xl font-bold text-blue-900">{bandScore.toFixed(1)}</div>
              <p className="text-xs text-slate-500">/ 6.0</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-600">원점수 (Raw)</p>
              <div className="mt-1 text-2xl font-bold text-slate-700">{rawScore.toFixed(2)}</div>
              <p className="text-xs text-slate-500">/ 30점</p>
            </div>
          </div>
        </div>
      </div>

      {/* 피드백 */}
      {s.final_grade_feedback && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6">
          <p className="text-sm font-bold text-amber-900 mb-3">💬 피드백</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-amber-900">
            {s.final_grade_feedback}
          </p>
        </div>
      )}

      {/* 답변 검토 */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-slate-900">답변 검토</h2>

        {/* Email */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-3">2. Email</h3>
          {rawAnswers.task_2_submission ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-600 mb-2">당신의 답변</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                  {rawAnswers.task_2_submission}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-xs font-semibold text-blue-600 mb-2">✓ 모범답안 (4/5점)</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-blue-900">
                  {`Dear Administrator,

I am writing to inquire about the online English course that your institution offers. I am very interested in enrolling in this program for next semester. Could you please provide me with information regarding the course schedule, tuition fees, and any required textbooks or materials? Additionally, I would like to know about the registration deadline and whether there are any prerequisites I should fulfill before applying.

Thank you for your time and assistance. I look forward to hearing from you soon.

Best regards,
A Student`}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">제출하지 않음</p>
          )}
        </div>

        {/* Discussion */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-3">3. Discussion</h3>
          {rawAnswers.task_3_submission ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-600 mb-2">당신의 답변</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                  {rawAnswers.task_3_submission}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-xs font-semibold text-blue-600 mb-2">✓ 모범답안 (4/5점)</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-blue-900">
                  {`I agree that online classes have more disadvantages than advantages. While online education provides convenience and flexibility, it lacks essential elements that make learning effective. First, students find it difficult to maintain focus without direct supervision and face-to-face interaction with instructors. Second, technical problems such as internet connectivity issues can frequently disrupt lessons and cause frustration. Additionally, the absence of immediate feedback and personal guidance makes it harder for students to improve their skills. In contrast, in-person classes offer better opportunities for real-time discussion, collaborative learning, and receiving prompt assistance from teachers. Therefore, I believe that the benefits of traditional classroom learning outweigh those of online education.`}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">제출하지 않음</p>
          )}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        <Link
          href="/writing-2026"
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Writing Hub 돌아가기
        </Link>
        <Link
          href="/writing-2026/drill"
          className="flex-1 rounded-xl bg-teal-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-teal-700"
        >
          Drill 시작하기 →
        </Link>
      </div>
    </main>
  );
}
