// apps/web/app/(protected)/vocab/drill-results/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function VocaDrillSpeakingResultDetailPage({ params }: Props) {
  const { id } = await params;

  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto space-y-6 pb-8 max-w-3xl">
        <p className="text-sm text-gray-500">로그인이 필요합니다.</p>
      </main>
    );
  }

  const { data: row, error } = await supabase
    .from("speaking_voca_drill_results")
    .select(
      `
      id,
      user_id,
      mode,
      prompt,
      script,
      must_use_words,
      meta,
      created_at
    `,
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("speaking_voca_drill_results detail error", error);
    return (
      <main className="mx-auto space-y-6 pb-8 max-w-3xl">
        <p className="text-sm text-red-600">
          VOCA Drill Speaking 결과를 불러오는 중 오류가 발생했습니다.
        </p>
        <details className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <summary className="cursor-pointer font-semibold">
            Supabase error (디버그용)
          </summary>
          <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(error, null, 2)}</pre>
        </details>
      </main>
    );
  }

  if (!row) {
    notFound();
  }

  const createdAt = new Date(row.created_at).toLocaleString("ko-KR");
  const mustUse: string[] = Array.isArray(row.must_use_words) ? row.must_use_words : [];

  return (
    <main className="mx-auto space-y-6 pb-8 max-w-3xl">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">VOCA Drill – Speaking 결과 상세</h1>
        <p className="text-xs text-gray-500">
          Vocab Drill C단계에서 저장된 한 개 Speaking 답변입니다.
        </p>
      </header>

      {/* 메타 정보 카드 */}
      <section className="space-y-2 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-xs">
        <p className="text-[11px] text-gray-500">
          저장 시각: <span className="font-semibold text-gray-800">{createdAt}</span>
        </p>
        <div className="flex flex-wrap gap-2 text-[11px] text-gray-700">
          <span className="rounded-full bg-gray-100 px-3 py-1">
            Mode:{" "}
            <span className="font-mono text-[11px]">{row.mode ?? "task1_voca_drill"}</span>
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
            필수 단어:{" "}
            <span className="font-semibold">
              {mustUse.length > 0 ? mustUse.join(", ") : "—"}
            </span>
          </span>
        </div>
      </section>

      {/* 프롬프트 카드 */}
      {row.prompt && (
        <section className="space-y-2 rounded-2xl border border-blue-200 bg-blue-50/60 px-4 py-4 text-xs text-blue-900">
          <p className="text-[11px] font-semibold text-blue-800">Speaking Prompt</p>
          <p className="whitespace-pre-wrap text-[11px] leading-relaxed">{row.prompt}</p>
        </section>
      )}

      {/* 학생 스크립트 카드 */}
      <section className="space-y-2 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-xs">
        <p className="text-[11px] font-semibold text-gray-800">학생 답변 스크립트</p>
        {row.script ? (
          <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-gray-800">
            {row.script}
          </p>
        ) : (
          <p className="text-[11px] text-gray-500">저장된 스크립트가 없습니다.</p>
        )}
      </section>

      {/* meta 디버그용 */}
      {row.meta && (
        <section className="space-y-2 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 text-[11px] text-gray-700">
          <p className="font-semibold text-gray-700">Meta (디버그용)</p>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-[10px]">
            {JSON.stringify(row.meta, null, 2)}
          </pre>
        </section>
      )}

      <footer className="pt-2">
        <Link href="/vocab/drill-results" className="text-xs text-emerald-700 hover:underline">
          ← VOCA Drill Speaking 결과 목록으로 돌아가기
        </Link>
      </footer>
    </main>
  );
}
