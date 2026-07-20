// apps/web/app/(protected)/vocab/drill-results/page.tsx
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function VocabDrillSpeakingResultsPage() {
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

  const { data: rows, error } = await supabase
    .from("speaking_voca_drill_results")
    .select("id, mode, prompt, must_use_words, created_at, meta")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("speaking_voca_drill_results fetch error", error);
    return (
      <main className="mx-auto max-w-3xl space-y-3 px-4 py-6">
        <p className="text-sm text-red-600">
          VOCA Drill Speaking 결과를 불러오는 중 오류가 발생했습니다.
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

  return (
    <main className="mx-auto space-y-6 pb-8 max-w-3xl">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">
          VOCA Drill – Speaking 제출 결과
        </h1>
        <p className="text-xs text-gray-500">
          VOCA Drill C단계에서 저장한 Speaking 답변들의 기록입니다.
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-gray-200 bg-white px-4 py-4">
        <p className="text-[11px] text-gray-400">
          디버그: rows = {rows?.length ?? 0}
        </p>

        {(!rows || rows.length === 0) && (
          <p className="text-sm text-gray-500">
            아직 저장된 VOCA Drill Speaking 결과가 없습니다.
          </p>
        )}

        <div className="divide-y divide-gray-200">
          {rows?.map((r) => {
            const createdAt = new Date(r.created_at).toLocaleString("ko-KR");
            const mustUse: string[] = Array.isArray(r.must_use_words)
              ? r.must_use_words
              : [];
            const promptPreview =
              typeof r.prompt === "string"
                ? r.prompt.slice(0, 60) +
                  (r.prompt.length > 60 ? "..." : "")
                : "";

            return (
              <div
                key={r.id}
                className="flex items-center justify-between py-3"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Mode:{" "}
                    <span className="font-mono text-xs text-gray-800">
                      {r.mode ?? "task1_voca_drill"}
                    </span>
                  </p>
                  <p className="text-[11px] text-gray-600">
                    필수 단어:{" "}
                    {mustUse.length > 0 ? mustUse.join(", ") : "—"}
                  </p>
                  {promptPreview && (
                    <p className="text-[10px] text-gray-500">
                      Q: {promptPreview}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400">{createdAt}</p>
                </div>

                <Link
                  href={`/vocab/drill-results/${r.id}`}
                  className="text-xs text-emerald-700 hover:underline"
                >
                  자세히 →
                </Link>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
