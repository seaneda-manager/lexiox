import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { loadTeacherReviewOverview, type ReviewStatus } from "@/lib/vocab/review/teacherReview";

export const dynamic = "force-dynamic";

/**
 * 선생님용 단어 복습 현황
 *  - 학생별로 오늘 복습이 몇 개 밀렸는지 / 며칠째 밀렸는지 / 총 시험은 언제 봤는지
 *  - "복습 의무"를 알림에서 막기로 바꿀지 판단할 근거
 */

const STATUS_META: Record<ReviewStatus, { label: string; cls: string }> = {
  late: { label: "늦음", cls: "bg-rose-100 text-rose-700" },
  due: { label: "오늘 할 것", cls: "bg-amber-100 text-amber-700" },
  ok: { label: "정상", cls: "bg-emerald-100 text-emerald-700" },
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return `${d.slice(5, 7)}/${d.slice(8, 10)}`;
}

export default async function TeacherVocabReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; only?: string }>;
}) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/teacher/vocab-review");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "teacher" && me?.role !== "admin") redirect("/student");

  const sp = await searchParams;
  const classFilter = (sp.class ?? "").trim();
  const onlyLate = sp.only === "late";

  const overview = await loadTeacherReviewOverview(getServiceSupabase());
  const rows = overview.rows.filter((r) => {
    if (classFilter && !r.classIds.includes(classFilter)) return false;
    if (onlyLate && r.status !== "late") return false;
    return true;
  });

  const { counts } = overview;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900">단어 복습 현황</h1>
        <p className="mt-1 text-sm text-neutral-500">
          학습 때 prescreen에서 모르거나 speed에서 틀린 단어는 다음 날부터 복습해요. 1·2회차는 의무, 3회차는 1·2회차에서
          틀린 단어만 해요. 총 시험은 기본 30일마다 열려요.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="복습 기록이 있는 학생" value={counts.students} />
        <SummaryCard label="오늘 복습할 학생" value={counts.withDue} tone="amber" />
        <SummaryCard label="2일 이상 밀린 학생" value={counts.late} tone="rose" />
        <SummaryCard label="총 시험 시기인 학생" value={counts.totalDue} tone="violet" />
      </section>

      <form method="get" className="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3">
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          반
          <select
            name="class"
            defaultValue={classFilter}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
          >
            <option value="">전체</option>
            {overview.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input type="checkbox" name="only" value="late" defaultChecked={onlyLate} />
          밀린 학생만
        </label>
        <button type="submit" className="rounded-lg bg-neutral-900 px-4 py-1.5 text-sm font-semibold text-white">
          적용
        </button>
        {(classFilter || onlyLate) && (
          <Link href="/teacher/vocab-review" className="text-sm text-neutral-500 underline">
            초기화
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold text-neutral-500">
              <th className="px-4 py-3">학생</th>
              <th className="px-3 py-3">반</th>
              <th className="px-3 py-3">상태</th>
              <th className="px-3 py-3 text-right">오늘 복습</th>
              <th className="px-3 py-3 text-right">밀린 기간</th>
              <th className="px-3 py-3 text-right">복습 중</th>
              <th className="px-3 py-3 text-right">총 시험으로</th>
              <th className="px-3 py-3">마지막 복습</th>
              <th className="px-3 py-3">총 시험</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-neutral-400">
                  조건에 맞는 학생이 없어요.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const meta = STATUS_META[r.status];
              return (
                <tr key={r.studentId} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-neutral-900">{r.name}</div>
                    <div className="text-xs text-neutral-400">
                      {[r.school, r.grade].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-neutral-600">{r.classNames.join(", ") || "—"}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.cls}`}>{meta.label}</span>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums text-neutral-900">
                    {r.summary.dueCount > 0 ? `${r.summary.dueCount}개` : "—"}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-neutral-600">
                    {r.summary.dueCount > 0 ? (r.summary.overdueDays > 0 ? `${r.summary.overdueDays}일째` : "오늘") : "—"}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-neutral-600">{r.summary.openCount}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-neutral-600">
                    {r.summary.lapsedCount > 0 ? `${r.summary.lapsedCount}개` : "—"}
                  </td>
                  <td className="px-3 py-3 text-neutral-600">{fmtDate(r.summary.lastReviewedOn)}</td>
                  <td className="px-3 py-3">
                    <span className="text-neutral-600">{fmtDate(r.lastTotalOn)}</span>
                    {r.totalDueTracks > 0 && (
                      <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">
                        시기 도래
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-neutral-400">
        기준일 {overview.today} (KST). "늦음"은 가장 오래 밀린 복습이 2일 이상인 경우예요. 복습 의무를 "알림"에서 "새 Day
        잠금"으로 바꿀지는 이 화면에서 밀린 정도를 보고 정하면 돼요.
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "amber" | "rose" | "violet";
}) {
  const color = {
    neutral: "text-neutral-900",
    amber: "text-amber-600",
    rose: "text-rose-600",
    violet: "text-violet-600",
  }[tone];
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="text-xs font-semibold text-neutral-500">{label}</div>
      <div className={`mt-1 text-3xl font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
