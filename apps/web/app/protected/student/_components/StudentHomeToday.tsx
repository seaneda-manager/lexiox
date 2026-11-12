import Link from "next/link";
import { ASSIGNMENT_AREA_LABEL } from "@/lib/assignments/studentAssignmentCalendar";
import { ZONE_LABEL } from "@/lib/planner/types";
import { PaxAvatar, levelToStage, STAGE_LABEL } from "@/components/avatar/PaxAvatar";
import type { Tribe } from "@/components/avatar/PaxAvatar";
import type { TodayBoard } from "@/lib/student-home/todayBoard";

type Exam = { examTitle: string; dDay: number; readinessPct: number } | null;

// 학생이 매일 처음 보는 영역: 하다 만 것 → 오늘 할 것 → 이번 주 흐름 → 오늘 계획.
// 서버 컴포넌트(상호작용 없음).
export function StudentHomeToday({
  name,
  board,
  exam,
  streak,
  points,
  level,
  tribe,
}: {
  name: string;
  board: TodayBoard;
  exam: Exam;
  streak: number;
  points: number | null;
  level: number | null;
  tribe: Tribe | null;
}) {
  const { resume, todayGroups, todoCount, doneTodayCount, yesterdayDone, planToday, planExists, weekDots } = board;
  const allDone = todoCount === 0 && doneTodayCount > 0;

  const headline = exam
    ? `${exam.examTitle}까지 ${exam.dDay}일. ${todoCount > 0 ? `오늘 할 일 ${todoCount}개가 기다려요` : allDone ? "오늘 할 일을 모두 끝냈어요" : "오늘은 복습으로 가볍게 가요"}`
    : todoCount > 0
      ? `오늘 할 일 ${todoCount}개가 기다려요`
      : allDone
        ? "오늘 할 일을 모두 끝냈어요"
        : "오늘 배정된 일이 없어요. 계획을 세워 볼까요?";

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 pt-6">
      {/* 히어로 */}
      <section
        aria-label="오늘의 한 가지"
        className="grid gap-6 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 p-6 text-white md:grid-cols-[1.4fr_1fr]"
      >
        <div className="min-w-0">
          <div className="flex items-end gap-4">
            <div className="relative shrink-0 rounded-2xl bg-white/90 p-1.5">
              <PaxAvatar tribe={tribe ?? "kenine"} stage={levelToStage(level ?? 1)} size={84} />
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-950">
                {STAGE_LABEL[levelToStage(level ?? 1)]}
              </span>
            </div>
            <p className="pb-1 text-sm text-indigo-200">{name} 학생, 오늘도 왔네요</p>
          </div>
          <h1 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">{headline}</h1>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
            {streak > 0 && <span className="rounded-full bg-white/10 px-3 py-1">연속 {streak}일째</span>}
            {yesterdayDone.length > 0 && (
              <span className="rounded-full bg-white/10 px-3 py-1">어제 {yesterdayDone.length}개 완료</span>
            )}
            {level != null && (
              <span className="rounded-full bg-white/10 px-3 py-1">
                Lv {level}
                {points != null ? ` · ${points.toLocaleString()}P` : ""}
              </span>
            )}
          </div>

          {resume ? (
            <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-indigo-200">하다 멈춘 곳</p>
              <p className="mt-0.5 text-base font-bold">{resume.title}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-indigo-200">
                  {ASSIGNMENT_AREA_LABEL[resume.area]} · {resume.date}
                </span>
                <Link
                  href={resume.href}
                  className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-black text-amber-950 hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  이어하기 →
                </Link>
              </div>
            </div>
          ) : todoCount > 0 && todayGroups[0]?.items[0] ? (
            <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-indigo-200">가장 먼저 할 것</p>
              <p className="mt-0.5 text-base font-bold">{todayGroups[0].items[0].title}</p>
              <div className="mt-3 flex justify-end">
                <Link
                  href={todayGroups[0].items[0].href}
                  className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-black text-amber-950 hover:bg-amber-300"
                >
                  시작하기 →
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-center justify-center gap-1 text-center">
          {exam ? (
            <>
              <p className="text-6xl font-bold tabular-nums">D-{exam.dDay}</p>
              <p className="text-sm text-indigo-200">{exam.examTitle}</p>
              <p className="text-xs text-indigo-300">내 계획 진행 {exam.readinessPct}%</p>
              <Link href="/student/schedule" className="mt-2 text-xs font-semibold text-amber-300 hover:underline">
                시험 계획 보기
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-indigo-200">등록된 시험이 없어요</p>
              <Link
                href="/student/schedule"
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20"
              >
                시험 등록하고 계획 세우기
              </Link>
            </>
          )}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
        {/* 오늘 할 일 (분야별) */}
        <section className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-5" aria-labelledby="today-title">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="today-title" className="text-lg font-bold text-neutral-900">
              오늘 할 일
            </h2>
            <span className="text-xs text-neutral-500">
              {doneTodayCount} 완료 · {todoCount} 남음
            </span>
          </div>
          {todayGroups.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">
              오늘 배정된 일이 없어요. 시험 계획을 세우면 이곳에 매일 할 일이 채워져요.
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              {todayGroups.map((g) => (
                <div key={g.area}>
                  <div className="mb-1.5 flex justify-between text-xs font-bold text-neutral-500">
                    <span>{ASSIGNMENT_AREA_LABEL[g.area]}</span>
                    <span>
                      {g.done} / {g.total}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {g.items.map((it) => (
                      <li key={it.key}>
                        <Link
                          href={it.href}
                          className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm hover:border-indigo-400 hover:bg-indigo-50"
                        >
                          <span
                            className={`h-5 w-5 flex-none rounded-full border-2 ${it.status === "in_progress" ? "border-amber-400 bg-amber-100" : "border-neutral-300"}`}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 truncate font-medium text-neutral-800">{it.title}</span>
                          {it.overdue ? (
                            <span className="flex-none rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">
                              밀림
                            </span>
                          ) : it.status === "in_progress" ? (
                            <span className="flex-none rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                              이어하기
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-4">
          {/* 이번 주 */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-5" aria-labelledby="week-title">
            <h2 id="week-title" className="text-lg font-bold text-neutral-900">
              최근 7일
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              {streak > 0 ? `${streak}일 연속으로 공부했어요.` : "오늘 하면 연속 기록이 시작돼요."}
            </p>
            <div className="mt-3 grid grid-cols-7 gap-1.5">
              {weekDots.map((d) => (
                <div
                  key={d.iso}
                  className={`grid aspect-square place-items-center rounded-lg border text-xs font-bold ${
                    d.on
                      ? "border-amber-400 bg-amber-400 text-amber-950"
                      : "border-neutral-200 bg-neutral-50 text-neutral-400"
                  } ${d.today ? "outline outline-2 outline-offset-1 outline-indigo-500" : ""}`}
                >
                  {d.label}
                </div>
              ))}
            </div>
          </section>

          {/* 내 공부 계획: 배너 전체가 계획표로 가는 링크. 계획이 없으면 동기부여 + 만들기, 있으면 오늘 할 일 */}
          <Link
            href="/student/schedule"
            aria-labelledby="plan-title"
            className="group block rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-indigo-400 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="plan-title" className="text-lg font-bold text-neutral-900">
                내 공부 계획
              </h2>
              <span className="text-xs font-semibold text-indigo-600 group-hover:underline">
                {planExists ? "전체 계획표 →" : "만들러 가기 →"}
              </span>
            </div>

            {!planExists ? (
              <div className="mt-2">
                <p className="text-sm font-semibold text-neutral-800">계획이 있는 학생은 끝까지 가요.</p>
                <p className="mt-1 text-sm text-neutral-500">
                  하루 공부 시간과 요일만 정하면 시험까지 매일 할 일이 이 자리에 나타나요. 3분이면 만들 수 있어요.
                </p>
                <span className="mt-3 inline-block rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white group-hover:bg-indigo-700">
                  내 계획 만들기
                </span>
              </div>
            ) : planToday.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">
                오늘은 계획된 일이 없어요. 쉬는 날이거나 아직 비어 있는 날이에요.
              </p>
            ) : (
              <>
                <p className="mt-0.5 text-xs text-neutral-500">
                  오늘 {planToday.length}개 중 {planToday.filter((b) => b.done).length}개 완료
                </p>
                <ul className="mt-3 space-y-1.5">
                  {planToday.slice(0, 6).map((b) => (
                    <li
                      key={b.id}
                      className="grid grid-cols-[44px_1fr_auto] items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm"
                    >
                      <span className="text-[11px] font-bold text-indigo-600">{ZONE_LABEL[b.zone]}</span>
                      <span className={`min-w-0 truncate ${b.done ? "text-neutral-400 line-through" : "text-neutral-800"}`}>
                        {b.title}
                      </span>
                      <span className="text-xs text-neutral-500">{b.startTime ?? ""}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}
