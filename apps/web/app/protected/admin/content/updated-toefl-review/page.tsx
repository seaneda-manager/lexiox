import { getServiceSupabase } from "@/lib/supabase/service";
import { getAssignedTestIds } from "@/lib/supabase/assignment-guard";
import { SECTION_TABLE, type ToeflSection } from "@/lib/admin/toeflReview";
import ReviewClient, { type TestRow } from "./_client/ReviewClient";

export const dynamic = "force-dynamic";

const SECTIONS: ToeflSection[] = ["reading", "listening", "speaking", "writing"];

export default async function UpdatedToeflReviewPage() {
  const service = getServiceSupabase();
  const initial = {} as Record<ToeflSection, TestRow[]>;
  const errors: string[] = [];

  await Promise.all(
    SECTIONS.map(async (s) => {
      const [{ data, error }, assigned] = await Promise.all([
        service
          .from(SECTION_TABLE[s])
          .select("id,label,created_at,updated_at")
          .order("created_at", { ascending: false }),
        getAssignedTestIds(s),
      ]);
      if (error) errors.push(`${s}: ${error.message}`);
      initial[s] = (data ?? []).map((r: any) => ({
        id: r.id,
        label: r.label,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        assigned: assigned.has(r.id),
      }));
    })
  );

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold text-gray-900">Updated TOEFL – AI 검수 &amp; 정리</h1>
        <p className="mt-1 text-xs text-gray-600">
          이미 publish된 시험을 AI가 정답을 모른 채 직접 풀어 오류를 찾고, 잘못된 과거 시험을 일괄 삭제합니다.
          배정된 시험을 삭제하면 해당 학생 배정이 자동으로 취소됩니다.
        </p>
        {errors.length > 0 && <p className="mt-1 text-xs text-rose-600">{errors.join(" / ")}</p>}
      </header>
      <ReviewClient initial={initial} />
    </main>
  );
}
