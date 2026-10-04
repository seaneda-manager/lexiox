import Link from "next/link";
import { getDayOverviewAction } from "./actions";
import { addDaysISO, formatKoreanDate, isISODate, timeRange, todayKST } from "@/lib/classes/dates";
import { ATTENDANCE_LABEL, checkState } from "@/lib/classes/sessionBoard";

export const dynamic = "force-dynamic";

const STATE_BADGE = {
  unchecked: { label: "미체크", cls: "bg-red-100 text-red-700" },
  partial: { label: "일부 체크", cls: "bg-amber-100 text-amber-800" },
  done: { label: "체크 완료", cls: "bg-green-100 text-green-700" },
} as const;

const EXC_STYLE: Record<string, string> = {
  absent: "bg-red-100 text-red-700",
  late: "bg-amber-100 text-amber-800",
  excused: "bg-slate-200 text-slate-700",
};

export default async function AdminAttendancePage({ searchParams }: { searchParams: { date?: string } }) {
  const today = todayKST();
  const date = isISODate(searchParams?.date) ? searchParams.date : today;
  const res = await getDayOverviewAction({ date });
  const o = res.overview;

  return (
    <div className="mx-auto max-w-5xl px-2 py-6">
      <h1 className="text-2xl font-bold">🗓️ 출석 현황</h1>
      <p className="mt-1 text-sm text-gray-600">하루의 반별 출석 체크 상태와 지각·결석 학생을 한눈에 봅니다. 휴강 수업은 합계에서 제외됩니다.</p>

      <div className="mt-4 flex items-center justify-between gap-2">
        <Link className="rounded border bg-white px-3 py-2 text-sm" href={`?date=${addDaysISO(date, -1)}`}>
          ← 전날
        </Link>
        <div className="text-center">
          <div className="font-semibold">{formatKoreanDate(date)}</div>
          {date !== today && (
            <Link className="text-xs text-blue-600 underline" href="?">
              오늘로 돌아가기
            </Link>
          )}
        </div>
        <Link className="rounded border bg-white px-3 py-2 text-sm" href={`?date=${addDaysISO(date, 1)}`}>
          다음날 →
        </Link>
      </div>

      {!res.ok && <div className="mt-4 rounded-lg bg-red-100 p-3 text-sm text-red-800">❌ {res.error}</div>}

      {o && o.sessions.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed bg-white p-10 text-center text-sm text-gray-500">
          이 날은 수업이 없습니다.
          <div className="mt-2 text-xs text-gray-400">
            시간표를 등록하고 &quot;앞으로 2주 수업 만들기&quot;를 눌렀는지 확인하세요 →{" "}
            <Link className="text-blue-600 underline" href="/admin/classes">
              반 관리
            </Link>
          </div>
        </div>
      )}

      {o && o.sessions.length > 0 && (
        <>
          {/* 합계 */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="출석" value={o.totals.present} cls="text-green-700" />
            <Stat label="지각" value={o.totals.late} cls="text-amber-600" />
            <Stat label="결석" value={o.totals.absent} cls="text-red-600" />
            <Stat label="사유결석" value={o.totals.excused} cls="text-slate-600" />
            <Stat label="미체크" value={o.totals.unchecked} cls={o.totals.unchecked > 0 ? "text-red-600" : "text-gray-400"} />
          </div>

          {o.uncheckedSessions > 0 && (
            <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              아직 출석 체크가 끝나지 않은 수업이 <b>{o.uncheckedSessions}개</b> 있습니다.
            </div>
          )}

          {/* 지각/결석 */}
          <section className="mt-6">
            <h2 className="mb-2 font-bold">지각 · 결석 학생 ({o.exceptions.length}명)</h2>
            {o.exceptions.length === 0 ? (
              <div className="rounded-xl border bg-white p-4 text-sm text-gray-500">지각·결석으로 기록된 학생이 없습니다.</div>
            ) : (
              <div className="divide-y rounded-xl border bg-white">
                {o.exceptions.map((e, i) => (
                  <Link
                    key={`${e.session_id}-${i}`}
                    href={`/teacher/session/${e.session_id}`}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50"
                  >
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${EXC_STYLE[e.status]}`}>
                      {ATTENDANCE_LABEL[e.status]}
                    </span>
                    <b>{e.student_name}</b>
                    <span className="text-gray-500">
                      {e.class_name} · {e.start_time.slice(0, 5)}
                    </span>
                    {e.note && <span className="text-xs text-gray-400">— {e.note}</span>}
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* 반별 */}
          <section className="mt-6">
            <h2 className="mb-2 font-bold">반별 체크 현황</h2>
            <div className="space-y-2">
              {o.sessions.map((s) => {
                const cancelled = s.status === "cancelled";
                const badge = STATE_BADGE[checkState(s.summary)];
                return (
                  <Link
                    key={s.id}
                    href={`/teacher/session/${s.id}`}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 hover:border-blue-400 ${
                      cancelled ? "opacity-60" : ""
                    }`}
                  >
                    <div>
                      <div className="font-medium">
                        {s.class_name} <span className="text-sm font-normal text-gray-500">{timeRange(s.start_time, s.duration_min)}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        담당 {s.teacher_name ?? "미정"} · 학생 {s.summary.total}명
                        {!cancelled && ` · 출석 ${s.summary.present} 지각 ${s.summary.late} 결석 ${s.summary.absent + s.summary.excused}`}
                      </div>
                    </div>
                    {cancelled ? (
                      <span className="rounded bg-gray-200 px-2 py-1 text-xs">휴강</span>
                    ) : (
                      <span className={`rounded px-2 py-1 text-xs font-medium ${badge.cls}`}>
                        {badge.label}
                        {s.summary.unchecked > 0 && s.summary.unchecked < s.summary.total ? ` (${s.summary.unchecked}명 남음)` : ""}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="rounded-xl border bg-white p-3 text-center">
      <div className={`text-2xl font-bold ${cls}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
