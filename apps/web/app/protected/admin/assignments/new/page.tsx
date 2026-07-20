import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { createAssignmentAction } from "./actions";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function shortId(value: string) {
  return value.slice(0, 8);
}

type StudentOption = {
  id: string;
  label: string;
  meta: string | null;
};

function isMergedStudent(row: Record<string, unknown>): boolean {
  const mergedFlagCandidates = [
    row.is_merged,
    row.merged,
  ];

  if (mergedFlagCandidates.some((value) => value === true)) {
    return true;
  }

  const mergedStringCandidates = [
    asString(row.status),
    asString(row.student_status),
  ];

  if (mergedStringCandidates.some((value) => value?.toLowerCase() === "merged")) {
    return true;
  }

  const mergedReferenceCandidates = [
    row.merged_into_student_id,
    row.merged_to_student_id,
    row.merged_target_student_id,
    row.merged_student_id,
    row.primary_student_id,
    row.canonical_student_id,
  ];

  if (
    mergedReferenceCandidates.some((value) =>
      typeof value === "string" ? value.trim().length > 0 : value != null
    )
  ) {
    return true;
  }

  const mergedDateCandidates = [row.merged_at];

  if (
    mergedDateCandidates.some((value) =>
      typeof value === "string" ? value.trim().length > 0 : value != null
    )
  ) {
    return true;
  }

  return false;
}

async function listStudentOptions(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>
): Promise<StudentOption[]> {
  const { data, error } = await supabase
    .from("academy_students")
    .select("*")
    .eq("is_active", true)
    .is("deactivated_at", null)
    .order("updated_at", { ascending: false })
    .limit(300);

  if (error || !data) return [];

  const rows = data as Record<string, unknown>[];

  return rows
    .filter((row) => {
      const isActive = asBoolean(row.is_active);
      const deactivatedAt = row.deactivated_at;
      const merged = isMergedStudent(row);

      if (!isActive) return false;
      if (deactivatedAt != null && `${deactivatedAt}`.trim() !== "") return false;
      if (merged) return false;

      return true;
    })
    .map((row) => {
      const id = asString(row.id);
      if (!id) return null;

      const fullName = asString(row.full_name);
      const displayName = asString(row.display_name);
      const email = asString(row.email);
      const loginId = asString(row.login_id);
      const school = asString(row.school);
      const grade = asString(row.grade);
      const level = asString(row.level);

      const label =
        fullName ||
        displayName ||
        email ||
        loginId ||
        `학생 ${shortId(id)}`;

      const metaParts = [
        school,
        grade,
        level,
        email || loginId || `ID ${shortId(id)}`,
      ].filter(Boolean);

      return {
        id,
        label,
        meta: metaParts.length > 0 ? metaParts.join(" · ") : null,
      } satisfies StudentOption;
    })
    .filter((row): row is StudentOption => !!row)
    .sort((a, b) => a.label.localeCompare(b.label, "ko"));
}

export const dynamic = "force-dynamic";

export default async function AdminAssignmentsNewPage() {
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const studentOptions = await listStudentOptions(supabase);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-[0.18em] text-neutral-400">
            Admin / Assignments / New
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            새 과제 만들기
          </h1>
          <p className="text-sm text-neutral-500">
            이 페이지는 목록이 아니라 과제 생성 폼입니다.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/assignments"
            className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
          >
            목록으로
          </Link>
        </div>
      </header>

      <form action={createAssignmentAction} className="space-y-6">
        <section className="rounded-2xl border bg-white p-5">
          <div className="mb-4">
            <div className="text-sm font-semibold text-neutral-900">기본 정보</div>
            <p className="mt-1 text-xs text-neutral-500">
              assignment 1건과 student_tasks 1건을 함께 생성합니다.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="과제 제목"
              name="title"
              placeholder="예: Test Naesin Reading Assignment"
              required
            />

            <SelectField
              label="과제 종류"
              name="kind"
              defaultValue="content"
              options={[
                { value: "content", label: "콘텐츠" },
                { value: "bundle", label: "번들" },
                { value: "flow", label: "플로우" },
                { value: "scope", label: "범위" },
              ]}
            />

            <SelectField
              label="트랙"
              name="track"
              defaultValue="naesin"
              options={[
                { value: "naesin", label: "Lingo-X 내신" },
                { value: "junior", label: "Lingo-X Junior" },
                { value: "toefl", label: "Lingo-X TOEFL" },
                { value: "voca", label: "Lingo-X Voca" },
              ]}
            />

            <SelectField
              label="영역"
              name="section"
              defaultValue="reading"
              options={[
                { value: "reading", label: "Reading" },
                { value: "listening", label: "Listening" },
                { value: "speaking", label: "Speaking" },
                { value: "writing", label: "Writing" },
                { value: "grammar", label: "Grammar" },
                { value: "vocab", label: "Vocab" },
                { value: "-", label: "-" },
              ]}
            />

            <SelectField
              label="과제 상태"
              name="status"
              defaultValue="assigned"
              options={[
                { value: "assigned", label: "배정됨" },
                { value: "in_progress", label: "진행 중" },
                { value: "completed", label: "완료" },
                { value: "closed", label: "마감" },
                { value: "draft", label: "초안" },
              ]}
            />

            <SelectField
              label="우선순위"
              name="priority"
              defaultValue="medium"
              options={[
                { value: "low", label: "낮음" },
                { value: "medium", label: "보통" },
                { value: "high", label: "높음" },
              ]}
            />

            <DateField label="마감일" name="due_date" defaultValue={today} />

            <div className="space-y-1.5">
              <div className="text-sm font-medium text-neutral-800">대상 유형</div>
              <input type="hidden" name="target_type" value="student" />
              <div className="rounded-xl border bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
                student 전용 v1
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5">
          <div className="mb-4">
            <div className="text-sm font-semibold text-neutral-900">대상 학생</div>
            <p className="mt-1 text-xs text-neutral-500">
              <span className="font-medium text-neutral-700">
                academy_students
              </span>
              기준 목록입니다. 목록에서 고르거나 UUID를 직접 입력하세요.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <div className="text-sm font-medium text-neutral-800">학생 선택</div>
              <select
                name="student_id"
                defaultValue={studentOptions[0]?.id ?? ""}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              >
                {studentOptions.length === 0 ? (
                  <option value="">학생 목록 없음</option>
                ) : (
                  studentOptions.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.label}
                      {student.meta ? ` · ${student.meta}` : ""}
                    </option>
                  ))
                )}
              </select>
            </label>

            <TextField
              label="학생 UUID 직접 입력"
              name="student_id_manual"
              placeholder="academy_students.id가 있으면 여기 입력"
            />
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5">
          <div className="mb-4 text-sm font-semibold text-neutral-900">설명 / 옵션</div>

          <div className="grid gap-4 md:grid-cols-2">
            <BooleanField label="Review 필수" name="review_required" defaultChecked />
            <BooleanField label="재시도 허용" name="retry_allowed" defaultChecked />
          </div>

          <div className="mt-4">
            <label className="space-y-1.5">
              <div className="text-sm font-medium text-neutral-800">설명</div>
              <textarea
                name="description"
                rows={4}
                placeholder="학생에게 보일 설명"
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              />
            </label>
          </div>

          <div className="mt-4">
            <label className="space-y-1.5">
              <div className="text-sm font-medium text-neutral-800">운영 메모</div>
              <textarea
                name="memo"
                rows={4}
                placeholder="운영 메모, 공지, 유의사항"
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              />
            </label>
          </div>
        </section>

        <section className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            과제 생성
          </button>

          <Link
            href="/admin/assignments"
            className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
          >
            취소
          </Link>
        </section>
      </form>
    </main>
  );
}

function TextField({
  label,
  name,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-1.5">
      <div className="text-sm font-medium text-neutral-800">{label}</div>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
      />
    </label>
  );
}

function DateField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <label className="space-y-1.5">
      <div className="text-sm font-medium text-neutral-800">{label}</div>
      <input
        type="date"
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="space-y-1.5">
      <div className="text-sm font-medium text-neutral-800">{label}</div>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
      >
        {options.map((option) => (
          <option key={`${name}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function BooleanField({
  label,
  name,
  defaultChecked,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border px-3 py-3 text-sm text-neutral-700">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      <span>{label}</span>
    </label>
  );
}
