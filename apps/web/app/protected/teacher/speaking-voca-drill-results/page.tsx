// apps/web/app/(protected)/teacher/speaking-voca-drill-results/page.tsx
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SpeakingVocaDrillRow = {
  id: string;
  created_at: string;
  user_id: string | null;
  mode: string | null;
  prompt: string;
  script: string;
  must_use_words: string[] | null;
  approx_sentences: number | null;
  meta: any;
};

export default async function SpeakingVocaDrillResultsPage() {
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // (간단 방어) 로그인 안 됐으면 막기
  if (!user) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-6">
        <p className="text-sm text-gray-500">로그인이 필요합니다.</p>
      </main>
    );
  }

  // TODO: 나중에 role === "teacher" / "admin" 체크
  const { data, error } = await supabase
    .from("speaking_voca_drill_results")
    .select(
      "id, created_at, user_id, mode, prompt, script, must_use_words, approx_sentences, meta",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("speaking_voca_drill_results fetch error", error);
    return (
      <main className="mx-auto max-w-5xl px-4 py-6 space-y-3">
        <h1 className="text-xl font-bold">Speaking VOCA Drill 결과</h1>
        <p className="text-sm text-red-600">
          결과를 불러오는 중 오류가 발생했습니다.
        </p>
        <details className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <summary className="cursor-pointer font-semibold">
            디버그 정보 보기
          </summary>
          <pre className="mt-2 whitespace-pre-wrap">
            {JSON.stringify(error, null, 2)}
          </pre>
        </details>
      </main>
    );
  }

  const rows = (data ?? []) as SpeakingVocaDrillRow[];

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">Speaking VOCA Drill 결과</h1>
        <p className="text-xs text-gray-500">
          학생들이 C단계에서 제출한 Speaking VOCA Drill 답변 목록입니다.
        </p>
        <p className="text-[10px] text-gray-400">
          최근 저장된 순으로 최대 50개까지 표시됩니다.
        </p>
      </header>

      {rows.length === 0 ? (
        <section className="rounded-2xl border border-gray-200 bg-white px-4 py-6">
          <p className="text-sm text-gray-500">
            아직 저장된 Speaking VOCA Drill 결과가 없습니다.
          </p>
        </section>
      ) : (
        <section className="space-y-3">
          <p className="text-[11px] text-gray-400">
            총 <span className="font-semibold">{rows.length}</span>개
            결과
          </p>

          <div className="space-y-2">
            {rows.map((row) => {
              const created = new Date(row.created_at);
              const shortScript =
                row.script.length > 200
                  ? row.script.slice(0, 200) + " ..."
                  : row.script;

              return (
                <article
                  key={row.id}
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-gray-800">
                        {created.toLocaleString("ko-KR")}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        mode: {row.mode ?? "task1_voca_drill"} · approx
                        sentences: {row.approx_sentences ?? 0}
                      </p>
                      {row.must_use_words && row.must_use_words.length > 0 && (
                        <p className="text-[10px] text-emerald-700">
                          Must-use words: {row.must_use_words.join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {/* 나중에 user_id → 학생 이름 join */}
                      user_id: {row.user_id ?? "—"}
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 rounded-xl bg-gray-50 px-3 py-2">
                    <p className="text-[10px] font-semibold text-gray-700">
                      Prompt
                    </p>
                    <p className="text-[11px] text-gray-700">
                      {row.prompt}
                    </p>
                  </div>

                  <div className="mt-2 space-y-1 rounded-xl bg-indigo-50/70 px-3 py-2">
                    <p className="text-[10px] font-semibold text-indigo-900">
                      Student Script
                    </p>
                    <p className="whitespace-pre-wrap text-[11px] text-indigo-900">
                      {shortScript}
                    </p>
                  </div>

                  {row.meta && (
                    <details className="mt-2 rounded-lg border border-gray-100 bg-white px-3 py-2 text-[10px] text-gray-500">
                      <summary className="cursor-pointer font-semibold">
                        meta 보기
                      </summary>
                      <pre className="mt-1 whitespace-pre-wrap">
                        {JSON.stringify(row.meta, null, 2)}
                      </pre>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
