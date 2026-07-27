import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ListeningGradeListPage() {
  const supabase = await getServerSupabase();

  const { data: rows, error } = await supabase
    .from("listening_results_2026")
    .select("id, test_id, user_id, module, difficulty, correct_count, total_questions, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  // 학생명 조회 (별도 쿼리)
  let studentNames: Record<string, string> = {};
  if (rows && rows.length > 0) {
    const userIds = Array.from(new Set(rows.map(r => (r as any).user_id).filter(Boolean)));
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, name, email")
        .in("id", userIds);

      for (const p of profiles ?? []) {
        studentNames[(p as any).id] = (p as any).full_name || (p as any).name || (p as any).email || "Unknown";
      }
    }
  }

  // 테스트명 조회
  let testLabels: Record<string, string> = {};
  if (rows && rows.length > 0) {
    const testIds = Array.from(new Set(rows.map(r => (r as any).test_id).filter(Boolean)));
    if (testIds.length > 0) {
      const { data: tests } = await supabase
        .from("listening_tests_2026")
        .select("id, label")
        .in("id", testIds);

      for (const t of tests ?? []) {
        testLabels[(t as any).id] = (t as any).label || "Unknown";
      }
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Admin / Listening / 채점
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Listening 채점 관리
        </h1>
        <p className="text-sm text-slate-500">
          학생별 Listening 결과 확인 및 분석
        </p>
      </header>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          데이터 로드 오류: {error.message}
        </p>
      )}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">
            제출 목록 ({rows?.length ?? 0}건)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr className="[&>th]:px-4 [&>th]:py-3">
                <th>학생</th>
                <th>시험</th>
                <th>모듈</th>
                <th>난이도</th>
                <th>정답률</th>
                <th>제출일시</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {!rows || rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    제출된 Listening 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const studentName = studentNames[(row as any).user_id] ?? "학생";
                  const testLabel = testLabels[(row as any).test_id] ?? (row as any).test_id ?? "-";
                  const accuracy = (row as any).total_questions > 0
                    ? Math.round(((row as any).correct_count / (row as any).total_questions) * 100)
                    : 0;
                  const createdAt = new Date((row as any).created_at).toLocaleString("ko-KR", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  });

                  return (
                    <tr
                      key={row.id}
                      className="border-t border-slate-100 hover:bg-slate-50 [&>td]:px-4 [&>td]:py-3"
                    >
                      <td className="font-semibold text-slate-800">{studentName}</td>
                      <td className="text-slate-600">{testLabel}</td>
                      <td className="text-slate-600">
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                          {(row as any).module ?? "M1"}
                        </span>
                      </td>
                      <td className="text-slate-600">
                        <span className="text-xs">
                          {(row as any).difficulty === "easy" && "🟢 Easy"}
                          {(row as any).difficulty === "hard" && "🔴 Hard"}
                          {!(row as any).difficulty && "-"}
                        </span>
                      </td>
                      <td className="font-semibold text-slate-900">
                        {accuracy}% ({(row as any).correct_count}/{(row as any).total_questions})
                      </td>
                      <td className="text-slate-500">{createdAt}</td>
                      <td>
                        <Link
                          href={`/admin/listening/grade/${row.id}`}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          상세
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
