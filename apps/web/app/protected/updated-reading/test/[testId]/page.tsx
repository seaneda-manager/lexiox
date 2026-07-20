// apps/web/app/(protected)/updated-reading/test/[testId]/page.tsx
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import type { RReadingTest2026 } from "@/models/reading";
import ReadingTestRunnerClient from "./_client/ReadingTestRunnerClient";

type Props = {
  params: Promise<{ testId: string }>;
};

export const dynamic = "force-dynamic";

export default async function Reading2026TestPage({ params }: Props) {
  const { testId } = await params;

  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("reading_tests_2026")
    .select("id,label,payload")
    .eq("id", testId)
    .maybeSingle();

  if (error || !data) notFound();

  const payload = data.payload as RReadingTest2026;

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight">
          {data.label ?? "Reading 2026 Test"}
        </h1>
        <p className="text-xs text-gray-600">
          실제 시험 모드로 응시한 뒤, 결과가 자동으로 저장됩니다.
        </p>
      </header>

      <ReadingTestRunnerClient
        testId={data.id}
        label={data.label ?? "Reading 2026 Test"}
        test={payload}
      />
    </main>
  );
}
