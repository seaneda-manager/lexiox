// apps/web/app/protected/teacher/reports/assignments/page.tsx
// 반 전체 학생 x 과제종류 완료 현황 매트릭스. studentAssignmentCalendar.ts가
// 이미 숙제/시험/단어/JR/Hi-내신을 하나의 형태(AssignmentItem)로 합쳐주는데,
// 지금까지는 학생 1명씩만 호출되고 있었다 — 이 페이지가 로스터 전체에 대해
// 그걸 돌려서 한눈에 보는 매트릭스로 만든 첫 사용처.

import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { getStudentAssignmentCalendar } from "@/lib/assignments/studentAssignmentCalendar";
import { ASSIGNMENT_KIND_LABEL, type AssignmentKind } from "@/lib/assignments/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const KIND_ORDER: AssignmentKind[] = [
  "homework",
  "daily_test",
  "toefl_section",
  "toefl_group",
  "vocab",
  "jr",
  "hi_naesin",
];

const DONE_STATUSES = new Set(["completed", "graded", "submitted"]);

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getWeekRange(weeksAgo: number) {
  const now = new Date();
  const day = now.getDay(); // 0=일
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day === 0 ? 7 : day) - 1) - weeksAgo * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    from: toIso(monday),
    to: toIso(sunday),
    label: `${monday.getMonth() + 1}/${monday.getDate()} ~ ${sunday.getMonth() + 1}/${sunday.getDate()}`,
  };
}

type Props = {
  searchParams: Promise<{ week?: string }>;
};

export default async function AssignmentsOverviewPage({ searchParams }: Props) {
  const { week } = await searchParams;
  const weeksAgo = Math.max(0, Math.min(4, parseInt(week ?? "0", 10) || 0));
  const range = getWeekRange(weeksAgo);

  const supabase = await getServerSupabase();
  const { data: roster } = await supabase
    .from("academy_students")
    .select("id, display_name, school, grade, user_id, auth_user_id")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  const students = roster ?? [];

  const rows = await Promise.all(
    students.map(async (s: any) => {
      const authUserId = (s.user_id ?? s.auth_user_id ?? s.id) as string;
      const items = await getStudentAssignmentCalendar({
        authUserId,
        academyStudentId: s.id,
        fromIso: range.from,
        toIso: range.to,
      }).catch(() => []);

      const byKind: Record<string, { total: number; done: number }> = {};
      for (const kind of KIND_ORDER) byKind[kind] = { total: 0, done: 0 };
      for (const it of items) {
        const bucket = byKind[it.kind] ?? (byKind[it.kind] = { total: 0, done: 0 });
        bucket.total += 1;
        if (DONE_STATUSES.has(it.status)) bucket.done += 1;
      }

      const totalAll = items.length;
      const doneAll = items.filter((it) => DONE_STATUSES.has(it.status)).length;
      const overallPct = totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : null;

      return {
        id: s.id as string,
        authUserId,
        name: (s.display_name as string | null) ?? "이름 미등록",
        school: (s.school as string | null) ?? "-",
        grade: (s.grade as string | null) ?? "-",
        byKind,
        overallPct,
        totalAll,
      };
    }),
  );

  rows.sort((a, b) => (a.overallPct ?? -1) - (b.overallPct ?? -1));

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-gray-900">배정 과제 현황</h1>
        <p className="text-xs text-gray-500">
          학생별 · 과제 종류별 완료 현황을 한눈에 봅니다 ({range.label})
        </p>
      </header>

      <div className="flex gap-1">
        {[0, 1, 2].map((w) => (
          <Link
            key={w}
            href={`/teacher/reports/assignments?week=${w}`}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              weeksAgo === w
                ? "bg-neutral-800 text-white"
                : "border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {w === 0 ? "이번 주" : w === 1 ? "저번 주" : `${w}주 전`}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-xs">
          <thead className="border-b bg-gray-50 text-[11px] text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">학생</th>
              {KIND_ORDER.map((k) => (
                <th key={k} className="px-2 py-2 text-center">
                  {ASSIGNMENT_KIND_LABEL[k]}
                </th>
              ))}
              <th className="px-3 py-2 text-center">전체</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={KIND_ORDER.length + 2} className="px-3 py-6 text-center text-gray-400">
                  학생이 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-emerald-50/30">
                  <td className="px-3 py-2">
                    <Link href={`/teacher/students/${r.authUserId}`} className="font-medium text-gray-900 hover:underline">
                      {r.name}
                    </Link>
                    <div className="text-[10px] text-gray-400">
                      {r.school} · {r.grade}
                    </div>
                  </td>
                  {KIND_ORDER.map((k) => {
                    const b = r.byKind[k];
                    const has = b.total > 0;
                    const pct = has ? Math.round((b.done / b.total) * 100) : null;
                    return (
                      <td key={k} className="px-2 py-2 text-center">
                        {has ? (
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 font-semibold ${
                              pct === 100
                                ? "bg-emerald-50 text-emerald-700"
                                : pct! > 0
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {b.done}/{b.total}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center">
                    {r.overallPct !== null ? (
                      <span
                        className={`font-bold ${
                          r.overallPct >= 80
                            ? "text-emerald-600"
                            : r.overallPct >= 40
                              ? "text-amber-600"
                              : "text-rose-600"
                        }`}
                      >
                        {r.overallPct}%
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-500">
        완료 기준: 완료/채점완료/제출 상태. 완료율 낮은 순 정렬 — 먼저 확인이 필요한 학생이 위로 옵니다.
      </p>
    </main>
  );
}
