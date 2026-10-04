import Link from "next/link";
import { listSessionsForDateAction } from "./actions";
import { addDaysISO, formatKoreanDate, isISODate, timeRange, todayKST } from "@/lib/classes/dates";
import { checkState } from "@/lib/classes/sessionBoard";

export const dynamic = "force-dynamic";

const STATE_BADGE = {
  unchecked: { label: "미체크", cls: "bg-red-100 text-red-700" },
  partial: { label: "일부 체크", cls: "bg-amber-100 text-amber-800" },
  done: { label: "체크 완료", cls: "bg-green-100 text-green-700" },
} as const;

export default async function TeacherSessionListPage({ searchParams }: { searchParams: { date?: string } }) {
  const today = todayKST();
  const date = isISODate(searchParams?.date) ? searchParams.date : today;
  const res = await listSessionsForDateAction({ date });

  const sessions = [...(res.sessions ?? [])].sort((a, b) => {
    if (a.is_mine !== b.is_mine) return a.is_mine ? -1 : 1; // 내 수업 먼저
    return a.start_time.localeCompare(b.start_time);
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold">📋 오늘의 수업</h1>

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

      {res.ok && sessions.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed bg-white p-10 text-center text-sm text-gray-500">
          이 날은 수업이 없습니다.
          <div className="mt-2 text-xs text-gray-400">
            반 시간표를 등록하고 <b>&quot;앞으로 2주 수업 만들기&quot;</b>를 눌렀는지 확인하세요 →{" "}
            <Link className="text-blue-600 underline" href="/admin/classes">
              반 관리
            </Link>
          </div>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {sessions.map((s) => {
          const state = checkState(s.summary);
          const badge = STATE_BADGE[state];
          const cancelled = s.status === "cancelled";
          return (
            <Link
              key={s.id}
              href={`/teacher/session/${s.id}`}
              className={`block rounded-xl border bg-white p-4 shadow-sm hover:border-blue-400 ${cancelled ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-gray-500">{timeRange(s.start_time, s.duration_min)}</div>
                  <div className="text-lg font-bold">
                    {s.class_name}
                    {s.is_mine && <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 align-middle text-xs text-blue-700">내 수업</span>}
                    {s.kind !== "regular" && (
                      <span className="ml-2 rounded bg-purple-100 px-2 py-0.5 align-middle text-xs text-purple-700">
                        {s.kind === "makeup" ? "보강" : "임시"}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">담당 {s.teacher_name ?? "미정"} · 학생 {s.summary.total}명</div>
                </div>
                {cancelled ? (
                  <span className="rounded bg-gray-200 px-2 py-1 text-xs">휴강</span>
                ) : (
                  <span className={`rounded px-2 py-1 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                )}
              </div>
              {!cancelled && s.summary.total > 0 && (
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                  <span>출석 {s.summary.present}</span>
                  <span>지각 {s.summary.late}</span>
                  <span>결석 {s.summary.absent + s.summary.excused}</span>
                  {s.summary.unchecked > 0 && <span className="text-red-600">미체크 {s.summary.unchecked}</span>}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
