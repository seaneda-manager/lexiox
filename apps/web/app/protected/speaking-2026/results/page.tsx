// apps/web/app/(protected)/speaking-2026/results/page.tsx
import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  test_id: string | null;
  task_id: string | null;
  mode: string | null;
  approx_sentences: number | null;
  approx_words: number | null;
  created_at: string;
};

export default async function Speaking2026ResultsPage() {
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

  const { data, error } = await supabase
    .from("speaking_results_2026")
    .select(
      "id, test_id, task_id, mode, approx_sentences, approx_words, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("speaking_results_2026 fetch error", error);
    return (
      <main className="mx-auto max-w-3xl space-y-3 px-4 py-6">
        <p className="text-sm text-red-600">
          Speaking 결과를 불러오는 중 오류가 발생했습니다.
        </p>
        <details className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <summary className="cursor-pointer font-semibold">
            Supabase error (디버그용)
          </summary>
          <pre className="mt-2 whitespace-pre-wrap">
            {JSON.stringify(error, null, 2)}
          </pre>
        </details>
      </main>
    );
  }

  const rows = (data ?? []) as Row[];

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Speaking 2026 – 연습 결과</h1>
        <p className="text-xs text-gray-500">
          Speaking 2026 연습(Study) 페이지에서 저장된 스크립트의 요약입니다.
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-gray-200 bg-white px-4 py-4">
        <p className="text-[11px] text-gray-400">
          디버그: rows = {rows.length}
        </p>

        {rows.length === 0 && (
          <p className="text-sm text-gray-500">
            아직 저장된 Speaking 연습 결과가 없습니다.
          </p>
        )}

        <div className="divide-y divide-gray-200">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between py-3"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Test:{" "}
                  <span className="font-mono text-xs text-gray-700">
                    {r.test_id}
                  </span>
                </p>
                <p className="text-[11px] text-gray-600">
                  Task ID:{" "}
                  <span className="font-mono text-[11px]">
                    {r.task_id}
                  </span>{" "}
                  · mode:{" "}
                  <span className="font-mono text-[11px]">
                    {r.mode ?? "study"}
                  </span>
                </p>
                <p className="text-[11px] text-gray-500">
                  문장 수(대략):{" "}
                  <span className="font-semibold text-emerald-700">
                    {r.approx_sentences ?? 0}
                  </span>{" "}
                  · 단어 수(대략):{" "}
                  <span className="font-semibold text-emerald-700">
                    {r.approx_words ?? 0}
                  </span>
                </p>
                <p className="text-[10px] text-gray-400">
                  {new Date(r.created_at).toLocaleString("ko-KR")}
                </p>
              </div>

              <Link
                href={`/speaking-2026/results/${r.id}`}
                className="text-xs text-emerald-700 hover:underline"
              >
                자세히 →
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
