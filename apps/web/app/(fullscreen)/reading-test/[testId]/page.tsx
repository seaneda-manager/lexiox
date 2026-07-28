import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import type { RReadingTest2026 } from "@/models/reading";
import ReadingTestRunnerClient from "@/app/protected/updated-reading/test/[testId]/_client/ReadingTestRunnerClient";

type Props = {
  params: Promise<{ testId: string }>;
};

export const dynamic = "force-dynamic";

export default async function Reading2026FullscreenTestPage({ params }: Props) {
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
    <ReadingTestRunnerClient
      testId={data.id}
      label={data.label ?? "Reading 2026 Test"}
      test={payload}
    />
  );
}
