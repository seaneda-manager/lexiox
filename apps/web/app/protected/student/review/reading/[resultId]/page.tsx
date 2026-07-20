import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import type {
  RReadingTest2026,
  RReadingModule,
  RReadingItem,
  RAcademicPassageItem,
  RDailyLifeItem,
  RCompleteWordsItem,
  RQuestion,
  RChoice,
} from "@/models/reading";
import { ArrowLeft, FileQuestion } from "lucide-react";
import ReadingReviewV2, { type FlatQuestion, type CwReviewItem } from "./ReadingReviewV2";

export const dynamic = "force-dynamic";

type AnswerPayload = {
  questionId: string;
  number: number;
  chosenChoiceId: string | null;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** 이 결과에서 학생이 실제로 응시한 Stage2 분기(hard/easy)를 answers로 역추적 */
function pickStage2Branch(test: RReadingTest2026, answers: AnswerPayload[]): RReadingModule | null {
  const pool = test.stage2Pool;
  if (!pool) return null;
  const answeredIds = new Set(answers.map((a) => a.questionId));

  const questionIdsOf = (mod: RReadingModule) =>
    mod.items.flatMap((item) =>
      item.taskKind === "complete_words" ? [] : (item.questions ?? []).map((q) => q.id)
    );

  const hardHit = questionIdsOf(pool.hard).some((id) => answeredIds.has(id));
  const easyHit = questionIdsOf(pool.easy).some((id) => answeredIds.has(id));

  if (hardHit && !easyHit) return pool.hard;
  if (easyHit && !hardHit) return pool.easy;
  // 둘 다 매치되거나(비정상 데이터) 둘 다 매치가 없으면(결과 없음) hard를 기본값으로 사용
  return pool.hard;
}

/** Stage1(항상 응시) + 실제 응시한 Stage2 분기의 항목을 하나로 합침 */
function collectAdministeredItems(test: RReadingTest2026, answers: AnswerPayload[]): RReadingItem[] {
  const stage1Items = test.modules?.[0]?.items ?? [];
  const stage2Branch = pickStage2Branch(test, answers);
  return [...stage1Items, ...(stage2Branch?.items ?? [])];
}

function buildCwItems(items: RReadingItem[]): CwReviewItem[] {
  const result: CwReviewItem[] = [];
  for (const item of items) {
    if (item.taskKind !== "complete_words") continue;
    const cw = item as RCompleteWordsItem;
    result.push({
      id: cw.id,
      paragraphHtml: cw.paragraphHtml,
      blanks: cw.blanks.map((b) => ({
        id: b.id,
        order: b.order,
        correctToken: b.correctToken,
      })),
    });
  }
  return result;
}

function buildFlatQuestions(items: RReadingItem[]): FlatQuestion[] {
  const result: FlatQuestion[] = [];

  items.forEach((item: RReadingItem) => {
    if (item.taskKind !== "academic_passage" && item.taskKind !== "daily_life") return;

    const passageHtml =
      item.taskKind === "academic_passage"
        ? (item as RAcademicPassageItem).passageHtml ?? ""
        : (item as RDailyLifeItem).contentHtml ?? "";
    const passageText = stripHtml(passageHtml);
    const questions: RQuestion[] = item.questions ?? [];

    questions.forEach((q: RQuestion) => {
      const choices = (q.choices ?? []).map((c: RChoice) => ({
        id: c.id,
        text: c.text,
        isCorrect: (c as any).is_correct === true || (c as any).isCorrect === true,
        explain: (c as any).explain ?? null,
      }));

      result.push({
        id: q.id,
        number: q.number,
        type: q.type ?? "detail",
        stem: q.stem,
        passageHtml,
        passageText,
        choices,
        rationale: (q as any).explanation?.rationale ?? null,
        clueQuote: (q as any).explanation?.clue_quote ?? null,
      });
    });
  });

  return result;
}

type PageProps = { params: Promise<{ resultId: string }> };

export default async function StudentReadingReviewDetailPage({ params }: PageProps) {
  const { resultId } = await params;
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: resultRow, error: resultError } = await supabase
    .from("reading_results_2026")
    .select("id,test_id,user_id,total_questions,finished_at,answers")
    .eq("id", resultId)
    .maybeSingle();

  if (resultError) console.error("ReadingReview result error", resultError);
  if (!resultRow?.test_id) notFound();

  const { data: testRow, error: testError } = await supabase
    .from("reading_tests_2026")
    .select("id,label,payload")
    .eq("id", resultRow.test_id)
    .maybeSingle();

  if (testError) console.error("ReadingReview test error", testError);
  if (!testRow?.payload) notFound();

  const test = testRow.payload as RReadingTest2026;

  const answers: AnswerPayload[] = Array.isArray(resultRow.answers)
    ? (resultRow.answers as AnswerPayload[])
    : [];

  const administeredItems = collectAdministeredItems(test, answers);
  const flatQuestions = buildFlatQuestions(administeredItems);
  const cwItems = buildCwItems(administeredItems);

  const answerMap: Record<string, string | null> = {};
  answers.forEach((a) => {
    if (a?.questionId) answerMap[a.questionId] = a.chosenChoiceId ?? null;
  });

  const correctCount = flatQuestions.filter((q) => {
    const chosen = answerMap[q.id];
    return chosen && q.choices.find((c) => c.id === chosen)?.isCorrect;
  }).length;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-3">
        <Link
          href="/student/review"
          className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-emerald-400 hover:text-emerald-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          리뷰 목록으로
        </Link>

        <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
          <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            <FileQuestion className="h-3 w-3" />
            Reading · Review
          </div>
          <h1 className="mt-1 text-lg font-bold text-gray-900">
            {testRow.label ?? "Reading Test"}
          </h1>
          <p className="mt-0.5 text-[11px] text-gray-500">
            {resultRow.finished_at ? new Date(resultRow.finished_at).toLocaleString("ko-KR") : "-"}
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs">
            <span className="font-semibold text-emerald-700 text-base">{correctCount}</span>
            <span className="text-gray-500">/ {flatQuestions.length} 정답</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              flatQuestions.length > 0 && correctCount / flatQuestions.length >= 0.7
                ? "bg-green-100 text-green-700"
                : "bg-orange-100 text-orange-700"
            }`}>
              {flatQuestions.length > 0 ? Math.round(correctCount / flatQuestions.length * 100) : 0}%
            </span>
          </div>
        </div>
      </header>

      <ReadingReviewV2
        flatQuestions={flatQuestions}
        answerMap={answerMap}
        cwItems={cwItems}
      />
    </main>
  );
}
