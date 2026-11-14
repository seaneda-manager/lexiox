// app/protected/writing-2026/review/[sessionId]/page.tsx
// Writing 리뷰 — 점수 + 선생님 피드백 + 상세 리뷰(답안 비교·경향 분석·모범답안 2종) + Drill 진입
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceSupabase } from "@/lib/supabase/service";
import { loadReviewSession } from "@/lib/writing/reviewSession";
import { calcWritingRawScore, calcWritingBandScore } from "@/lib/writing/rubric";
import ReviewClient from "./_client/ReviewClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ sessionId: string }> };

export default async function WritingReviewPage({ params }: Props) {
  const { sessionId } = await params;

  const loaded = await loadReviewSession(sessionId);
  if (loaded.ok === false) {
    if (loaded.status === 404) return notFound();
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center text-sm text-slate-600">{loaded.error}</main>
    );
  }
  const { input } = loaded.ctx;

  const { data: scores } = await getServiceSupabase()
    .from("writing_2026_sessions")
    .select("final_email_score, final_discussion_score, final_build_a_sentence_score, final_grade_feedback, grading_status")
    .eq("id", sessionId)
    .maybeSingle();
  const s = (scores ?? {}) as Record<string, any>;
  const graded = s.grading_status === "teacher_graded";

  const emailScore = s.final_email_score ?? 0;
  const discussionScore = s.final_discussion_score ?? 0;
  const buildScore = s.final_build_a_sentence_score ?? 0;
  const rawScore = calcWritingRawScore({ buildASentence: buildScore, email: emailScore, discussion: discussionScore });
  const bandScore = calcWritingBandScore(rawScore);

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Writing 2026 / Review</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Writing 리뷰</h1>
        <p className="text-sm text-slate-500">내 답안을 모범답안과 비교하고, 부족한 부분을 짚어 보세요.</p>
      </header>

      {graded ? (
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-50/50 p-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <Score label="Build a Sentence" value={buildScore} max={10} />
            <Score label="Email" value={emailScore} max={5} />
            <Score label="Discussion" value={discussionScore} max={5} />
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-blue-200 pt-4">
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
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          ⏳ 선생님 채점이 끝나면 점수가 이곳에 표시됩니다. 아래 리뷰는 지금 바로 볼 수 있습니다.
        </div>
      )}

      {graded && s.final_grade_feedback && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6">
          <p className="mb-3 text-sm font-bold text-amber-900">💬 선생님 피드백</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-amber-900">{s.final_grade_feedback}</p>
        </div>
      )}

      <ReviewClient
        sessionId={sessionId}
        emailText={input.emailText}
        discussionText={input.discussionText}
      />

      <div className="flex gap-3">
        <Link
          href="/writing-2026"
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Writing Hub 돌아가기
        </Link>
        <Link
          href={`/writing-2026/drill/${sessionId}`}
          className="flex-1 rounded-xl bg-teal-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-teal-700"
        >
          Drill 시작하기 →
        </Link>
      </div>
    </main>
  );
}

function Score({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      <div className="text-3xl font-bold text-blue-900">{value}</div>
      <p className="text-xs text-slate-500">/ {max}점</p>
    </div>
  );
}
