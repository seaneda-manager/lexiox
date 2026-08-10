import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { fetchAndFormatDailyTaskProblems, normalizeBlankMarkers } from "@/lib/utils/dailyTaskFormat";
import ReadingReviewV2, { type FlatQuestion, type CwReviewItem } from "@/components/reading/ReadingReviewV2";
import { ArrowLeft, FileQuestion } from "lucide-react";

export const dynamic = "force-dynamic";

export const TASK_TYPE_LABEL: Record<string, string> = {
  light: "기초 (4문제)",
  medium_1: "중급 유형1",
  medium_2: "중급 유형2",
  medium_3: "중급 유형3",
  medium_4: "중급 유형4",
};

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildFlatQuestions(items: any[]): FlatQuestion[] {
  const result: FlatQuestion[] = [];
  items.forEach((item: any) => {
    const passageHtml =
      item.passageHtml ?? `<p>${escapeHtml(item.passage ?? "").replace(/\n/g, "<br/>")}</p>`;
    const passageText: string = item.passage ?? "";

    (item.questions ?? []).forEach((q: any, idx: number) => {
      const choices = (q.choices ?? []).map((c: any) => ({
        id: c.id,
        text: c.text,
        isCorrect: c.is_correct === true || c.isCorrect === true,
        explain: c.explain ?? null,
      }));

      result.push({
        id: q.id,
        number: q.number ?? idx + 1,
        type: q.type ?? "detail",
        stem: q.stem ?? "",
        passageHtml,
        passageText,
        choices,
        rationale: q.explanation ?? null,
        clueQuote: null,
      });
    });
  });
  return result;
}

export function buildCwItems(items: any[]): CwReviewItem[] {
  return items.map((item: any) => ({
    id: item.id,
    paragraphHtml: normalizeBlankMarkers(item.passage ?? ""),
    blanks: (item.blanks ?? []).map((b: any) => ({
      id: b.id,
      order: b.order,
      correctToken: b.correctToken,
    })),
  }));
}

type PageProps = { params: Promise<{ id: string }> };

export default async function DailyTaskReviewPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: task, error: taskError } = await supabase
    .from("daily_tests")
    .select("*")
    .eq("id", id)
    .eq("student_id", user.id)
    .single();

  if (taskError || !task) redirect("/student");
  if (task.status !== "completed") redirect(`/student/daily-tests/${id}`);

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
          href="/student/daily-tests"
          className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-emerald-400 hover:text-emerald-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Daily Tests 목록으로
        </Link>

        <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
          <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            <FileQuestion className="h-3 w-3" />
            Daily Task · Review
          </div>
          <h1 className="mt-1 text-lg font-bold text-gray-900">
            {TASK_TYPE_LABEL[task.task_type] ?? task.task_type}
          </h1>
          <p className="mt-0.5 text-[11px] text-gray-500">
            {task.completed_at ? new Date(task.completed_at).toLocaleString("ko-KR") : "-"}
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs">
            <span className="font-semibold text-emerald-700 text-base">{correctCount}</span>
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
