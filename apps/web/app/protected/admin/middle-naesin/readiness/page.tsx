import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = {
  student_id: string;
  unit_id: string;
  test_status: "not_started" | "in_progress" | "done";
  perform_status: "not_started" | "in_progress" | "done";
};

export default async function AdminReadinessPage() {
  const supabase = await getServerSupabase();

  const { data: rows } = await supabase
    .from("student_readiness")
    .select("student_id, unit_id, test_status, perform_status");

  const { data: units } = await supabase
    .from("middle_naesin_units")
    .select("id, lesson_title, publisher, grade, semester, lesson_number");

  const { data: students } = await supabase
    .from("academy_students")
    .select("auth_user_id, full_name")
    .not("auth_user_id", "is", null);

  const unitMap = new Map((units ?? []).map((u: any) => [u.id, u]));
  const studentMap = new Map((students ?? []).map((s: any) => [s.auth_user_id, s.full_name]));

  const grouped = new Map<
    string,
    { studentId: string; unitId: string; total: number; ready: number; started: number }
  >();

  for (const r of (rows ?? []) as Row[]) {
    const key = `${r.student_id}::${r.unit_id}`;
    if (!grouped.has(key)) {
      grouped.set(key, { studentId: r.student_id, unitId: r.unit_id, total: 0, ready: 0, started: 0 });
    }
    const g = grouped.get(key)!;
    g.total++;
    if (r.test_status === "done") g.ready++;
    if (r.perform_status !== "not_started") g.started++;
  }

  const items = Array.from(grouped.values()).sort((a, b) => {
    const nameA = studentMap.get(a.studentId) ?? "";
    const nameB = studentMap.get(b.studentId) ?? "";
    return nameA.localeCompare(nameB);
  });

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <header>
        <Link href="/admin/middle-naesin" className="text-xs text-sky-600 hover:underline">
          ← 중학내신 관리
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900">시험대비 Readiness 현황</h1>
        <p className="mt-1 text-sm text-neutral-500">
          학생이 유닛별 시험대비 화면에 진입해서 최소 1개 sub요소를 건드리면 여기 나타납니다.
        </p>
      </header>

      <div className="rounded-2xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-neutral-50 text-left text-neutral-600">
              <th className="py-2 px-4">학생</th>
              <th className="py-2 px-4">유닛</th>
              <th className="py-2 px-4">진행률</th>
              <th className="py-2 px-4">준비완료(readiness)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const unit = unitMap.get(item.unitId) as any;
              const studentName = studentMap.get(item.studentId) ?? "(학생정보 없음)";
              const pct = item.total > 0 ? Math.round((item.ready / item.total) * 100) : 0;
              return (
                <tr key={`${item.studentId}::${item.unitId}`} className="border-b">
                  <td className="py-2 px-4 font-semibold">{studentName}</td>
                  <td className="py-2 px-4">
                    {unit?.lesson_title || `Lesson ${unit?.lesson_number ?? "?"}`}
                    <span className="ml-1 text-xs text-neutral-400">
                      ({unit?.publisher} · {unit?.semester}학기)
                    </span>
                  </td>
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-neutral-200 rounded-full h-2">
                        <div className="bg-sky-600 h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-neutral-500">{item.started}/{item.total} 시작</span>
                    </div>
                  </td>
                  <td className="py-2 px-4 font-bold text-emerald-700">
                    {item.ready} / {item.total} ({pct}%)
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-neutral-400">
                  아직 진행한 학생이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
