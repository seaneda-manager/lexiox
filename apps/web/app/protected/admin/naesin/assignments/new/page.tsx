"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type TargetType = "student" | "class";
type Status = "assigned" | "in_progress" | "completed" | "closed";

const classOptions = [
  { id: "class_a", label: "고1A반" },
  { id: "class_b", label: "고1B반" },
  { id: "class_c", label: "중2A반" },
];

const studentOptions = [
  { id: "student_001", label: "student_001" },
  { id: "student_002", label: "student_002" },
  { id: "student_003", label: "student_003" },
];

export const dynamic = "force-dynamic";

export default function AdminNaesinAssignmentsNewPage() {
  const [title, setTitle]               = useState("");
  const [targetType, setTargetType]     = useState<TargetType>("class");
  const [targetId, setTargetId]         = useState(classOptions[0]?.id ?? "");
  const [dueAt, setDueAt]               = useState("2026-03-20");
  const [status, setStatus]             = useState<Status>("assigned");
  const [reviewRequired, setReviewRequired] = useState(true);
  const [retryAllowed, setRetryAllowed] = useState(true);
  const [memo, setMemo]                 = useState("");

  const currentTargets = targetType === "class" ? classOptions : studentOptions;

  const payloadPreview = useMemo(
    () =>
      JSON.stringify(
        {
          title,
          target_type: targetType,
          target_id:   targetId,
          due_at:      dueAt,
          status,
          review_required: reviewRequired,
          retry_allowed:   retryAllowed,
          memo,
        },
        null,
        2,
      ),
    [title, targetType, targetId, dueAt, status, reviewRequired, retryAllowed, memo],
  );

  function handleTargetTypeChange(next: TargetType) {
    setTargetType(next);
    setTargetId(next === "class" ? classOptions[0]?.id ?? "" : studentOptions[0]?.id ?? "");
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-[0.18em] text-neutral-400">
            Admin / Naesin / Assignments / New
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            새 내신 배정 만들기
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/naesin/assignments"
            className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
          >
            목록으로
          </Link>
          <button
            type="button"
            disabled
            className="rounded-xl bg-neutral-300 px-4 py-2 text-sm font-medium text-white"
          >
            배정 생성
          </button>
        </div>
      </header>

      <section className="rounded-2xl border bg-white p-5">
        <div className="mb-4 text-sm font-semibold text-neutral-900">배정 기본 정보</div>

        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="배정 제목"
            value={title}
            placeholder="예: 송도고1-1 중간 배정"
            onChange={setTitle}
          />

          <SelectField
            label="대상 유형"
            value={targetType}
            onChange={(v) => handleTargetTypeChange(v as TargetType)}
            options={[
              { value: "class",   label: "반" },
              { value: "student", label: "학생" },
            ]}
          />

          <SelectField
            label="대상 선택"
            value={targetId}
            onChange={setTargetId}
            options={currentTargets.map((t) => ({ value: t.id, label: t.label }))}
          />

          <TextField
            label="마감일"
            value={dueAt}
            placeholder="YYYY-MM-DD"
            onChange={setDueAt}
          />

          <SelectField
            label="상태"
            value={status}
            onChange={(v) => setStatus(v as Status)}
            options={[
              { value: "assigned",    label: "배정됨" },
              { value: "in_progress", label: "진행중" },
              { value: "completed",   label: "완료" },
              { value: "closed",      label: "마감" },
            ]}
          />
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <div className="mb-4 text-sm font-semibold text-neutral-900">배정 옵션</div>
        <div className="grid gap-4 md:grid-cols-2">
          <BooleanField label="Review 필수"  checked={reviewRequired} onChange={setReviewRequired} />
          <BooleanField label="재시도 허용"  checked={retryAllowed}   onChange={setRetryAllowed}   />
        </div>
        <div className="mt-4">
          <label className="space-y-1.5">
            <div className="text-sm font-medium text-neutral-800">메모</div>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={4}
              placeholder="운영 메모, 공지, 유의사항 등"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <div className="text-sm font-semibold text-neutral-900">저장 payload 미리보기</div>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-neutral-950 p-4 text-xs leading-6 text-neutral-100">
          {payloadPreview}
        </pre>
      </section>
    </main>
  );
}

function TextField({ label, value, placeholder, onChange }: {
  label: string; value: string; placeholder?: string; onChange: (v: string) => void;
}) {
  return (
    <label className="space-y-1.5">
      <div className="text-sm font-medium text-neutral-800">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} className="w-full rounded-xl border px-3 py-2 text-sm outline-none" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="space-y-1.5">
      <div className="text-sm font-medium text-neutral-800">{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border px-3 py-2 text-sm outline-none">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function BooleanField({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border px-3 py-3 text-sm text-neutral-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
