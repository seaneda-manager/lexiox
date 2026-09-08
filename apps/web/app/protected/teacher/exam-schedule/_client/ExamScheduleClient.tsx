"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EXAM_TYPE_LABEL,
  SUBJECT_CHIPS,
  toIsoDate,
  type ExamType,
} from "@/lib/planner/types";
import { PRESET_LIST } from "@/lib/planner/presets";

type Student = {
  academyId: string;
  name: string;
  grade: string | null;
  school: string | null;
};

type Batch = {
  batchId: string;
  exam_type: ExamType;
  title: string;
  subjects: string[];
  start_date: string;
  end_date: string;
  prep_start_date: string;
  preset_key: string | null;
  created_at: string;
  students: { academyId: string; name: string }[];
};

const EXAM_TYPE_ENTRIES = Object.entries(EXAM_TYPE_LABEL) as [ExamType, string][];

function emptyForm(todayIso: string) {
  return {
    exam_type: "naesin_midterm" as ExamType,
    title: "",
    subjects: [] as string[],
    start_date: todayIso,
    end_date: todayIso,
    preset_key: "standard",
    auto_prep: true,
  };
}

export default function ExamScheduleClient({ students }: { students: Student[] }) {
  const todayIso = toIsoDate(new Date());
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [form, setForm] = useState(emptyForm(todayIso));
  const [batches, setBatches] = useState<Batch[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const grades = useMemo(
    () => [...new Set(students.map((s) => s.grade).filter(Boolean))] as string[],
    [students],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/teacher/exam-schedule");
      const j = await r.json();
      setBatches(Array.isArray(j.batches) ? j.batches : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleGrade = (grade: string) => {
    const ids = students.filter((s) => s.grade === grade).map((s) => s.academyId);
    setPicked((prev) => {
      const next = new Set(prev);
      const allIn = ids.every((id) => next.has(id));
      for (const id of ids) {
        if (allIn) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  const setF = (patch: Partial<ReturnType<typeof emptyForm>>) =>
    setForm((f) => ({ ...f, ...patch }));
  const toggleSubject = (s: string) =>
    setForm((f) => ({
      ...f,
      subjects: f.subjects.includes(s)
        ? f.subjects.filter((x) => x !== s)
        : [...f.subjects, s],
    }));

  const isPerformance = form.exam_type === "performance";

  const submit = async () => {
    if (picked.size === 0) return alert("대상 학생을 선택하세요");
    if (!form.title.trim()) return alert("제목을 입력하세요");
    setBusy(true);
    try {
      const r = await fetch("/api/teacher/exam-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_ids: [...picked],
          exam_type: form.exam_type,
          title: form.title.trim(),
          subjects: form.subjects,
          start_date: form.start_date,
          end_date: form.end_date,
          preset_key: isPerformance ? null : form.preset_key,
          auto_prep: form.auto_prep,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return alert(j?.error ?? "저장 실패");
      setForm(emptyForm(todayIso));
      setPicked(new Set());
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const del = async (batchId: string) => {
    if (!confirm("이 배정을 삭제할까요? 학생 캘린더의 자동 준비 블록도 함께 사라져요.")) return;
    setBusy(true);
    try {
      await fetch(`/api/teacher/exam-schedule?batch=${batchId}`, { method: "DELETE" });
      await reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* ── 새 배정 ─────────────────────────────────────── */}
      <section className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-bold text-neutral-800">새 배정</h2>

        {/* 대상 학생 */}
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-neutral-500">
              대상 학생 ({picked.size})
            </span>
            <button
              onClick={() =>
                setPicked((p) =>
                  p.size === students.length
                    ? new Set()
                    : new Set(students.map((s) => s.academyId)),
                )
              }
              className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500"
            >
              전체
            </button>
            {grades.map((g) => (
              <button
                key={g}
                onClick={() => toggleGrade(g)}
                className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500"
              >
                {g}
              </button>
            ))}
          </div>
          <div className="max-h-44 overflow-y-auto rounded-xl border border-neutral-100 p-1.5">
            <div className="flex flex-wrap gap-1">
              {students.map((s) => (
                <button
                  key={s.academyId}
                  onClick={() => toggle(s.academyId)}
                  className={`rounded-lg px-2 py-1 text-[11px] ${
                    picked.has(s.academyId)
                      ? "bg-blue-600 text-white"
                      : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {s.name}
                  {s.grade ? <span className="opacity-60"> {s.grade}</span> : ""}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 시험 정보 */}
        <div className="flex flex-wrap gap-1.5">
          <select
            value={form.exam_type}
            onChange={(e) => setF({ exam_type: e.target.value as ExamType })}
            className="rounded border border-neutral-200 px-2 py-1 text-xs"
          >
            {EXAM_TYPE_ENTRIES.map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-[11px] text-neutral-500">
            시작
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setF({ start_date: e.target.value })}
              className="rounded border border-neutral-200 px-1.5 py-1 text-xs"
            />
          </label>
          <label className="flex items-center gap-1 text-[11px] text-neutral-500">
            끝
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setF({ end_date: e.target.value })}
              className="rounded border border-neutral-200 px-1.5 py-1 text-xs"
            />
          </label>
        </div>

        <input
          value={form.title}
          onChange={(e) => setF({ title: e.target.value })}
          placeholder={
            isPerformance ? "수행평가 이름 (예: 영어 말하기 수행평가)" : "시험 이름 (예: 2학기 중간고사)"
          }
          className="w-full rounded border border-neutral-200 px-2 py-1 text-xs"
        />

        <div>
          <p className="mb-1 text-[10px] text-neutral-400">과목 (여러 개)</p>
          <div className="flex flex-wrap gap-1">
            {SUBJECT_CHIPS.map((s) => (
              <button
                key={s}
                onClick={() => toggleSubject(s)}
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  form.subjects.includes(s)
                    ? "bg-blue-600 text-white"
                    : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {isPerformance ? (
          <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] text-amber-700">
            수행평가는 D-3 ~ D-1에 &ldquo;준비&rdquo; 블록이 자동으로 잡힙니다.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-[11px] text-neutral-500">
              <input
                type="checkbox"
                checked={form.auto_prep}
                onChange={(e) => setF({ auto_prep: e.target.checked })}
              />
              공부 스케줄 자동 생성
            </label>
            {form.auto_prep && (
              <select
                value={form.preset_key}
                onChange={(e) => setF({ preset_key: e.target.value })}
                className="rounded border border-neutral-200 px-2 py-1 text-xs"
              >
                {PRESET_LIST.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <button
          disabled={busy || picked.size === 0 || !form.title.trim()}
          onClick={submit}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
        >
          {picked.size}명에게 배정
        </button>
      </section>

      {/* ── 배정 목록 ───────────────────────────────────── */}
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-neutral-800">
          배정 목록{loading && <span className="ml-1 text-[11px] font-normal text-neutral-400">…</span>}
        </h2>
        {batches.length === 0 && !loading && (
          <p className="rounded-2xl border border-dashed border-neutral-200 py-8 text-center text-[11px] text-neutral-400">
            배정한 시험/수행평가가 없습니다.
          </p>
        )}
        {batches.map((b) => (
          <div key={b.batchId} className="rounded-2xl border border-neutral-200 bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-bold text-neutral-800">{b.title}</p>
                  <span className="shrink-0 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[9px] text-neutral-500">
                    {EXAM_TYPE_LABEL[b.exam_type]}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  {b.start_date}
                  {b.end_date !== b.start_date && ` ~ ${b.end_date}`}
                  {b.subjects.length > 0 && ` · ${b.subjects.join(", ")}`}
                </p>
                <p className="mt-1 text-[11px] text-neutral-500">
                  {b.students.length}명: {b.students.map((s) => s.name).join(", ")}
                </p>
              </div>
              <button
                onClick={() => del(b.batchId)}
                disabled={busy}
                className="shrink-0 rounded-lg px-2 py-1 text-[10px] text-rose-400 hover:bg-rose-50"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
