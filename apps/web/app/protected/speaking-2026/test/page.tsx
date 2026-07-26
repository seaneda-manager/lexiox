import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import type { SpeakingTest2026 } from "@/models/speaking-2026";
import SpeakingAssignmentRunner from "../assignments/[assignmentId]/start/_client/SpeakingAssignmentRunner";

export const dynamic = "force-dynamic";

export default async function Speaking2026TestPage() {
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
        <div className="text-4xl">🎤</div>
        <h1 className="text-lg font-bold">아직 시험이 없습니다</h1>
        <p className="text-sm text-gray-500">
          Admin에서 Speaking 시험을 생성하고 저장하면 여기에 표시됩니다.
        </p>
        <Link href="/speaking-2026" className="inline-block rounded-lg border px-4 py-2 text-xs hover:bg-gray-50">
          돌아가기
        </Link>
      </main>
    );
  }

  return (
    <SpeakingAssignmentRunner
      test={data.payload as SpeakingTest2026}
      testLabel={data.label}
    />
  );
}
