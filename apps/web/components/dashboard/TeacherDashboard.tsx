// apps/web/components/dashboard/TeacherDashboard.tsx

type TeacherReadingResult = {
  id: string;
  test_id: string;
  label: string;
  total_questions: number;
  finished_at: string | null;
  user_id: string | null;
  student_name?: string | null;
};

type Props = {
  name?: string | null;
  readingResults: TeacherReadingResult[];
};

export default function TeacherDashboard({ name, readingResults }: Props) {
  return (
    <div className="space-y-6">
      {/* 인사 영역 */}
      <section>
        <h1 className="text-2xl font-bold tracking-tight">
          {name ? `${name} 선생님, 환영합니다 👋` : "선생님 Dashboard 👋"}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          학생들의 Reading 2026 응시 현황과 결과를 한눈에 확인할 수 있습니다.
        </p>
      </section>

      {/* 요약 카드 (나중에 통계 연동) */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border px-4 py-3 text-sm shadow-sm">
          <div className="text-xs text-gray-500">오늘 응시한 시험</div>
          <div className="mt-1 text-xl font-semibold">
            {
              readingResults.filter((r) => {
                if (!r.finished_at) return false;
                const d = new Date(r.finished_at);
                const today = new Date();
                return (
                  d.getFullYear() === today.getFullYear() &&
                  d.getMonth() === today.getMonth() &&
                  d.getDate() === today.getDate()
                );
              }).length
            }
          </div>
        </div>
        <div className="rounded-xl border px-4 py-3 text-sm shadow-sm">
          <div className="text-xs text-gray-500">저장된 Reading 2026 결과</div>
          <div className="mt-1 text-xl font-semibold">
            {readingResults.length}
          </div>
        </div>
        <div className="rounded-xl border px-4 py-3 text-sm shadow-sm">
          <div className="text-xs text-gray-500">최근 7일 응시 학생 수</div>
          <div className="mt-1 text-xl font-semibold">
            {
              new Set(
                readingResults
                  .filter((r) => {
                    if (!r.finished_at) return false;
                    const d = new Date(r.finished_at);
                    const now = new Date();
                    const diff =
                      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
                    return diff <= 7;
                  })
                  .map((r) => r.user_id)
                  .filter(Boolean) as string[]
              ).size
            }
          </div>
        </div>
      </section>

      {/* 최근 Reading 2026 결과 테이블 */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">최근 Reading 2026 응시 기록</h2>
          <a
            href="/teacher/updated-reading/results"
            className="text-xs text-blue-600 hover:underline"
          >
            전체 보기
          </a>
        </div>

        {readingResults.length === 0 ? (
          <p className="text-xs text-gray-500">
            아직 저장된 Reading 2026 결과가 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full border-collapse text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">학생</th>
                  <th className="px-3 py-2 text-left font-semibold">시험</th>
                  <th className="px-3 py-2 text-left font-semibold">Test ID</th>
                  <th className="px-3 py-2 text-left font-semibold">문항수</th>
                  <th className="px-3 py-2 text-left font-semibold">응시일</th>
                  <th className="px-3 py-2 text-left font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {readingResults.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">
                      {r.student_name || r.user_id || "-"}
                    </td>
                    <td className="px-3 py-2">{r.label}</td>
                    <td className="px-3 py-2">
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                        {r.test_id}
                      </code>
                    </td>
                    <td className="px-3 py-2">{r.total_questions}</td>
                    <td className="px-3 py-2">
                      {r.finished_at
                        ? new Date(r.finished_at).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <a
                        href={`/updated-reading/result/${r.id}`}
                        className="rounded border px-2 py-0.5 text-[11px] font-medium hover:bg-gray-50"
                      >
                        리포트
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
