import { getServerSupabase } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

type Props = {
  params: Promise<{ testId: string }>;
};

type ResultRow = {
  id: number;
  user_id: string | null;
  total_questions: number;
  finished_at: string;
  created_at: string;
  answers: { questionId: string; chosenChoiceId: string | null }[];
};

export const dynamic = "force-dynamic";

export default async function Reading2026ResultsPage({ params }: Props) {
  const { testId } = await params;

  const supabase = await getServerSupabase();

  // 테스트 정보
  const { data: test, error: testError } = await supabase
    .from("reading_tests_2026")
    .select("id,label")
    .eq("id", testId)
    .maybeSingle();

  if (testError || !test) notFound();

  // 결과 목록
  const { data: results, error: resError } = await supabase
    .from("reading_results_2026")
    .select("id,user_id,total_questions,finished_at,created_at,answers")
    .eq("test_id", testId)
    .order("created_at", { ascending: false });

  const rows: ResultRow[] = (results ?? []) as any;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">
          Reading 2026 – Results for <span className="font-mono">{test.id}</span>
        </h1>
        <p className="text-sm text-gray-600">{test.label}</p>
      </header>

      {resError && (
        <p className="text-sm text-red-600">Failed to load results: {resError.message}</p>
      )}

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="px-2 py-2">Result ID</th>
            <th className="px-2 py-2">User</th>
            <th className="px-2 py-2">Finished at</th>
            <th className="px-2 py-2">Answered</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const answeredCount = (r.answers ?? []).filter((a) => a.chosenChoiceId !== null).length;

            return (
              <tr key={r.id} className="border-b">
                <td className="px-2 py-2 font-mono text-xs">
                  <Link
                    href={`/student/review/reading/${r.id}`}
                    className="text-emerald-700 underline hover:text-emerald-900"
                    target="_blank"
                  >
                    {r.id}
                  </Link>
                </td>
                <td className="px-2 py-2 text-xs">
                  {r.user_id ?? <span className="text-gray-400">anonymous</span>}
                </td>
                <td className="px-2 py-2 text-xs text-gray-600">
                  {new Date(r.finished_at).toLocaleString()}
                </td>
                <td className="px-2 py-2 text-xs">
                  {answeredCount} / {r.total_questions}
                </td>
              </tr>
            );
          })}

          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="px-2 py-6 text-center text-sm text-gray-500">
                No results yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
