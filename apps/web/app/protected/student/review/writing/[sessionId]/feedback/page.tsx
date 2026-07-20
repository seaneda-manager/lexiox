// app/(protected)/student/review/writing/[sessionId]/feedback/page.tsx
// 선생님 채점 완료 후 학생이 보는 Writing 피드백 페이지
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  EMAIL_DESCRIPTORS,
  DISCUSSION_DESCRIPTORS,
  type EtsWritingScore,
} from "@/lib/writing/rubric";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ sessionId: string }> };

function ScoreBar({ score, max, label }: { score: number; max: number; label: string }) {
  const pct = (score / max) * 100;
  const color =
    pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <span className="text-sm font-bold text-slate-900">{score} / {max}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function WritingFeedbackPage({ params }: Props) {
  const { sessionId } = await params;
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return notFound();

  const { data: session, error } = await supabase
    .from("writing_2026_sessions")
    .select(`
      id, test_id, grading_status, created_at,
      final_email_score, final_discussion_score, final_total_score, final_grade_feedback,
      graded_at
    `)
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !session) return notFound();

  const status = session.grading_status ?? "ungraded";

  if (status !== "teacher_graded") {
    return (
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center">
          <p className="text-3xl">⏳</p>
          <p className="mt-3 text-lg font-bold text-amber-800">채점 진행 중</p>
          <p className="mt-1 text-sm text-amber-700">
            선생님이 채점을 완료하면 이 페이지에서 결과를 확인할 수 있습니다.
          </p>
          <Link href="/student/review" className="mt-6 inline-block text-sm text-amber-800 underline">
            ← 리뷰 목록으로
          </Link>
        </div>
      </main>
    );
  }

  const emailScore = session.final_email_score ?? 0;
  const discussionScore = session.final_discussion_score ?? 0;
  const total = session.final_total_score ?? 0;

  const gradedAt = session.graded_at
    ? new Date(session.graded_at).toLocaleString("ko-KR", { month: "long", day: "numeric" })
    : "";

  const totalColor =
    total >= 24 ? "text-teal-600" : total >= 17 ? "text-blue-600" : "text-amber-600";

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Writing · 채점 결과
        </p>
        <h1 className="text-2xl font-bold text-slate-900">Writing 피드백</h1>
        {gradedAt && <p className="text-sm text-slate-500">선생님 채점 완료: {gradedAt}</p>}
      </header>

      {/* 총점 */}
      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-6 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Total Score</p>
        <p className={`mt-2 text-6xl font-black ${totalColor}`}>{total}</p>
        <p className="text-sm text-slate-400">/ 30점</p>
      </section>

      {/* 항목별 점수 */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white px-5 py-5">
        <h2 className="text-sm font-bold text-slate-900">ETS Rubric 항목별 점수</h2>
        <ScoreBar score={emailScore} max={5} label="Email Writing (이메일 / Integrated)" />
        <ScoreBar score={discussionScore} max={5} label="Academic Discussion (학문적 토론)" />
      </section>

      {/* 항목별 레벨 설명 */}
      <section className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-5">
        <h2 className="text-sm font-bold text-slate-700">레벨 설명</h2>
        <div className="space-y-2 text-xs leading-relaxed text-slate-700">
          <div>
            <span className="font-semibold">Email Writing {emailScore}/5 —</span>{" "}
            {EMAIL_DESCRIPTORS[emailScore as EtsWritingScore]}
          </div>
          <div>
            <span className="font-semibold">Academic Discussion {discussionScore}/5 —</span>{" "}
            {DISCUSSION_DESCRIPTORS[discussionScore as EtsWritingScore]}
          </div>
        </div>
      </section>

      {/* 선생님 피드백 */}
      {session.final_grade_feedback && (
        <section className="rounded-2xl border border-teal-200 bg-teal-50/60 px-5 py-5">
          <h2 className="mb-2 text-sm font-bold text-teal-800">선생님 피드백</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-teal-900">
            {session.final_grade_feedback}
          </p>
        </section>
      )}

      <footer className="flex items-center justify-between pt-2">
        <Link href="/student/review" className="text-xs text-teal-700 hover:underline">
          ← 리뷰 목록으로
        </Link>
        <Link
          href={`/student/review/writing/${sessionId}`}
          className="text-xs text-slate-500 hover:underline"
        >
          내 답변 보기 →
        </Link>
      </footer>
    </main>
  );
}
