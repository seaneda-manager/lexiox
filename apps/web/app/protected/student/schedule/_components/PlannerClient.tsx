"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BLOCK_KIND_META,
  EXAM_TYPE_LABEL,
  SLOT_KIND_LABEL,
  ZONE_EMOJI,
  ZONE_LABEL,
  hhmm,
  toIsoDate,
  type DayBlock,
  type LessonLog,
  type PlannerZone,
  type RoutineSlot,
  type StudentExam,
} from "@/lib/planner/types";
import RoutineEditor from "./RoutineEditor";
import ExamPanel from "./ExamPanel";

const WEEKDAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"];

type Assignment = {
  id: string;
  kind: string;
  title: string;
  subject?: string;
  date: string;
  status: string;
};

type PlannerData = {
  blocks: DayBlock[];
  routineSlots: RoutineSlot[];
  exams: StudentExam[];
  lessons: LessonLog[];
  assignments: Assignment[];
};

const EMPTY: PlannerData = {
  blocks: [],
  routineSlots: [],
  exams: [],
  lessons: [],
  assignments: [],
};

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
  return Math.ceil(
    (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000,
  );
}

export default function PlannerClient() {
  const todayIso = toIsoDate(new Date());
  const [tab, setTab] = useState<"calendar" | "routine" | "exams">("calendar");
  const [ym, setYm] = useState(todayIso.slice(0, 7));
  const [selected, setSelected] = useState(todayIso);
  const [data, setData] = useState<PlannerData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [year, month0] = useMemo(() => {
    const [y, m] = ym.split("-").map(Number);
    return [y, m - 1];
  }, [ym]);
  const { cells, gridStartIso, gridEndIso } = useMemo(
    () => monthGrid(year, month0),
    [year, month0],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, eRes] = await Promise.all([
        fetch(`/api/student/planner?from=${gridStartIso}&to=${gridEndIso}`).then((r) => r.json()),
        fetch(`/api/student/planner/exams`).then((r) => r.json()),
      ]);
      setData({
        blocks: Array.isArray(pRes.blocks) ? pRes.blocks : [],
        routineSlots: Array.isArray(pRes.routineSlots) ? pRes.routineSlots : [],
        lessons: Array.isArray(pRes.lessons) ? pRes.lessons : [],
        assignments: Array.isArray(pRes.assignments) ? pRes.assignments : [],
        exams: Array.isArray(eRes.exams) ? eRes.exams : Array.isArray(pRes.exams) ? pRes.exams : [],
      });
    } catch {
      /* keep prior */
    } finally {
      setLoading(false);
    }
  }, [gridStartIso, gridEndIso]);

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

  const assignByDate = useMemo(() => {
    const m = new Map<string, Assignment[]>();
    for (const a of data.assignments) {
      const list = m.get(a.date) ?? [];
      list.push(a);
      m.set(a.date, list);
    }
    return m;
  }, [data.assignments]);

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

  // 다가오는 시험 D-day
  const nextExam = useMemo(() => {
    const upcoming = data.exams
      .filter((e) => e.end_date >= todayIso)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
    return upcoming[0] ?? null;
  }, [data.exams, todayIso]);

  // ── 블록 mutations ────────────────────────────────────────────
  const mutateBlock = async (method: "POST" | "PATCH", body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const r = await fetch("/api/student/planner", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) alert((await r.json().catch(() => ({})))?.error ?? "실패했어요");
      await reload();
    } finally {
      setBusy(false);
    }
  };
  const deleteBlock = async (id: string) => {
    if (!confirm("이 항목을 삭제할까요?")) return;
    setBusy(true);
    try {
      await fetch(`/api/student/planner?id=${id}`, { method: "DELETE" });
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const selWeekday = new Date(selected).getDay();
  const selBlocks = blocksByDate.get(selected) ?? [];
  const selAssignments = assignByDate.get(selected) ?? [];
  const selLessons = lessonsByDate.get(selected) ?? [];
  const selExams = examsOnDate(selected);
  const routineFor = (zone: PlannerZone) =>
    data.routineSlots
      .filter((s) => s.zone === zone && s.weekday === selWeekday)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="space-y-5">
      {/* D-day */}
      {nextExam && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-amber-700">
            다음 시험
          </p>
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

      {/* 탭 */}
      <div className="flex gap-1 rounded-xl bg-neutral-100 p-1 text-xs font-medium">
        {(
          [
            ["calendar", "📅 캘린더"],
            ["routine", "🔁 주간 루틴"],
            ["exams", "📝 내 시험"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 rounded-lg px-3 py-1.5 transition ${
              tab === k ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "routine" && (
        <RoutineEditor slots={data.routineSlots} onSaved={reload} />
      )}

      {tab === "exams" && (
        <ExamPanel exams={data.exams} onChanged={reload} />
      )}

      {tab === "calendar" && (
        <>
          {/* 월 그리드 */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <button
                onClick={() => shiftMonth(-1)}
                className="px-2 py-1 text-xs text-neutral-400 hover:text-neutral-700"
              >
                ← 이전
              </button>
              <h2 className="text-sm font-bold text-neutral-800">
                {year}년 {month0 + 1}월
                {loading && (
                  <span className="ml-1 text-[11px] font-normal text-neutral-400">불러오는 중…</span>
                )}
              </h2>
              <button
                onClick={() => shiftMonth(1)}
                className="px-2 py-1 text-xs text-neutral-400 hover:text-neutral-700"
              >
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
                const hasAssign = (assignByDate.get(cell.dateIso) ?? []).length > 0;
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
                      <span
                        className={`text-[11px] ${cell.inMonth ? "text-neutral-700" : "text-neutral-300"}`}
                      >
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
                      {(zones.size > 0 || hasAssign) && (
                        <div className="flex items-center gap-0.5 pt-0.5">
                          {(["school", "academy", "home"] as PlannerZone[]).map(
                            (z) =>
                              zones.has(z) && (
                                <span key={z} className="text-[9px] leading-none">
                                  {ZONE_EMOJI[z]}
                                </span>
                              ),
                          )}
                          {hasAssign && (
                            <span
                              className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400"
                              title="배정된 과제"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 선택일 상세 — 3 레인 */}
          <DayPanel
            dateIso={selected}
            weekdayLabel={WEEKDAY_LABEL[selWeekday]}
            blocks={selBlocks}
            assignments={selAssignments}
            lessons={selLessons}
            exams={selExams}
            routineFor={routineFor}
            busy={busy}
            onAdd={(body) => mutateBlock("POST", { ...body, block_date: selected })}
            onToggle={(b) => mutateBlock("PATCH", { id: b.id, done: !b.done })}
            onEdit={(id, body) => mutateBlock("PATCH", { id, ...body })}
            onDelete={deleteBlock}
          />
        </>
      )}
    </div>
  );
}

// ── 선택일 상세 패널 ───────────────────────────────────────────────
function DayPanel({
  dateIso,
  weekdayLabel,
  blocks,
  assignments,
  lessons,
  exams,
  routineFor,
  busy,
  onAdd,
  onToggle,
  onEdit,
  onDelete,
}: {
  dateIso: string;
  weekdayLabel: string;
  blocks: DayBlock[];
  assignments: Assignment[];
  lessons: LessonLog[];
  exams: StudentExam[];
  routineFor: (z: PlannerZone) => RoutineSlot[];
  busy: boolean;
  onAdd: (body: Record<string, unknown>) => void;
  onToggle: (b: DayBlock) => void;
  onEdit: (id: string, body: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}) {
  const [addZone, setAddZone] = useState<PlannerZone | null>(null);

  const lanes: PlannerZone[] = ["school", "academy", "home"];

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-bold text-neutral-800">
        {dateIso} <span className="font-normal text-neutral-400">({weekdayLabel})</span>
      </h3>

      {exams.length > 0 && (
        <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
          🔥 시험일 — {exams.map((e) => e.title).join(", ")}
        </div>
      )}

      <div className="space-y-4">
        {lanes.map((zone) => {
          const laneBlocks = blocks
            .filter((b) => b.zone === zone)
            .sort((a, b) => (a.start_time ?? "99").localeCompare(b.start_time ?? "99"));
          const slots = routineFor(zone as PlannerZone);
          return (
            <div key={zone} className="rounded-xl border border-neutral-100">
              <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2">
                <span className="text-xs font-bold text-neutral-700">
                  {ZONE_EMOJI[zone]} {ZONE_LABEL[zone]}
                </span>
                {zone !== "academy" && (
                  <button
                    onClick={() => setAddZone(addZone === zone ? null : zone)}
                    className="rounded-lg border border-neutral-200 px-2 py-0.5 text-[11px] text-neutral-500 hover:bg-neutral-50"
                  >
                    ＋ 추가
                  </button>
                )}
              </div>

              <div className="space-y-1.5 px-3 py-2">
                {/* 학교/집 가용 시간 (루틴) */}
                {zone !== "academy" && slots.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {slots.map((s) => (
                      <span
                        key={s.id}
                        className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500"
                      >
                        {hhmm(s.start_time)}–{hhmm(s.end_time)}{" "}
                        {s.label || SLOT_KIND_LABEL[s.kind] || s.kind}
                      </span>
                    ))}
                  </div>
                )}

                {zone === "academy" && (
                  <>
                    {lessons.length === 0 && laneBlocks.length === 0 && (
                      <p className="py-2 text-center text-[11px] text-neutral-400">
                        🎓 선생님이 학원 수업 일정을 입력하면 여기에 표시돼요.
                      </p>
                    )}
                    {lessons.map((l) => (
                      <LessonRow key={l.id} lesson={l} />
                    ))}
                  </>
                )}

                {laneBlocks.map((b) => (
                  <BlockRow
                    key={b.id}
                    block={b}
                    onToggle={() => onToggle(b)}
                    onEdit={(body) => onEdit(b.id, body)}
                    onDelete={() => onDelete(b.id)}
                  />
                ))}

                {addZone === zone && (
                  <AddBlockForm
                    zone={zone}
                    busy={busy}
                    onSubmit={(body) => {
                      onAdd(body);
                      setAddZone(null);
                    }}
                    onCancel={() => setAddZone(null)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 배정 오버레이 */}
      {assignments.length > 0 && (
        <div className="mt-4 border-t border-neutral-100 pt-3">
          <p className="mb-2 text-[11px] font-bold text-neutral-400">선생님이 배정한 과제</p>
          <div className="space-y-1">
            {assignments.map((a) => (
              <div
                key={`${a.kind}:${a.id}`}
                className="flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-1.5 text-[11px] text-violet-700"
              >
                <span className="font-medium">{a.title}</span>
                {a.status === "completed" || a.status === "graded" ? (
                  <span className="text-emerald-600">✓ 완료</span>
                ) : a.status === "overdue" ? (
                  <span className="text-rose-500">기한 초과</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
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
      {lesson.plan_note && (
        <p className="mt-0.5 text-[11px] text-neutral-500">📋 {lesson.plan_note}</p>
      )}
      {lesson.log_note && (
        <p className="mt-0.5 text-[11px] text-neutral-600">📝 {lesson.log_note}</p>
      )}
      {lesson.homework_note && (
        <p className="mt-0.5 text-[11px] text-violet-600">✏️ 숙제: {lesson.homework_note}</p>
      )}
    </div>
  );
}

function BlockRow({
  block,
  onToggle,
  onEdit,
  onDelete,
}: {
  block: DayBlock;
  onToggle: () => void;
  onEdit: (body: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const meta = BLOCK_KIND_META[block.kind] ?? { label: block.kind, color: "bg-neutral-100 text-neutral-600" };

  if (editing) {
    return (
      <InlineEdit
        block={block}
        onCancel={() => setEditing(false)}
        onSave={(body) => {
          onEdit(body);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-neutral-100 px-2.5 py-1.5">
      <button
        onClick={onToggle}
        className={`mt-0.5 h-4 w-4 shrink-0 rounded border ${
          block.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-neutral-300"
        }`}
        aria-label="완료"
      >
        {block.done ? "✓" : ""}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {block.start_time && (
            <span className="text-[11px] font-semibold text-neutral-500">
              {hhmm(block.start_time)}
              {block.end_time && `–${hhmm(block.end_time)}`}
            </span>
          )}
          <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${meta.color}`}>
            {meta.label}
          </span>
          {block.subject && (
            <span className="text-[10px] text-neutral-400">{block.subject}</span>
          )}
          {block.source === "preset" && (
            <span className="text-[9px] text-amber-500">자동생성</span>
          )}
        </div>
        <p
          className={`truncate text-sm ${block.done ? "text-neutral-300 line-through" : "text-neutral-800"}`}
        >
          {block.title}
        </p>
        {block.note && <p className="truncate text-[10px] text-neutral-400">{block.note}</p>}
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          onClick={() => setEditing(true)}
          className="rounded px-1.5 py-0.5 text-[10px] text-neutral-400 hover:bg-neutral-50"
        >
          수정
        </button>
        <button
          onClick={onDelete}
          className="rounded px-1.5 py-0.5 text-[10px] text-rose-400 hover:bg-rose-50"
        >
          삭제
        </button>
      </div>
    </div>
  );
}

function InlineEdit({
  block,
  onSave,
  onCancel,
}: {
  block: DayBlock;
  onSave: (body: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(block.title);
  const [start, setStart] = useState(hhmm(block.start_time));
  const [end, setEnd] = useState(hhmm(block.end_time));
  const [note, setNote] = useState(block.note ?? "");
  return (
    <div className="space-y-1.5 rounded-lg border border-blue-200 bg-blue-50/40 p-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded border border-neutral-200 px-2 py-1 text-xs"
        placeholder="제목"
      />
      <div className="flex gap-1.5">
        <input
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="rounded border border-neutral-200 px-2 py-1 text-xs"
        />
        <input
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="rounded border border-neutral-200 px-2 py-1 text-xs"
        />
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full rounded border border-neutral-200 px-2 py-1 text-xs"
        placeholder="메모"
      />
      <div className="flex gap-1.5">
        <button
          onClick={() =>
            onSave({
              title,
              start_time: start || null,
              end_time: end || null,
              note: note || null,
            })
          }
          className="rounded bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white"
        >
          저장
        </button>
        <button onClick={onCancel} className="rounded px-2.5 py-1 text-[11px] text-neutral-500">
          취소
        </button>
      </div>
    </div>
  );
}

function AddBlockForm({
  zone,
  busy,
  onSubmit,
  onCancel,
}: {
  zone: PlannerZone;
  busy: boolean;
  onSubmit: (body: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const kinds =
    zone === "home"
      ? ["study", "homework", "review", "meal", "rest", "memo"]
      : ["study", "review", "test_prep", "memo"];
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState(kinds[0]);
  const [subject, setSubject] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="space-y-1.5 rounded-lg border border-blue-200 bg-blue-50/40 p-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded border border-neutral-200 px-2 py-1 text-xs"
        placeholder="무엇을 할까요? (예: 영어 본문 1회독)"
        autoFocus
      />
      <div className="flex flex-wrap gap-1.5">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="rounded border border-neutral-200 px-2 py-1 text-xs"
        >
          {kinds.map((k) => (
            <option key={k} value={k}>
              {BLOCK_KIND_META[k]?.label ?? k}
            </option>
          ))}
        </select>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-24 rounded border border-neutral-200 px-2 py-1 text-xs"
          placeholder="과목"
        />
        <input
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="rounded border border-neutral-200 px-2 py-1 text-xs"
        />
        <input
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="rounded border border-neutral-200 px-2 py-1 text-xs"
        />
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full rounded border border-neutral-200 px-2 py-1 text-xs"
        placeholder="메모 (선택)"
      />
      <div className="flex gap-1.5">
        <button
          disabled={busy || !title.trim()}
          onClick={() =>
            onSubmit({
              zone,
              kind,
              title: title.trim(),
              subject: subject.trim() || null,
              start_time: start || null,
              end_time: end || null,
              note: note.trim() || null,
            })
          }
          className="rounded bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-40"
        >
          추가
        </button>
        <button onClick={onCancel} className="rounded px-2.5 py-1 text-[11px] text-neutral-500">
          취소
        </button>
      </div>
    </div>
  );
}
