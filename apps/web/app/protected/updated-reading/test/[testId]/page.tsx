// apps/web/app/(protected)/updated-reading/test/[testId]/page.tsx
import { ensureReadingIds } from "@/lib/utils/ensureReadingIds";
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

  // 예전에 저장된 시험은 문항·빈칸 id가 비어 있다. 응시 때 붙이던 것과 같은 규칙으로 보정해야 저장된 답과 맞는다.
  ensureReadingIds(data.payload);
  const payload = data.payload as RReadingTest2026;

  return (
    <ReadingTestRunnerClient
      testId={data.id}
      label={data.label ?? "Reading 2026 Test"}
      test={payload}
    />
  );
}
