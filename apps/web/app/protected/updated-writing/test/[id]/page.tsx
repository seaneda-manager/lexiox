import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import type { WWritingTest2026 } from "@/models/writing";
import WritingTestClient from "../_client/WritingTestClient";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function WritingTestByIdPage({ params }: { params: Params }) {
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
        <div className="text-4xl">✍️</div>
        <h1 className="text-lg font-bold">시험을 찾을 수 없습니다</h1>
        <p className="text-sm text-gray-500">
          삭제되었거나 아직 준비되지 않은 시험입니다.
        </p>
        <Link href="/updated-writing/test" className="inline-block rounded-lg border px-4 py-2 text-xs hover:bg-gray-50">
          목록으로
        </Link>
      </main>
    );
  }

  return <WritingTestClient test={data.payload as WWritingTest2026} testId={data.id} />;
}
