import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const WEEKDAY_MAP: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
  일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6,
  "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6,
};

const WEEKDAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"];

type EventKind = "toefl_exam" | "naesin_exam" | "exam" | "makeup" | "vacation" | "absence" | "other";

const EVENT_STYLE: Record<EventKind, string> = {
  toefl_exam: "bg-sky-100 text-sky-700",
  naesin_exam: "bg-emerald-100 text-emerald-700",
  exam: "bg-sky-100 text-sky-700",
  makeup: "bg-violet-100 text-violet-700",
  vacation: "bg-amber-100 text-amber-700",
  absence: "bg-rose-100 text-rose-700",
  other: "bg-neutral-100 text-neutral-600",
};

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function classDaysToWeekdaySet(classDays: string[] | null | undefined): Set<number> {
  const set = new Set<number>();
  for (const raw of classDays ?? []) {
    const dow = WEEKDAY_MAP[String(raw).toLowerCase()];
    if (dow !== undefined) set.add(dow);
  }
  return set;
}

async function tryResolveAcademyStudentId(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  authUserId: string,
): Promise<string | null> {
  for (const col of ["id", "auth_user_id", "user_id", "profile_id"] as const) {
    try {
      const { data } = await supabase
        .from("academy_students")
        .select("id")
        .eq(col as string, authUserId)
        .maybeSingle();
      if (data?.id) return String(data.id);
    } catch { /* ignore */ }
  }
  return null;
}

type DayEvent = { label: string; kind: EventKind };

export default async function StudentSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { month: monthParam } = await searchParams;
  const today = new Date();
  const [paramYear, paramMonth] = (monthParam ?? "").split("-").map(Number);
  const viewYear = Number.isFinite(paramYear) ? paramYear : today.getFullYear();
  const viewMonth = Number.isFinite(paramMonth) ? paramMonth - 1 : today.getMonth(); // 0-indexed

  const academyStudentId = await tryResolveAcademyStudentId(supabase, user.id);

  let classDays: string[] | null = null;
  if (academyStudentId) {
    const { data } = await supabase
      .from("academy_students")
      .select("class_days")
      .eq("id", academyStudentId)
      .maybeSingle();
    classDays = (data as any)?.class_days ?? null;
  }
  const classWeekdays = classDaysToWeekdaySet(classDays);

  // ── 그리드 범위 (6주 × 7일) ─────────────────────────────────
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay());
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridEnd.getDate() + 41);
  const gridStartIso = toIsoDate(gridStart);
  const gridEndIso = toIsoDate(gridEnd);

  // ── 이벤트 (그리드 범위 내) ────────────────────────────────
  const eventsByDate = new Map<string, DayEvent[]>();
  const addEvent = (dateIso: string | null | undefined, ev: DayEvent) => {
    if (!dateIso) return;
    const list = eventsByDate.get(dateIso) ?? [];
    list.push(ev);
    eventsByDate.set(dateIso, list);
  };
  // 정규 수업이 취소된 날짜(메이크업으로 대체되었거나 결석 처리된 날짜) — 캘린더에서 수업일 점을 숨긴다.
  const cancelledClassDates = new Set<string>();

  const queries: PromiseLike<void>[] = [];

  if (academyStudentId) {
    queries.push(
      supabase
        .from("test_assignments")
        .select("exam_date")
        .eq("student_id", academyStudentId)
        .gte("exam_date", gridStartIso)
        .lte("exam_date", gridEndIso)
        .then(({ data }) => {
          for (const row of data ?? []) {
            addEvent((row as any).exam_date, { label: "TOEFL 모의고사", kind: "toefl_exam" });
          }
        })
    );

    queries.push(
      supabase
        .from("calendar_events")
        .select("event_type, title, event_date, replaces_date")
        .eq("student_id", academyStudentId)
        .gte("event_date", gridStartIso)
        .lte("event_date", gridEndIso)
        .then(({ data }) => {
          for (const row of data ?? []) {
            const r = row as any;
            addEvent(r.event_date, { label: r.title, kind: r.event_type as EventKind });
            if (r.event_type === "makeup" && r.replaces_date) cancelledClassDates.add(r.replaces_date);
            if (r.event_type === "absence") cancelledClassDates.add(r.event_date);
          }
        })
    );
  }

  queries.push(
    supabase
      .from("naesin_exam_schedule")
      .select("exam_name, exam_date")
      .eq("student_id", user.id)
      .gte("exam_date", gridStartIso)
      .lte("exam_date", gridEndIso)
      .then(({ data }) => {
        for (const row of data ?? []) {
          addEvent((row as any).exam_date, { label: (row as any).exam_name || "내신 시험", kind: "naesin_exam" });
        }
      })
  );

  await Promise.all(queries);

  // ── 다음 시험 D-day (그리드 범위와 무관하게 가장 가까운 미래 시험) ─
  const todayIso = toIsoDate(today);

  const [{ data: nextToefl }, { data: nextNaesin }, { data: nextCalendarExam }] = await Promise.all([
    academyStudentId
      ? supabase
          .from("test_assignments")
          .select("exam_date")
          .eq("student_id", academyStudentId)
          .gte("exam_date", todayIso)
          .order("exam_date", { ascending: true })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("naesin_exam_schedule")
      .select("exam_name, exam_date")
      .eq("student_id", user.id)
      .gte("exam_date", todayIso)
      .order("exam_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    academyStudentId
      ? supabase
          .from("calendar_events")
          .select("title, event_date")
          .eq("student_id", academyStudentId)
          .eq("event_type", "exam")
          .gte("event_date", todayIso)
          .order("event_date", { ascending: true })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const candidates: { date: string; label: string }[] = [];
  if ((nextToefl as any)?.exam_date) candidates.push({ date: (nextToefl as any).exam_date, label: "TOEFL 모의고사" });
  if ((nextNaesin as any)?.exam_date) candidates.push({ date: (nextNaesin as any).exam_date, label: (nextNaesin as any).exam_name || "내신 시험" });
  if ((nextCalendarExam as any)?.event_date) candidates.push({ date: (nextCalendarExam as any).event_date, label: (nextCalendarExam as any).title });
  candidates.sort((a, b) => a.date.localeCompare(b.date));
  const nextExam = candidates[0] ?? null;

  const dDay = nextExam
    ? Math.ceil((new Date(nextExam.date).getTime() - new Date(todayIso).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // ── 그리드 셀 구성 ───────────────────────────────────────────
  const cells: {
    dateIso: string;
    day: number;
    inMonth: boolean;
    isToday: boolean;
    isClassDay: boolean;
    events: DayEvent[];
  }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    const dateIso = toIsoDate(d);
    cells.push({
      dateIso,
      day: d.getDate(),
      inMonth: d.getMonth() === viewMonth,
      isToday: dateIso === todayIso,
      isClassDay: classWeekdays.has(d.getDay()) && !cancelledClassDates.has(dateIso),
      events: eventsByDate.get(dateIso) ?? [],
    });
  }

  const prevMonthDate = new Date(viewYear, viewMonth - 1, 1);
  const nextMonthDate = new Date(viewYear, viewMonth + 1, 1);
  const prevMonthHref = `/student/schedule?month=${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const nextMonthHref = `/student/schedule?month=${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = `${viewYear}년 ${viewMonth + 1}월`;

  return (
    <main className="mx-auto max-w-3xl space-y-6 pb-12">
      <header>
        <h1 className="text-xl font-bold text-neutral-900">내 스케줄</h1>
        <p className="text-xs text-neutral-400 mt-0.5">수업일과 시험 일정을 한눈에 확인하세요.</p>
      </header>

      {nextExam && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">다음 시험</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">D-</span>
            <span className="text-3xl font-bold text-amber-700">{dDay}</span>
            <span className="text-sm text-amber-700 ml-1">{nextExam.label}</span>
          </div>
          <p className="text-xs text-amber-600 mt-2">
            {new Date(nextExam.date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
          </p>
        </div>
      )}

      <section className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <Link href={prevMonthHref} className="text-xs text-neutral-400 hover:text-neutral-700 px-2 py-1">← 이전</Link>
          <h2 className="text-sm font-bold text-neutral-800">{monthLabel}</h2>
          <Link href={nextMonthHref} className="text-xs text-neutral-400 hover:text-neutral-700 px-2 py-1">다음 →</Link>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAY_LABEL.map((label, i) => (
            <div
              key={label}
              className={`text-center text-[11px] font-semibold py-1 ${i === 0 ? "text-rose-500" : i === 6 ? "text-sky-600" : "text-neutral-400"}`}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => (
            <div
              key={cell.dateIso}
              className={[
                "min-h-[64px] rounded-lg border px-1.5 py-1 text-left",
                cell.inMonth ? "bg-white border-neutral-100" : "bg-neutral-50 border-neutral-50",
                cell.isToday ? "ring-2 ring-emerald-400" : "",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] ${cell.inMonth ? "text-neutral-700" : "text-neutral-300"}`}>{cell.day}</span>
                {cell.isClassDay && cell.inMonth && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="수업일" />
                )}
              </div>
              <div className="mt-1 space-y-0.5">
                {cell.events.map((ev, i) => (
                  <div
                    key={i}
                    className={["truncate rounded px-1 py-0.5 text-[9px] font-medium", EVENT_STYLE[ev.kind]].join(" ")}
                    title={ev.label}
                  >
                    {ev.label}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-neutral-400">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" /> 수업일</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-sky-100 inline-block" /> 시험</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-violet-100 inline-block" /> 메이크업</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-amber-100 inline-block" /> 휴가</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-rose-100 inline-block" /> 결석</span>
        </div>
      </section>
    </main>
  );
}
