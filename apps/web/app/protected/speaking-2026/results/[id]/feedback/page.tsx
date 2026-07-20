// app/(protected)/speaking-2026/results/[id]/feedback/page.tsx
// 채점 완료 후 학생이 보는 피드백 페이지
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  DELIVERY_DESCRIPTORS,
  LANGUAGE_DESCRIPTORS,
  TOPIC_INDEPENDENT_DESCRIPTORS,
  TOPIC_INTEGRATED_DESCRIPTORS,
  type EtsRubricScore,
} from "@/lib/speaking/rubric";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function ScoreBar({ score, label }: { score: number; label: string }) {
  const pct = (score / 4) * 100;
  const color =
    score >= 3 ? "bg-emerald-500" : score >= 2 ? "bg-amber-400" : "bg-rose-400";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <span className="text-sm font-bold text-slate-900">{score} / 4</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function LevelBadge({ score }: { score: number }) {
  const levels = ["Below Basic", "Basic", "Developing", "Proficient", "Advanced"] as const;
  const level = levels[Math.round(score)] ?? "—";
  const colors = [
    "bg-rose-50 text-rose-700 border-rose-200",
    "bg-orange-50 text-orange-700 border-orange-200",
    "bg-amber-50 text-amber-700 border-amber-200",
    "bg-blue-50 text-blue-700 border-blue-200",
    "bg-emerald-50 text-emerald-700 border-emerald-200",
  ];
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${colors[Math.round(score)]}`}>
      {level}
    </span>
  );
}

export default async function SpeakingFeedbackPage({ params }: Props) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6">
        <p className="text-sm text-gray-500">로그인이 필요합니다.</p>
      </main>
    );
  }

  const { data: row, error } = await supabase
    .from("speaking_results_2026")
    .select(`
      id, test_id, task_id, mode, script, prompt, grading_status, created_at,
      final_delivery_score, final_language_score, final_topic_score, final_total_score, final_feedback,
      graded_at
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !row) return notFound();

  const status = row.grading_status ?? "ungraded";

  // 채점 미완료
  if (status !== "teacher_graded") {
    return (
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center">
          <p className="text-3xl">⏳</p>
          <p className="mt-3 text-lg font-bold text-amber-800">채점 진행 중</p>
          <p className="mt-1 text-sm text-amber-700">
            선생님이 채점을 완료하면 이 페이지에서 결과를 확인할 수 있습니다.
          </p>
          <Link
            href="/speaking-2026/results"
            className="mt-6 inline-block text-sm text-amber-800 underline"
          >
            ← 결과 목록으로
          </Link>
        </div>
      </main>
    );
  }

  const delivery = row.final_delivery_score ?? 0;
  const language = row.final_language_score ?? 0;
  const topic = row.final_topic_score ?? 0;
  const total = row.final_total_score ?? 0;

  const isIntegrated = row.task_id?.match(/task[2-4]$/i);
  const topicDescriptors = isIntegrated
    ? TOPIC_INTEGRATED_DESCRIPTORS
    : TOPIC_INDEPENDENT_DESCRIPTORS;

  const gradedAt = row.graded_at
    ? new Date(row.graded_at).toLocaleString("ko-KR", { month: "long", day: "numeric" })
    : "";

  const totalColor =
    total >= 24 ? "text-emerald-600" : total >= 17 ? "text-blue-600" : "text-amber-600";

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Speaking 2026 · 채점 결과
        </p>
        <h1 className="text-2xl font-bold text-slate-900">
          {row.test_id} / {row.task_id}
        </h1>
        {gradedAt && (
          <p className="text-sm text-slate-500">선생님 채점 완료: {gradedAt}</p>
        )}
      </header>

      {/* 총점 */}
      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-6 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Total Score
        </p>
        <p className={`mt-2 text-6xl font-black ${totalColor}`}>{total}</p>
        <p className="text-sm text-slate-400">/ 30점</p>
        <div className="mt-3 flex justify-center">
          <LevelBadge score={(delivery + language + topic) / 3} />
        </div>
      </section>

      {/* 항목별 점수 */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white px-5 py-5">
        <h2 className="text-sm font-bold text-slate-900">ETS Rubric 항목별 점수</h2>
        <ScoreBar score={delivery} label="Delivery (발음·유창성·속도)" />
        <ScoreBar score={language} label="Language Use (어휘·문법·구조)" />
        <ScoreBar score={topic} label={`Topic Development (${isIntegrated ? "통합형 내용" : "독립형 내용"})`} />
      </section>

      {/* 항목별 설명 */}
      <section className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-5">
        <h2 className="text-sm font-bold text-slate-700">레벨 설명</h2>
        <div className="space-y-2 text-xs leading-relaxed text-slate-700">
          <div>
            <span className="font-semibold">Delivery {delivery}/4 —</span>{" "}
            {DELIVERY_DESCRIPTORS[delivery as EtsRubricScore]}
          </div>
          <div>
            <span className="font-semibold">Language Use {language}/4 —</span>{" "}
            {LANGUAGE_DESCRIPTORS[language as EtsRubricScore]}
          </div>
          <div>
            <span className="font-semibold">Topic Development {topic}/4 —</span>{" "}
            {topicDescriptors[topic as EtsRubricScore]}
          </div>
        </div>
      </section>

      {/* 선생님 피드백 */}
      {row.final_feedback && (
        <section className="rounded-2xl border border-blue-200 bg-blue-50/60 px-5 py-5">
          <h2 className="mb-2 text-sm font-bold text-blue-800">선생님 피드백</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-blue-900">
            {row.final_feedback}
          </p>
        </section>
      )}

      {/* 내 답변 */}
      {row.script && (
        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5">
          <h2 className="mb-2 text-sm font-bold text-slate-700">내 답변</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
            {row.script}
          </p>
        </section>
      )}

      <footer className="pt-2">
        <Link href="/speaking-2026/results" className="text-xs text-emerald-700 hover:underline">
          ← 결과 목록으로 돌아가기
        </Link>
      </footer>
    </main>
  );
}
