"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { hhmm, toIsoDate, type LessonLog } from "@/lib/planner/types";

const WEEKDAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"];

type Student = { academyId: string; name: string; grade: string | null };

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

const BLANK = {
  lesson_date: "",
  start_time: "",
  end_time: "",
  title: "학원 수업",
  status: "scheduled" as LessonLog["status"],
  plan_note: "",
  log_note: "",
  homework_note: "",
};

export default function LessonLogClient({
  students,
  initialStudent,
}: {
  students: Student[];
  initialStudent: string | null;
}) {
  const todayIso = toIsoDate(new Date());
  const [studentId, setStudentId] = useState(initialStudent ?? students[0]?.academyId ?? "");
  const [ym, setYm] = useState(todayIso.slice(0, 7));
  const [selected, setSelected] = useState(todayIso);
  const [lessons, setLessons] = useState<LessonLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [adding, setAdding] = useState(false);

  const [year, month0] = useMemo(() => {
    const [y, m] = ym.split("-").map(Number);
    return [y, m - 1];
  }, [ym]);
  const { cells, gridStartIso, gridEndIso } = useMemo(
    () => monthGrid(year, month0),
    [year, month0],
  );

  const reload = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const r = await fetch(
        `/api/teacher/lesson-logs?student=${studentId}&from=${gridStartIso}&to=${gridEndIso}`,
      );
      const j = await r.json();
      setLessons(Array.isArray(j.lessons) ? j.lessons : []);
    } finally {
      setLoading(false);
    }
  }, [studentId, gridStartIso, gridEndIso]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const byDate = useMemo(() => {
    const m = new Map<string, LessonLog[]>();
    for (const l of lessons) {
      const list = m.get(l.lesson_date) ?? [];
      list.push(l);
      m.set(l.lesson_date, list);
    }
    return m;
  }, [lessons]);

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month0 + delta, 1);
    setYm(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const save = async (method: "POST" | "PATCH", body: Record<string, unknown>) => {
    const r = await fetch("/api/teacher/lesson-logs", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      alert(j?.error ?? "저장 실패");
      return;
    }
    setEditing(null);
    setAdding(false);
    setForm({ ...BLANK });
    await reload();
  };

  const del = async (id: string) => {
    if (!confirm("이 수업 기록을 삭제할까요?")) return;
    await fetch(`/api/teacher/lesson-logs?id=${id}`, { method: "DELETE" });
    await reload();
  };

  const selLessons = byDate.get(selected) ?? [];

  return (
    <div className="space-y-4">
      <select
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
        className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
      >
        {students.map((s) => (
          <option key={s.academyId} value={s.academyId}>
            {s.name}
            {s.grade ? ` (${s.grade})` : ""}
          </option>
        ))}
      </select>

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
            {loading && <span className="ml-1 text-[11px] font-normal text-neutral-400">…</span>}
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
            const dayLessons = byDate.get(cell.dateIso) ?? [];
            return (
              <button
                key={cell.dateIso}
                onClick={() => setSelected(cell.dateIso)}
                className={[
                  "min-h-[54px] rounded-lg border px-1 py-1 text-left transition",
                  cell.inMonth ? "border-neutral-100 bg-white" : "border-neutral-50 bg-neutral-50",
                  cell.dateIso === todayIso ? "ring-1 ring-emerald-400" : "",
                  cell.dateIso === selected ? "ring-2 ring-blue-500" : "",
                ].join(" ")}
              >
                <span
                  className={`text-[11px] ${cell.inMonth ? "text-neutral-700" : "text-neutral-300"}`}
                >
                  {cell.day}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {dayLessons.slice(0, 2).map((l) => (
                    <div
                      key={l.id}
                      className={`truncate rounded px-1 py-0.5 text-[9px] font-medium ${
                        l.status === "done"
                          ? "bg-emerald-100 text-emerald-700"
                          : l.status === "canceled"
                            ? "bg-neutral-100 text-neutral-400 line-through"
                            : "bg-blue-100 text-blue-700"
                      }`}
                      title={l.title}
                    >
                      {l.title}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 선택일 상세 */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-800">{selected}</h3>
          <button
            onClick={() => {
              setAdding(true);
              setEditing(null);
              setForm({ ...BLANK, lesson_date: selected });
            }}
            className="rounded-lg border border-neutral-200 px-2.5 py-1 text-[11px] text-neutral-500 hover:bg-neutral-50"
          >
            ＋ 수업 추가
          </button>
        </div>

        {adding && (
          <LessonForm
            value={form}
            onChange={setForm}
            onSubmit={() => save("POST", { student_id: studentId, ...form })}
            onCancel={() => setAdding(false)}
          />
        )}

        <div className="space-y-2">
          {selLessons.length === 0 && !adding && (
            <p className="py-6 text-center text-xs text-neutral-400">이 날 수업 기록이 없습니다.</p>
          )}
          {selLessons.map((l) =>
            editing === l.id ? (
              <LessonForm
                key={l.id}
                value={form}
                onChange={setForm}
                onSubmit={() => save("PATCH", { id: l.id, ...form })}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div key={l.id} className="rounded-xl border border-neutral-100 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {l.start_time && (
                        <span className="text-[11px] font-semibold text-neutral-500">
                          {hhmm(l.start_time)}
                          {l.end_time && `–${hhmm(l.end_time)}`}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-medium ${
                          l.status === "done"
                            ? "text-emerald-600"
                            : l.status === "canceled"
                              ? "text-neutral-400"
                              : "text-blue-600"
                        }`}
                      >
                        {l.status === "done" ? "완료" : l.status === "canceled" ? "취소" : "예정"}
                      </span>
                      <span className="text-sm font-medium text-neutral-800">{l.title}</span>
                    </div>
                    {l.plan_note && (
                      <p className="mt-0.5 text-[11px] text-neutral-500">📋 {l.plan_note}</p>
                    )}
                    {l.log_note && (
                      <p className="mt-0.5 text-[11px] text-neutral-600">📝 {l.log_note}</p>
                    )}
                    {l.homework_note && (
                      <p className="mt-0.5 text-[11px] text-violet-600">✏️ {l.homework_note}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => {
                        setEditing(l.id);
                        setAdding(false);
                        setForm({
                          lesson_date: l.lesson_date,
                          start_time: hhmm(l.start_time),
                          end_time: hhmm(l.end_time),
                          title: l.title,
                          status: l.status,
                          plan_note: l.plan_note ?? "",
                          log_note: l.log_note ?? "",
                          homework_note: l.homework_note ?? "",
                        });
                      }}
                      className="rounded px-1.5 py-0.5 text-[10px] text-neutral-400 hover:bg-neutral-50"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => del(l.id)}
                      className="rounded px-1.5 py-0.5 text-[10px] text-rose-400 hover:bg-rose-50"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  );
}

function LessonForm({
  value,
  onChange,
  onSubmit,
  onCancel,
}: {
  value: typeof BLANK;
  onChange: (v: typeof BLANK) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const set = (patch: Partial<typeof BLANK>) => onChange({ ...value, ...patch });
  return (
    <div className="mb-2 space-y-2 rounded-xl border border-blue-200 bg-blue-50/40 p-3">
      <div className="flex flex-wrap gap-1.5">
        <input
          type="date"
          value={value.lesson_date}
          onChange={(e) => set({ lesson_date: e.target.value })}
          className="rounded border border-neutral-200 px-2 py-1 text-xs"
        />
        <input
          type="time"
          value={value.start_time}
          onChange={(e) => set({ start_time: e.target.value })}
          className="rounded border border-neutral-200 px-2 py-1 text-xs"
        />
        <input
          type="time"
          value={value.end_time}
          onChange={(e) => set({ end_time: e.target.value })}
          className="rounded border border-neutral-200 px-2 py-1 text-xs"
        />
        <select
          value={value.status}
          onChange={(e) => set({ status: e.target.value as LessonLog["status"] })}
          className="rounded border border-neutral-200 px-2 py-1 text-xs"
        >
          <option value="scheduled">예정</option>
          <option value="done">완료</option>
          <option value="canceled">취소</option>
        </select>
      </div>
      <input
        value={value.title}
        onChange={(e) => set({ title: e.target.value })}
        placeholder="수업 제목"
        className="w-full rounded border border-neutral-200 px-2 py-1 text-xs"
      />
      <textarea
        value={value.plan_note}
        onChange={(e) => set({ plan_note: e.target.value })}
        placeholder="📋 수업 계획 (수업 전)"
        rows={2}
        className="w-full rounded border border-neutral-200 px-2 py-1 text-xs"
      />
      <textarea
        value={value.log_note}
        onChange={(e) => set({ log_note: e.target.value })}
        placeholder="📝 수업 로그 (배운 내용)"
        rows={2}
        className="w-full rounded border border-neutral-200 px-2 py-1 text-xs"
      />
      <input
        value={value.homework_note}
        onChange={(e) => set({ homework_note: e.target.value })}
        placeholder="✏️ 숙제"
        className="w-full rounded border border-neutral-200 px-2 py-1 text-xs"
      />
      <div className="flex gap-1.5">
        <button
          disabled={!value.lesson_date}
          onClick={onSubmit}
          className="rounded-lg bg-blue-600 px-3 py-1 text-[11px] font-bold text-white disabled:opacity-40"
        >
          저장
        </button>
        <button onClick={onCancel} className="rounded-lg px-3 py-1 text-[11px] text-neutral-500">
          취소
        </button>
      </div>
    </div>
  );
}
