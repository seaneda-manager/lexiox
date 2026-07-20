// apps/web/app/(protected)/speaking-2026/results/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Speaking2026ResultDetailPage({ params }: Props) {
  const { id } = await params;

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

  const { data: row, error } = await supabase
    .from("speaking_results_2026")
    .select(
      `
      id,
      user_id,
      test_id,
      task_id,
      mode,
      script,
      prompt,
      approx_sentences,
      approx_words,
      meta,
      created_at
    `,
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("speaking_results_2026 detail error", error);
    return (
      <main className="mx-auto max-w-3xl space-y-3 px-4 py-6">
        <p className="text-sm text-red-600">Speaking 결과를 불러오는 중 오류가 발생했습니다.</p>
        <details className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <summary className="cursor-pointer font-semibold">Supabase error (디버그용)</summary>
          <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(error, null, 2)}</pre>
        </details>
      </main>
    );
  }

  if (!row) notFound();

  const createdAt = new Date(row.created_at).toLocaleString("ko-KR");

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Speaking 2026 – 연습 결과 상세</h1>
        <p className="text-xs text-gray-500">
          Study 페이지에서 저장된 한 개 Task의 스크립트와 메타 정보입니다.
        </p>
      </header>

      <section className="space-y-2 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-xs">
        <p className="text-[11px] text-gray-500">
          저장 시각: <span className="font-semibold text-gray-800">{createdAt}</span>
        </p>
        <div className="flex flex-wrap gap-2 text-[11px] text-gray-700">
          <span className="rounded-full bg-gray-100 px-3 py-1">
            Test ID: <span className="font-mono text-[11px]">{row.test_id}</span>
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1">
            Task ID: <span className="font-mono text-[11px]">{row.task_id}</span>
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1">
            Mode: <span className="font-mono text-[11px]">{row.mode ?? "study"}</span>
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
            문장 수(대략): <span className="font-semibold">{row.approx_sentences ?? 0}</span>
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
            단어 수(대략): <span className="font-semibold">{row.approx_words ?? 0}</span>
          </span>
        </div>
      </section>

      {row.prompt && (
        <section className="space-y-2 rounded-2xl border border-blue-200 bg-blue-50/60 px-4 py-4 text-xs text-blue-900">
          <p className="text-[11px] font-semibold text-blue-800">Task Prompt</p>
          <p className="whitespace-pre-wrap text-[11px] leading-relaxed">{row.prompt}</p>
        </section>
      )}

      <section className="space-y-2 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-xs">
        <p className="text-[11px] font-semibold text-gray-800">학생 답변 스크립트</p>
        {row.script ? (
          <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-gray-800">{row.script}</p>
        ) : (
          <p className="text-[11px] text-gray-500">저장된 스크립트가 없습니다.</p>
        )}
      </section>

      {row.meta && (
        <section className="space-y-2 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 text-[11px] text-gray-700">
          <p className="font-semibold text-gray-700">Meta (디버그용)</p>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-[10px]">
            {JSON.stringify(row.meta, null, 2)}
          </pre>
        </section>
      )}

      <footer className="flex items-center justify-between pt-2">
        <Link href="/speaking-2026/results" className="text-xs text-emerald-700 hover:underline">
          ← 결과 목록으로 돌아가기
        </Link>
        <Link
          href={`/speaking-2026/results/${id}/feedback`}
          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
        >
          채점 결과 보기 →
        </Link>
      </footer>
    </main>
  );
}
