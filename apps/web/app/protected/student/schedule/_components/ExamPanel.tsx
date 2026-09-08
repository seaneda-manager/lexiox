"use client";

import { useState } from "react";
import { EXAM_TYPE_LABEL, SUBJECT_CHIPS, type StudentExam } from "@/lib/planner/types";
import { PRESET_LIST } from "@/lib/planner/presets";

export default function ExamPanel({
  exams,
  onChanged,
}: {
  exams: StudentExam[];
  onChanged: () => Promise<void> | void;
}) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const call = async (
    method: "POST" | "PATCH" | "DELETE",
    body?: Record<string, unknown>,
    qs = "",
  ) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/student/planner/exams${qs}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        alert(j?.error ?? "실패했어요");
        return null;
      }
      await onChanged();
      return j;
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-neutral-800">내 시험</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded-lg border border-neutral-200 px-2.5 py-1 text-[11px] text-neutral-500 hover:bg-neutral-50"
        >
          ＋ 시험 추가
        </button>
      </div>

      {adding && (
        <AddExamForm
          busy={busy}
          onCancel={() => setAdding(false)}
          onSubmit={async (body) => {
            const j = await call("POST", body);
            if (j) setAdding(false);
          }}
        />
      )}

      {exams.length === 0 && !adding && (
        <p className="rounded-2xl border border-dashed border-neutral-200 py-8 text-center text-[11px] text-neutral-400">
          등록된 시험이 없어요. 내신 중간·기말이나 모의고사를 추가하고
          <br />
          공부 스케줄을 자동으로 만들어 보세요.
        </p>
      )}

      <div className="space-y-2">
        {exams.map((e) => (
          <ExamRow
            key={e.id}
            exam={e}
            busy={busy}
            onGenerate={(preset) =>
              call("POST", { exam_id: e.id, preset_key: preset }, "?action=generate")
            }
            onEditSubjects={(subjects) => call("PATCH", { id: e.id, subjects })}
            onDelete={() =>
              confirm("이 시험과 연결된 자동생성 계획도 사라져요. 삭제할까요?") &&
              call("DELETE", undefined, `?id=${e.id}`)
            }
          />
        ))}
      </div>
    </section>
  );
}

function ExamRow({
  exam,
  busy,
  onGenerate,
  onEditSubjects,
  onDelete,
}: {
  exam: StudentExam;
  busy: boolean;
  onGenerate: (preset: string) => void;
  onEditSubjects: (subjects: string[]) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [subjects, setSubjects] = useState<string[]>(exam.subjects);

  const toggleSubject = (s: string) =>
    setSubjects((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-neutral-800">{exam.title}</p>
          <p className="text-[11px] text-neutral-400">
            {EXAM_TYPE_LABEL[exam.exam_type]} · {exam.start_date}
            {exam.end_date !== exam.start_date && ` ~ ${exam.end_date}`}
          </p>
          {exam.subjects.length > 0 && (
            <p className="mt-0.5 text-[11px] text-neutral-500">과목: {exam.subjects.join(", ")}</p>
          )}
          {exam.preset_key && (
            <p className="mt-0.5 text-[10px] text-emerald-600">
              ✓ {PRESET_LIST.find((p) => p.key === exam.preset_key)?.label ?? exam.preset_key} 적용됨
            </p>
          )}
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-lg border border-neutral-200 px-2 py-1 text-[11px] text-neutral-500"
        >
          {open ? "닫기" : "공부 계획"}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-neutral-100 pt-3">
          <div>
            <p className="mb-1 text-[11px] font-semibold text-neutral-500">시험 과목</p>
            <div className="flex flex-wrap gap-1">
              {[...new Set([...SUBJECT_CHIPS, ...subjects])].map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSubject(s)}
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    subjects.includes(s)
                      ? "bg-blue-600 text-white"
                      : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {JSON.stringify(subjects) !== JSON.stringify(exam.subjects) && (
              <button
                onClick={() => onEditSubjects(subjects)}
                disabled={busy}
                className="mt-1.5 rounded-lg bg-neutral-800 px-2.5 py-1 text-[10px] text-white"
              >
                과목 저장
              </button>
            )}
          </div>

          <div>
            <p className="mb-1 text-[11px] font-semibold text-neutral-500">
              공부 스케줄 자동 생성
            </p>
            <p className="mb-1.5 text-[10px] text-neutral-400">
              준비기간에 맞춰 과목별 회독·문제풀이·마무리 블록을 캘린더에 채워줘요. 다시
              누르면 완료 안 한 블록만 새로 만듭니다.
            </p>
            {exam.subjects.length === 0 ? (
              <p className="text-[10px] text-rose-500">먼저 시험 과목을 선택하세요.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {PRESET_LIST.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => onGenerate(p.key)}
                    disabled={busy}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 disabled:opacity-40"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {exam.source === "student" && (
            <button
              onClick={onDelete}
              disabled={busy}
              className="text-[10px] text-rose-400 hover:text-rose-600"
            >
              시험 삭제
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AddExamForm({
  busy,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  onSubmit: (body: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [examType, setExamType] = useState<StudentExam["exam_type"]>("naesin_midterm");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);

  const toggleSubject = (s: string) =>
    setSubjects((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  return (
    <div className="space-y-2 rounded-2xl border border-blue-200 bg-blue-50/40 p-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="시험 이름 (예: 2학기 중간고사)"
        className="w-full rounded border border-neutral-200 px-2 py-1 text-xs"
      />
      <div className="flex flex-wrap gap-1.5">
        <select
          value={examType}
          onChange={(e) => setExamType(e.target.value as StudentExam["exam_type"])}
          className="rounded border border-neutral-200 px-2 py-1 text-xs"
        >
          {Object.entries(EXAM_TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-[11px] text-neutral-500">
          시작
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded border border-neutral-200 px-1.5 py-1 text-xs"
          />
        </label>
        <label className="flex items-center gap-1 text-[11px] text-neutral-500">
          끝
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="rounded border border-neutral-200 px-1.5 py-1 text-xs"
          />
        </label>
      </div>
      <div>
        <p className="mb-1 text-[10px] text-neutral-400">시험 과목 (여러 개 선택)</p>
        <div className="flex flex-wrap gap-1">
          {SUBJECT_CHIPS.map((s) => (
            <button
              key={s}
              onClick={() => toggleSubject(s)}
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                subjects.includes(s) ? "bg-blue-600 text-white" : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-1.5">
        <button
          disabled={busy || !title.trim() || !start}
          onClick={() =>
            onSubmit({
              title: title.trim(),
              exam_type: examType,
              start_date: start,
              end_date: end || start,
              subjects,
            })
          }
          className="rounded-lg bg-blue-600 px-3 py-1 text-[11px] font-bold text-white disabled:opacity-40"
        >
          추가
        </button>
        <button onClick={onCancel} className="rounded-lg px-3 py-1 text-[11px] text-neutral-500">
          취소
        </button>
      </div>
    </div>
  );
}
