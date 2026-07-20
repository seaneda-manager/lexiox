// apps/web/app/(protected)/vocab/results/page.tsx
import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function VocabExamResultsPage() {
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

  // ✅ 실전용: 내 시험 결과만 가져오기
  const { data: results, error } = await supabase
    .from("vocab_exam_results")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error(error);
    return (
      <main className="mx-auto max-w-3xl px-4 py-6">
        <p className="text-sm text-red-600">
          결과를 불러오는 중 오류가 발생했습니다.
        </p>
      </main>
    );
  }

  const hasResults = !!results && results.length > 0;

  return (
    <main className="mx-auto space-y-6 pb-8 max-w-3xl">
      {/* 헤더 + Drill 바로가기 버튼 */}
      <header className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">단어 시험 결과</h1>
          <p className="text-xs text-gray-500">
            최근 저장된 단어 시험 결과 리스트입니다.
          </p>
        </div>

        <Link
          href="/vocab/drill"
          className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          오늘 VOCA Drill 하러 가기 →
        </Link>
      </header>

      <section className="space-y-3 rounded-2xl border border-gray-200 bg-white px-4 py-4">
        {!hasResults && (
          <p className="text-sm text-gray-500">
            아직 저장된 단어 시험 결과가 없습니다.
          </p>
        )}

        <div className="divide-y divide-gray-200">
          {results?.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between py-3"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  정확도:{" "}
                  <span className="font-bold text-emerald-600">
                    {r.rate_auto}%
                  </span>
                </p>
                <p className="text-[11px] text-gray-500">
                  {new Date(r.created_at).toLocaleString("ko-KR")}
                </p>
                <p className="text-[10px] text-gray-400">
                  mode: {r.mode ?? "core"} · grade_band:{" "}
                  {r.grade_band ?? "—"}
                </p>
              </div>

              <Link
                href={`/vocab/results/${r.id}`}
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
