import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import type { SpeakingTest2026 } from "@/models/speaking-2026";
import SpeakingAssignmentRunner from "../../assignments/[assignmentId]/start/_client/SpeakingAssignmentRunner";

export const dynamic = "force-dynamic";

/** Speaking Study: 시험과 같은 ETS 화면 + 준비 시간·재청취 + 한/영 전환. */
export default async function Speaking2026StudyTestPage() {
  const supabase = await getServerSupabase();

  const { data } = await supabase
    .from("speaking_tests")
    .select("id, label, payload")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.payload) {
    return (
      <main className="mx-auto max-w-xl py-16 px-4 text-center space-y-4">
        <h1 className="text-lg font-bold">No test available yet</h1>
        <Link href="/speaking-2026/study" className="inline-block rounded-lg border px-4 py-2 text-xs hover:bg-gray-50">
          Back
        </Link>
      </main>
    );
  }

  return (
    <SpeakingAssignmentRunner
      test={data.payload as SpeakingTest2026}
      testLabel={data.label}
      mode="study"
    />
  );
}
