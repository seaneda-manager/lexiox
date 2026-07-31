// app/(protected)/admin/speaking/grade/page.tsx
// 스피킹 채점 대기 목록
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  ungraded: "미채점",
  ai_graded: "AI 초안",
  teacher_graded: "채점 완료",
};

const STATUS_COLOR: Record<string, string> = {
  ungraded: "bg-amber-50 text-amber-700 border-amber-200",
  ai_graded: "bg-blue-50 text-blue-700 border-blue-200",
  teacher_graded: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default async function SpeakingGradeListPage() {
  // ✅ Admin이 모든 데이터를 볼 수 있도록 서비스 롤 사용
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );

  const { data: rows, error } = await supabase
    .from("speaking_results_2026")
    .select(
      `id, test_id, task_id, mode, user_id,
       created_at, script, approx_words, approx_sentences,
       grading_status, ai_total_score, final_total_score`,
    )
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

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Admin / Speaking / 채점
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          스피킹 채점 관리
        </h1>
        <p className="text-sm text-slate-500">
          AI 초안 채점 → 선생님 검토 → 최종 확정
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
                <th>Test / Task</th>
                <th>모드</th>
                <th>제출일시</th>
                <th>상태</th>
                <th>AI 점수</th>
                <th>최종 점수</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {!rows || rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    제출된 스피킹 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const studentName = studentNames[(row as any).user_id] ?? "학생";
                  const status = (row as any).grading_status ?? "ungraded";
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
                      className="border-t border-slate-100 [&>td]:px-4 [&>td]:py-3"
                    >
                      <td className="font-semibold text-slate-800">{studentName}</td>
                      <td className="text-slate-600">
                        <span className="font-mono text-xs">{row.test_id}</span>
                        <span className="ml-1 text-slate-400">/</span>
                        <span className="ml-1 font-mono text-xs">{row.task_id}</span>
                      </td>
                      <td className="text-slate-500">{row.mode ?? "-"}</td>
                      <td className="text-slate-500">{createdAt}</td>
                      <td>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_COLOR[status] ?? "bg-slate-50 text-slate-500 border-slate-200"}`}
                        >
                          {STATUS_LABEL[status] ?? status}
                        </span>
                      </td>
                      <td className="text-slate-700">
                        {(row as any).ai_total_score != null ? (
                          <span className="font-semibold">{(row as any).ai_total_score}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="text-slate-700">
                        {(row as any).final_total_score != null ? (
                          <span className="font-bold text-emerald-700">{(row as any).final_total_score}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td>
                        <Link
                          href={`/protected/admin/speaking/grade/${row.id}`}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {status === "teacher_graded" ? "보기" : "채점"}
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
