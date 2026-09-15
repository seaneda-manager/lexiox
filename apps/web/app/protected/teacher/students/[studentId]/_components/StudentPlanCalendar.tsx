"use client";

// Read-only mirror of the student's own /student/schedule calendar
// (PlannerClient.tsx), for teacher/admin visibility only — no mutations here
// on purpose, the plan stays student-authored. Block rendering (kind badges,
// concept/practice/assessment sub-checks, weakness note) intentionally
// matches the student view so a future Phase 2 (AI-generated "필수"
// checklist items) slots into the same structure without a rebuild here.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BLOCK_KIND_META,
  EXAM_TYPE_LABEL,
  STUDY_TYPE_KINDS,
  ZONE_EMOJI,
  ZONE_LABEL,
  hhmm,
  toIsoDate,
  type DayBlock,
  type LessonLog,
  type PlannerZone,
  type StudentExam,
} from "@/lib/planner/types";

const WEEKDAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"];
const CHECKIN_KIND_SET = new Set<string>(STUDY_TYPE_KINDS as readonly string[]);

type PlannerData = {
  blocks: DayBlock[];
  exams: StudentExam[];
  lessons: LessonLog[];
};

const EMPTY: PlannerData = { blocks: [], exams: [], lessons: [] };

function monthGrid(year: number, month0: number) {
  const first = new Date(year, month0, 1);
  const gridStart = new Date(first);
  gridStart.setDate(gridStart.getDate() - first.getDay());
  const cells: { dateIso: string; day: number; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    cells.push({ dateIso: toIsoDate(d), day: d.getDate(), inMonth: d.getMonth() === month0 });
  }
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridEnd.getDate() + 41);
  return { cells, gridStartIso: toIsoDate(gridStart), gridEndIso: toIsoDate(gridEnd) };
}

function dDay(fromIso: string, toIso: string): number {
  return Math.ceil((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000);
}

export default function StudentPlanCalendar({ studentId }: { studentId: string }) {
  const todayIso = toIsoDate(new Date());
  const [ym, setYm] = useState(todayIso.slice(0, 7));
  const [selected, setSelected] = useState(todayIso);
  const [data, setData] = useState<PlannerData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [year, month0] = useMemo(() => {
    const [y, m] = ym.split("-").map(Number);
    return [y, m - 1];
  }, [ym]);
  const { cells, gridStartIso, gridEndIso } = useMemo(() => monthGrid(year, month0), [year, month0]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/teacher/students/${studentId}/planner?from=${gridStartIso}&to=${gridEndIso}`,
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "불러오지 못했습니다.");
        setData(EMPTY);
        return;
      }
      setData({
        blocks: Array.isArray(json.blocks) ? json.blocks : [],
        exams: Array.isArray(json.exams) ? json.exams : [],
        lessons: Array.isArray(json.lessons) ? json.lessons : [],
      });
    } catch {
      setError("불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [studentId, gridStartIso, gridEndIso]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month0 + delta, 1);
    setYm(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const blocksByDate = useMemo(() => {
    const m = new Map<string, DayBlock[]>();
    for (const b of data.blocks) {
      const list = m.get(b.block_date) ?? [];
      list.push(b);
      m.set(b.block_date, list);
    }
    return m;
  }, [data.blocks]);

  const lessonsByDate = useMemo(() => {
    const m = new Map<string, LessonLog[]>();
    for (const l of data.lessons) {
      const list = m.get(l.lesson_date) ?? [];
      list.push(l);
      m.set(l.lesson_date, list);
    }
    return m;
  }, [data.lessons]);

  const examsOnDate = useCallback(
    (iso: string) => data.exams.filter((e) => e.start_date <= iso && iso <= e.end_date),
    [data.exams],
  );

  const nextExam = useMemo(() => {
    const upcoming = data.exams
      .filter((e) => e.end_date >= todayIso)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
    return upcoming[0] ?? null;
  }, [data.exams, todayIso]);

  if (error) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>;
  }

  const selWeekday = new Date(selected).getDay();
  const selBlocks = blocksByDate.get(selected) ?? [];
  const selLessons = lessonsByDate.get(selected) ?? [];
  const selExams = examsOnDate(selected);
  const lanes: PlannerZone[] = ["school", "academy", "home"];

  return (
    <div className="space-y-4">
      {nextExam && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-amber-700">다음 시험</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">
              D-{Math.max(0, dDay(todayIso, nextExam.start_date))}
            </span>
            <span className="text-sm text-amber-700">{nextExam.title}</span>
          </div>
          <p className="mt-1 text-[11px] text-amber-600">
            {nextExam.start_date}
            {nextExam.end_date !== nextExam.start_date && ` ~ ${nextExam.end_date}`} ·{" "}
            {EXAM_TYPE_LABEL[nextExam.exam_type]}
          </p>
        </div>
      )}

      <section className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => shiftMonth(-1)} className="px-2 py-1 text-xs text-neutral-400 hover:text-neutral-700">
            ← 이전
          </button>
          <h2 className="text-sm font-bold text-neutral-800">
            {year}년 {month0 + 1}월
            {loading && <span className="ml-1 text-[11px] font-normal text-neutral-400">불러오는 중…</span>}
          </h2>
          <button onClick={() => shiftMonth(1)} className="px-2 py-1 text-xs text-neutral-400 hover:text-neutral-700">
            다음 →
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAY_LABEL.map((label, i) => (
            <div
              key={label}
              className={`py-1 text-center text-[11px] font-semibold ${
                i === 0 ? "text-rose-500" : i === 6 ? "text-sky-600" : "text-neutral-400"
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const dayBlocks = blocksByDate.get(cell.dateIso) ?? [];
            const doneCount = dayBlocks.filter((b) => b.done).length;
            const dayExams = examsOnDate(cell.dateIso);
            const zones = new Set<PlannerZone>(dayBlocks.map((b) => b.zone));
            if ((lessonsByDate.get(cell.dateIso) ?? []).length > 0) zones.add("academy");
            return (
              <button
                key={cell.dateIso}
                onClick={() => setSelected(cell.dateIso)}
                className={[
                  "min-h-[62px] rounded-lg border px-1 py-1 text-left transition",
                  cell.inMonth ? "border-neutral-100 bg-white" : "border-neutral-50 bg-neutral-50",
                  cell.dateIso === todayIso ? "ring-1 ring-emerald-400" : "",
                  cell.dateIso === selected ? "ring-2 ring-blue-500" : "",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] ${cell.inMonth ? "text-neutral-700" : "text-neutral-300"}`}>
                    {cell.day}
                  </span>
                  {dayBlocks.length > 0 && (
                    <span className="text-[9px] font-semibold text-neutral-400">
                      {doneCount}/{dayBlocks.length}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 space-y-0.5">
                  {dayExams.slice(0, 1).map((e) => (
                    <div
                      key={e.id}
                      className="truncate rounded bg-amber-100 px-1 py-0.5 text-[9px] font-medium text-amber-700"
                      title={e.title}
                    >
                      {e.title}
                    </div>
                  ))}
                  {zones.size > 0 && (
                    <div className="flex items-center gap-0.5 pt-0.5">
                      {(["school", "academy", "home"] as PlannerZone[]).map(
                        (z) => zones.has(z) && (
                          <span key={z} className="text-[9px] leading-none">
                            {ZONE_EMOJI[z]}
                          </span>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-bold text-neutral-800">
          {selected} <span className="font-normal text-neutral-400">({WEEKDAY_LABEL[selWeekday]})</span>
        </h3>

        {selExams.length > 0 && (
          <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
            🔥 시험일 — {selExams.map((e) => e.title).join(", ")}
          </div>
        )}

        <div className="space-y-4">
          {lanes.map((zone) => {
            const laneBlocks = selBlocks
              .filter((b) => b.zone === zone)
              .sort((a, b) => (a.start_time ?? "99").localeCompare(b.start_time ?? "99"));
            return (
              <div key={zone} className="rounded-xl border border-neutral-100">
                <div className="border-b border-neutral-100 px-3 py-2">
                  <span className="text-xs font-bold text-neutral-700">
                    {ZONE_EMOJI[zone]} {ZONE_LABEL[zone]}
                  </span>
                </div>
                <div className="space-y-1.5 px-3 py-2">
                  {zone === "academy" &&
                    selLessons.map((l) => <LessonRow key={l.id} lesson={l} />)}
                  {laneBlocks.length === 0 && zone !== "academy" ? (
                    <p className="py-1 text-center text-[11px] text-neutral-300">계획 없음</p>
                  ) : (
                    laneBlocks.map((b) => <ReadOnlyBlockRow key={b.id} block={b} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function LessonRow({ lesson }: { lesson: LessonLog }) {
  const statusMeta =
    lesson.status === "done"
      ? { label: "완료", color: "text-emerald-600" }
      : lesson.status === "canceled"
        ? { label: "취소", color: "text-neutral-400" }
        : { label: "예정", color: "text-blue-600" };
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/40 px-2.5 py-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {lesson.start_time && (
          <span className="text-[11px] font-semibold text-neutral-500">
            {hhmm(lesson.start_time)}
            {lesson.end_time && `–${hhmm(lesson.end_time)}`}
          </span>
        )}
        <span className={`text-[10px] font-medium ${statusMeta.color}`}>{statusMeta.label}</span>
        <span className="text-sm text-neutral-800">{lesson.title}</span>
      </div>
      {lesson.plan_note && <p className="mt-0.5 text-[11px] text-neutral-500">📋 {lesson.plan_note}</p>}
      {lesson.log_note && <p className="mt-0.5 text-[11px] text-neutral-600">📝 {lesson.log_note}</p>}
      {lesson.homework_note && (
        <p className="mt-0.5 text-[11px] text-violet-600">✏️ 숙제: {lesson.homework_note}</p>
      )}
    </div>
  );
}

function ReadOnlyBlockRow({ block }: { block: DayBlock }) {
  const meta = BLOCK_KIND_META[block.kind] ?? { label: block.kind, color: "bg-neutral-100 text-neutral-600" };
  const isCheckin = CHECKIN_KIND_SET.has(block.kind) && !!block.subject;

  return (
    <div className="rounded-lg border border-neutral-100 px-2.5 py-1.5">
      <div className="flex items-start gap-2">
        {isCheckin ? (
          <div className="mt-0.5 flex shrink-0 gap-0.5">
            {(
              [
                ["concept_done", "개"],
                ["practice_done", "연"],
                ["assessment_done", "평"],
              ] as const
            ).map(([field, label]) => (
              <span
                key={field}
                className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${
                  block[field]
                    ? "border border-emerald-500 bg-emerald-500 text-white"
                    : "border border-neutral-200 text-neutral-300"
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        ) : (
          <span
            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
              block.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-neutral-300"
            }`}
          >
            {block.done ? "✓" : ""}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {block.start_time && (
              <span className="text-[11px] font-semibold text-neutral-500">
                {hhmm(block.start_time)}
                {block.end_time && `–${hhmm(block.end_time)}`}
              </span>
            )}
            <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${meta.color}`}>{meta.label}</span>
            {block.subject && <span className="text-[10px] text-neutral-400">{block.subject}</span>}
            {block.source !== "student" && (
              <span className="text-[9px] text-amber-500">
                {block.source === "preset" ? "자동생성" : "선생님"}
              </span>
            )}
          </div>
          <p className={`truncate text-sm ${block.done ? "text-neutral-300 line-through" : "text-neutral-800"}`}>
            {block.title}
          </p>
          {block.note && <p className="truncate text-[10px] text-neutral-400">{block.note}</p>}
        </div>
      </div>
      {block.weakness_note && (
        <div className="mt-1 ml-[52px] rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
          💭 {block.weakness_note}
        </div>
      )}
    </div>
  );
}
