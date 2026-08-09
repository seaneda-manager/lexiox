import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import ListeningReviewDetail from "./ListeningReviewDetail";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ resultId: string }> };

export default async function ListeningReviewPage({ params }: PageProps) {
  const { resultId } = await params;
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get listening result
  const { data: result, error: resultError } = await supabase
    .from("listening_results_2026")
    .select("id, test_id, module, difficulty, correct_count, total_questions, finished_at, answers, review_notes")
    .eq("id", resultId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (resultError) console.error("Listening result fetch error:", resultError);
  if (!result) notFound();

  // Get listening test
  const { data: testRow } = await supabase
    .from("listening_tests_2026")
    .select("id, label, payload")
    .eq("id", result.test_id)
    .maybeSingle();

  const test = testRow?.payload ?? null;
  const testLabel = testRow?.label ?? "Listening Test";

  const score = result.total_questions > 0
    ? Math.round((result.correct_count / result.total_questions) * 100)
    : 0;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      {/* Header */}
      <header className="space-y-3">
        <Link
          href="/student/review"
          className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-orange-400 hover:text-orange-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          리뷰 목록으로
        </Link>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">{testLabel}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <span>Module {result.module}</span>
            {result.difficulty && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                result.difficulty === "hard"
                  ? "bg-rose-50 text-rose-700"
                  : "bg-sky-50 text-sky-700"
              }`}>
                {result.difficulty === "hard" ? "Hard" : "Easy"}
              </span>
            )}
            <span>·</span>
            <span className={`text-lg font-bold ${score >= 70 ? "text-emerald-600" : "text-rose-600"}`}>
              {score}% ({result.correct_count}/{result.total_questions})
            </span>
          </div>
        </div>
      </header>

      {/* Review Content */}
      {test && (
        <ListeningReviewDetail
          resultId={resultId}
          test={test}
          answers={result.answers ?? []}
          module={result.module}
          difficulty={result.difficulty}
          initialNotes={result.review_notes ?? {}}
        />
      )}
    </main>
  );
}
