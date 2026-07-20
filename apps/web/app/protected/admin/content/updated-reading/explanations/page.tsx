import { getServerSupabase } from "@/lib/supabase/server";
import ExplanationGeneratorClient from "./_client/ExplanationGeneratorClient";

export default async function ExplanationsPage() {
  const supabase = await getServerSupabase();

  // 사용 가능한 테스트 목록
  const { data: tests } = await supabase
    .from("reading_tests_2026")
    .select("id, label")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            📚 Reading 설명 생성 & 수정
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            AI로 자동 생성한 후, 검토하고 수정할 수 있습니다.
          </p>
        </div>

        <ExplanationGeneratorClient tests={tests || []} />
      </div>
    </div>
  );
}
