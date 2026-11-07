import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import type { WWritingTest2026 } from "@/models/writing";
import WritingTestClient from "../../test/_client/WritingTestClient";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

/** Writing Study: 시험과 같은 ETS 화면 + 시간 제한 없음 + 한/영 전환. */
export default async function WritingStudyByIdPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("writing_tests")
    .select("id, label, payload")
    .eq("id", id)
    .maybeSingle();

  if (error || !data?.payload) {
    return (
      <main className="mx-auto max-w-xl py-16 px-4 text-center space-y-4">
        <h1 className="text-lg font-bold">Test not found</h1>
        <Link href="/updated-writing/study" className="inline-block rounded-lg border px-4 py-2 text-xs hover:bg-gray-50">
          Back to list
        </Link>
      </main>
    );
  }

  return <WritingTestClient test={data.payload as WWritingTest2026} testId={data.id} mode="study" />;
}
