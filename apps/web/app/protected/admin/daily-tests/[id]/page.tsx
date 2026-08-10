import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { fetchAndFormatDailyTaskProblems } from "@/lib/utils/dailyTaskFormat";
import ReadingReviewV2 from "@/components/reading/ReadingReviewV2";
import {
  TASK_TYPE_LABEL,
  buildFlatQuestions,
  buildCwItems,
} from "@/app/protected/student/daily-tests/[id]/review/page";
import { ArrowLeft, FileQuestion } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  assigned: "📋 할당됨",
  in_progress: "⏳ 진행 중",
  completed: "✅ 완료",
  overdue: "⏰ 만료",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminDailyTaskDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  // admin/teacher는 학생 소유권 제약 없이 조회한다 — 접근 자체는 /admin 레이아웃이 이미 막는다.
  const { data: task, error: taskError } = await supabase
    .from("daily_tests")
    .select("*")
    .eq("id", id)
    .single();

  if (taskError || !task) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, name, email")
    .eq("id", task.student_id)
    .maybeSingle();
  const studentLabel =
    (profile as any)?.full_name || (profile as any)?.name || (profile as any)?.email || `…${String(task.student_id ?? "").slice(-6)}`;

  if (task.status !== "completed") {
    return (
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <Link
          href="/admin/daily-tests"
          className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-blue-400 hover:text-blue-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Daily Tests 목록으로
        </Link>
        <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-900">
            {studentLabel} — {STATUS_LABEL[task.status] ?? task.status}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            아직 완료되지 않아 결과를 볼 수 없습니다.
          </p>
        </div>
      </main>
    );
  }

  const { complete_words, daily_life, academic_passage } = await fetchAndFormatDailyTaskProblems(
    supabase,
    task
  );

  const flatQuestions = buildFlatQuestions([...daily_life, ...academic_passage]);
  const cwItems = buildCwItems(complete_words);
  const answerMap: Record<string, string | null> = task.answers ?? {};

  const mcCorrect = flatQuestions.filter((q) => {
    const chosen = answerMap[q.id];
    return chosen != null && q.choices.find((c) => c.id === chosen)?.isCorrect;
  }).length;

  const cwTotal = cwItems.reduce((s, it) => s + it.blanks.length, 0);
  const cwCorrect = cwItems.reduce(
    (s, it) =>
      s +
      it.blanks.filter((b) => {
        const typed = (answerMap[`cw__${it.id}__${b.id}`] ?? "").trim().toLowerCase();
        return typed.length > 0 && typed === b.correctToken.toLowerCase();
      }).length,
    0
  );

  const totalCount = flatQuestions.length + cwTotal;
  const correctCount = mcCorrect + cwCorrect;
  const percent = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-3">
        <Link
          href="/admin/daily-tests"
          className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-blue-400 hover:text-blue-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Daily Tests 목록으로
        </Link>

        <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
          <div className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
            <FileQuestion className="h-3 w-3" />
            Daily Task · 결과
          </div>
          <h1 className="mt-1 text-lg font-bold text-gray-900">
            {studentLabel} — {TASK_TYPE_LABEL[task.task_type] ?? task.task_type}
          </h1>
          <p className="mt-0.5 text-[11px] text-gray-500">
            {task.completed_at ? new Date(task.completed_at).toLocaleString("ko-KR") : "-"}
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs">
            <span className="font-semibold text-blue-700 text-base">{correctCount}</span>
            <span className="text-gray-500">/ {totalCount} 정답</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                percent >= 70 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
              }`}
            >
              {percent}%
            </span>
          </div>
        </div>
      </header>

      <ReadingReviewV2
        resultId={id}
        flatQuestions={flatQuestions}
        answerMap={answerMap}
        cwItems={cwItems}
        drillBasePath="/student/daily-tests/drill"
      />
    </main>
  );
}
