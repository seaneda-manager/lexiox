// apps/web/app/(protected)/updated-reading/study/page.tsx
import { BookOpenCheck } from "lucide-react";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import type { RReadingTest2026 } from "@/models/reading";
import ReadingStudyClient from "./_client/ReadingStudyClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Reading2026StudyPage() {
  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("reading_tests_2026")
    .select("id,label,payload,exam_era,updated_at")
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Reading2026StudyPage load error", error);
  }

  if (!data?.payload) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
            <BookOpenCheck className="h-3.5 w-3.5" />
            Reading 2026 · Study Mode
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            Reading 2026 – Study Mode
          </h1>
          <p className="mt-1 text-xs text-gray-600">
            아직 설정된 Reading 2026 테스트가 없습니다. Admin에서 먼저 시험을
            생성해 주세요.
          </p>
        </header>

        <div className="rounded-xl border bg-white p-4 text-xs text-gray-700 shadow-sm">
          <p>
            <Link
              href="/admin/content/updated-reading"
              className="font-semibold text-emerald-700 underline underline-offset-2"
            >
              Admin · Reading 2026
            </Link>{" "}
            화면으로 이동해서 JSON을 업로드하거나 기존 시험을 생성한 뒤,
            다시 이 페이지로 돌아오면 Study 모드로 연습할 수 있습니다.
          </p>
        </div>
      </main>
    );
  }

  const raw = data.payload as RReadingTest2026;

  const test: RReadingTest2026 = {
    ...raw,
    meta: {
      ...(raw.meta ?? {}),
      id: data.id,
      label: data.label,
      examEra:
        (raw.meta?.examEra ??
          "ibt_2026") as RReadingTest2026["meta"]["examEra"],
    },
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      {/* 헤더 */}
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
          <BookOpenCheck className="h-3.5 w-3.5" />
          Reading 2026 · Study Mode
        </div>
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              {test.meta.label ?? "Reading 2026 – Practice"}
            </h1>
            <p className="mt-1 text-xs text-gray-600">
              ETS Sampler처럼 한 번에 하나의 문제를 보면서 연습하는 모드입니다.
            </p>
          </div>
          <div className="text-right text-[11px] text-gray-500">
            <div>
              Test ID:{" "}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">
                {test.meta.id}
              </code>
            </div>
            <div>Exam Era: {test.meta.examEra}</div>
          </div>
        </div>
      </header>

      {/* 실제 Study Client */}
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <ReadingStudyClient test={test} />
      </section>
    </main>
  );
}
