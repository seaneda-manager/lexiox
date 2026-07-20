import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";

type SearchParams = Promise<{
  q?: string;
  kind?: string;
  track?: string;
  section?: string;
  targetType?: string;
  status?: string;
  studentState?: string;
}>;

type Status = "draft" | "assigned" | "in_progress" | "completed" | "closed";

type AssignmentRow = {
  id: string;
  title: string;
  start_at: string | null;
  due_at: string | null;
  status: Status | string | null;
  target: unknown;
  created_by: string | null;
  created_at: string | null;
  homework_id: string | null;
};

type StudentTaskRow = {
  status: string | null;
  due_date?: string | null;
  due_at?: string | null;
  payload_json?: unknown;
};

type StudentSummary = {
  id: string;
  label: string;
  state: "active" | "inactive" | "deactivated" | "merged" | "missing";
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isTrueValue(value: unknown): boolean {
  return value === true;
}

function hasValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function shortId(value: string) {
  return value.slice(0, 8);
}

function kindLabel(kind: string | null) {
  switch (kind) {
    case "scope":
      return "범위";
    case "content":
      return "콘텐츠";
    case "bundle":
      return "번들";
    case "flow":
      return "플로우";
    default:
      return kind ?? "-";
  }
}

function trackLabel(track: string | null) {
  switch (track) {
    case "naesin":
      return "내신";
    case "junior":
      return "주니어";
    case "toefl":
      return "TOEFL";
    case "voca":
      return "VOCA";
    default:
      return track ?? "-";
  }
}

function sectionLabel(section: string | null) {
  switch (section) {
    case "reading":
      return "리딩";
    case "listening":
      return "리스닝";
    case "speaking":
      return "스피킹";
    case "writing":
      return "라이팅";
    case "grammar":
      return "문법";
    case "vocab":
      return "보카";
    case "-":
    case null:
      return "-";
    default:
      return section;
  }
}

function targetTypeLabel(targetType: string | null) {
  switch (targetType) {
    case "class":
      return "반";
    case "student":
      return "학생";
    default:
      return targetType ?? "-";
  }
}

function statusLabel(status: string | null) {
  switch (status) {
    case "draft":
      return "초안";
    case "assigned":
      return "배정됨";
    case "in_progress":
      return "진행중";
    case "completed":
      return "완료";
    case "closed":
      return "마감";
    default:
      return status ?? "-";
  }
}

function statusBadgeClass(status: string | null) {
  switch (status) {
    case "draft":
      return "border-neutral-300 bg-neutral-50 text-neutral-600";
    case "assigned":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "in_progress":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "closed":
      return "border-neutral-300 bg-neutral-100 text-neutral-700";
    default:
      return "border-neutral-300 bg-neutral-50 text-neutral-600";
  }
}

function studentStateLabel(state: StudentSummary["state"]) {
  switch (state) {
    case "inactive":
      return "비활성";
    case "deactivated":
      return "비활성화";
    case "merged":
      return "Merged";
    case "missing":
      return "학생없음";
    case "active":
    default:
      return "활성";
  }
}

function studentStateBadgeClass(state: StudentSummary["state"]) {
  switch (state) {
    case "inactive":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "deactivated":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "merged":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "missing":
      return "border-neutral-300 bg-neutral-100 text-neutral-700";
    case "active":
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

function formatDateOnly(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatUpdatedAt(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function isTaskCompleted(status: string | null) {
  return ["completed", "submitted", "done", "closed"].includes(status ?? "");
}

function getAssignmentHint(kind: string | null) {
  if (kind === "scope") return "시험 범위 기반 과제";
  if (kind === "content") return "콘텐츠 직접 배정";
  if (kind === "bundle") return "번들형 과제";
  if (kind === "flow") return "학습 플로우형 과제";
  return "운영 구조 확장 예정";
}

function extractMeta(row: AssignmentRow) {
  const target = isRecord(row.target) ? row.target : null;

  return {
    kind: asString(target?.kind) ?? "content",
    track: asString(target?.track) ?? "naesin",
    section: asString(target?.section) ?? "-",
    targetType: asString(target?.targetType) ?? "student",
    studentId: asString(target?.studentId),
    classId: asString(target?.classId),
  };
}

function extractAssignmentIdFromTask(row: StudentTaskRow): string | null {
  const payload = isRecord(row.payload_json) ? row.payload_json : null;
  return asString(payload?.assignmentId);
}

function isMergedStudentRow(row: Record<string, unknown>): boolean {
  const mergedFlagCandidates = [row.is_merged, row.merged];

  if (mergedFlagCandidates.some(isTrueValue)) {
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

  if (mergedReferenceCandidates.some(hasValue)) {
    return true;
  }

  const mergedDateCandidates = [row.merged_at];

  if (mergedDateCandidates.some(hasValue)) {
    return true;
  }

  return false;
}

function getStudentLabel(row: Record<string, unknown>): string {
  const id = asString(row.id) ?? "";
  const fullName = asString(row.full_name);
  const displayName = asString(row.display_name);
  const email = asString(row.email);
  const loginId = asString(row.login_id);

  return fullName || displayName || email || loginId || `학생 ${shortId(id)}`;
}

function getStudentState(row: Record<string, unknown>): StudentSummary["state"] {
  if (isMergedStudentRow(row)) return "merged";
  if (hasValue(row.deactivated_at)) return "deactivated";
  if (!isTrueValue(row.is_active)) return "inactive";
  return "active";
}

function getResolvedStudentSummary(
  row: {
    targetType: string;
    studentId: string | null;
  },
  studentMap: Map<string, StudentSummary>
): StudentSummary | null {
  if (row.targetType !== "student") return null;
  if (!row.studentId) {
    return {
      id: "",
      label: "학생",
      state: "missing",
    };
  }

  return (
    studentMap.get(row.studentId) ?? {
      id: row.studentId,
      label: `학생 ${shortId(row.studentId)}`,
      state: "missing",
    }
  );
}

function renderTargetDetail(
  row: {
    targetType: string;
    studentId: string | null;
    classId: string | null;
  },
  studentMap: Map<string, StudentSummary>
) {
  if (row.targetType === "student") {
    const student = getResolvedStudentSummary(row, studentMap);

    if (!student || !row.studentId) {
      return (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-neutral-700">학생</span>
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${studentStateBadgeClass(
                "missing"
              )}`}
            >
              {studentStateLabel("missing")}
            </span>
          </div>
          <div className="text-xs text-neutral-400">student_id 없음</div>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-neutral-700">{student.label}</span>
          {student.state !== "active" ? (
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${studentStateBadgeClass(
                student.state
              )}`}
            >
              {studentStateLabel(student.state)}
            </span>
          ) : null}
        </div>
        <div className="text-xs text-neutral-400">학생</div>
      </div>
    );
  }

  if (row.targetType === "class") {
    return (
      <div className="space-y-1">
        <div className="text-neutral-700">{row.classId ?? "-"}</div>
        <div className="text-xs text-neutral-400">반</div>
      </div>
    );
  }

  return <span className="text-neutral-700">{targetTypeLabel(row.targetType)}</span>;
}

async function listAllStudentTasks(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>
): Promise<StudentTaskRow[]> {
  const pageSize = 1000;
  let from = 0;
  const allRows: StudentTaskRow[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("student_tasks")
      .select("status, due_date, due_at, payload_json")
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`student_tasks fetch failed: ${error.message}`);
    }

    const pageRows = (data ?? []) as StudentTaskRow[];
    allRows.push(...pageRows);

    if (pageRows.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return allRows;
}

export const dynamic = "force-dynamic";

export default async function AdminAssignmentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const supabase = await getServerSupabase();

  const q = sp.q?.trim().toLowerCase() ?? "";

  const { data, error } = await supabase
    .from("assignments")
    .select("id, title, start_at, due_at, status, target, created_by, created_at, homework_id")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          과제 목록을 불러오지 못했습니다.
          <div className="mt-2 text-xs">{error.message}</div>
        </div>
      </main>
    );
  }

  const rows = (data ?? []) as AssignmentRow[];

  const studentIds = Array.from(
    new Set(
      rows
        .map((row) => extractMeta(row).studentId)
        .filter((value): value is string => !!value)
    )
  );

  const studentMap = new Map<string, StudentSummary>();

  if (studentIds.length > 0) {
    const { data: studentData } = await supabase
      .from("academy_students")
      .select("*")
      .in("id", studentIds);

    const studentRows = (studentData ?? []) as Record<string, unknown>[];

    for (const row of studentRows) {
      const id = asString(row.id);
      if (!id) continue;

      studentMap.set(id, {
        id,
        label: getStudentLabel(row),
        state: getStudentState(row),
      });
    }
  }

  let taskRows: StudentTaskRow[] = [];

  try {
    taskRows = await listAllStudentTasks(supabase);
  } catch (taskError) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          학생 과제 진행 현황을 불러오지 못했습니다.
          <div className="mt-2 text-xs">
            {taskError instanceof Error ? taskError.message : "unknown error"}
          </div>
        </div>
      </main>
    );
  }

  const assignedCountByAssignment = new Map<string, number>();
  const completedCountByAssignment = new Map<string, number>();
  const dueLabelByAssignment = new Map<string, string>();

  for (const row of taskRows) {
    const assignmentId = extractAssignmentIdFromTask(row);
    if (!assignmentId) continue;

    assignedCountByAssignment.set(
      assignmentId,
      (assignedCountByAssignment.get(assignmentId) ?? 0) + 1
    );

    if (isTaskCompleted(row.status)) {
      completedCountByAssignment.set(
        assignmentId,
        (completedCountByAssignment.get(assignmentId) ?? 0) + 1
      );
    }

    const rawDue = row.due_at ?? row.due_date ?? null;
    if (rawDue && !dueLabelByAssignment.has(assignmentId)) {
      dueLabelByAssignment.set(assignmentId, formatDateOnly(rawDue));
    }
  }

  const normalizedRows = rows
    .map((row) => {
      const meta = extractMeta(row);
      const student = getResolvedStudentSummary(
        {
          targetType: meta.targetType,
          studentId: meta.studentId,
        },
        studentMap
      );

      return {
        ...row,
        kind: meta.kind,
        track: meta.track,
        section: meta.section,
        targetType: meta.targetType,
        studentId: meta.studentId,
        classId: meta.classId,
        studentState: student?.state ?? null,
        status: row.status ?? "draft",
        assignedCount: assignedCountByAssignment.get(row.id) ?? 0,
        completedCount: completedCountByAssignment.get(row.id) ?? 0,
        dueLabel: dueLabelByAssignment.get(row.id) ?? formatDateOnly(row.due_at),
      };
    })
    .filter((row) => {
      if (sp.kind && row.kind !== sp.kind) return false;
      if (sp.track && row.track !== sp.track) return false;
      if (sp.section && row.section !== sp.section) return false;
      if (sp.targetType && row.targetType !== sp.targetType) return false;
      if (sp.status && row.status !== sp.status) return false;
      if (sp.studentState && row.studentState !== sp.studentState) return false;
      if (q && !row.title.toLowerCase().includes(q)) return false;
      return true;
    });

  const totalCount = normalizedRows.length;
  const assignedCount = normalizedRows.filter((row) => row.status === "assigned").length;
  const inProgressCount = normalizedRows.filter((row) => row.status === "in_progress").length;
  const completedCount = normalizedRows.filter((row) => row.status === "completed").length;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-[0.18em] text-neutral-400">
            Admin / Assignments
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">과제 배정</h1>
          <p className="text-sm text-neutral-500">
            content / bundle / flow / scope 배정이 모이는 운영 보드.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/content"
            className="rounded-xl border px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            콘텐츠 허브
          </Link>

          <Link
            href="/admin/naesin/scopes"
            className="rounded-xl border px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            시험 범위
          </Link>

          <form action="/admin/assignments/new" method="get">
            <button
              type="submit"
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              새 과제 만들기
            </button>
          </form>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs font-medium text-neutral-500">전체 과제</div>
          <div className="mt-2 text-2xl font-semibold text-neutral-900">{totalCount}</div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs font-medium text-neutral-500">배정됨</div>
          <div className="mt-2 text-2xl font-semibold text-sky-700">{assignedCount}</div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs font-medium text-neutral-500">진행중</div>
          <div className="mt-2 text-2xl font-semibold text-amber-700">{inProgressCount}</div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs font-medium text-neutral-500">완료</div>
          <div className="mt-2 text-2xl font-semibold text-emerald-700">
            {completedCount}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4">
        <form className="grid gap-3 md:grid-cols-7">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="제목 검색"
            className="rounded-xl border px-3 py-2 text-sm outline-none"
          />

          <select
            name="kind"
            defaultValue={sp.kind ?? ""}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
          >
            <option value="">전체 종류</option>
            <option value="scope">범위</option>
            <option value="content">콘텐츠</option>
            <option value="bundle">번들</option>
            <option value="flow">플로우</option>
          </select>

          <select
            name="track"
            defaultValue={sp.track ?? ""}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
          >
            <option value="">전체 트랙</option>
            <option value="naesin">내신</option>
            <option value="junior">주니어</option>
            <option value="toefl">TOEFL</option>
            <option value="voca">VOCA</option>
          </select>

          <select
            name="section"
            defaultValue={sp.section ?? ""}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
          >
            <option value="">전체 영역</option>
            <option value="reading">리딩</option>
            <option value="listening">리스닝</option>
            <option value="speaking">스피킹</option>
            <option value="writing">라이팅</option>
            <option value="grammar">문법</option>
            <option value="vocab">보카</option>
          </select>

          <select
            name="targetType"
            defaultValue={sp.targetType ?? ""}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
          >
            <option value="">전체 대상</option>
            <option value="class">반</option>
            <option value="student">학생</option>
          </select>

          <select
            name="studentState"
            defaultValue={sp.studentState ?? ""}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
          >
            <option value="">전체 학생상태</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
            <option value="deactivated">비활성화</option>
            <option value="merged">Merged</option>
            <option value="missing">학생없음</option>
          </select>

          <div className="flex gap-2">
            <select
              name="status"
              defaultValue={sp.status ?? ""}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
            >
              <option value="">전체 상태</option>
              <option value="draft">초안</option>
              <option value="assigned">배정됨</option>
              <option value="in_progress">진행중</option>
              <option value="completed">완료</option>
              <option value="closed">마감</option>
            </select>

            <button
              type="submit"
              className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
            >
              적용
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-white">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-900">과제 목록</h2>
          <p className="text-xs text-neutral-500">실제 배정 / 진행 데이터 기준</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-600">
              <tr>
                <th className="px-4 py-3 font-medium">제목</th>
                <th className="px-4 py-3 font-medium">종류</th>
                <th className="px-4 py-3 font-medium">트랙</th>
                <th className="px-4 py-3 font-medium">영역</th>
                <th className="px-4 py-3 font-medium">대상</th>
                <th className="px-4 py-3 font-medium">진행</th>
                <th className="px-4 py-3 font-medium">마감일</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">생성일</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>

            <tbody>
              {normalizedRows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="font-medium text-neutral-900">{row.title}</div>
                      <div className="text-xs text-neutral-500">
                        {getAssignmentHint(row.kind)}
                      </div>
                      <div className="text-[11px] text-neutral-400">ID {shortId(row.id)}</div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-neutral-700">{kindLabel(row.kind)}</td>
                  <td className="px-4 py-3 text-neutral-700">{trackLabel(row.track)}</td>
                  <td className="px-4 py-3 text-neutral-700">{sectionLabel(row.section)}</td>

                  <td className="px-4 py-3">
                    {renderTargetDetail(
                      {
                        targetType: row.targetType,
                        studentId: row.studentId,
                        classId: row.classId,
                      },
                      studentMap
                    )}
                  </td>

                  <td className="px-4 py-3 text-neutral-700">
                    {row.completedCount} / {row.assignedCount}
                  </td>

                  <td className="px-4 py-3 text-neutral-700">{row.dueLabel}</td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                        row.status
                      )}`}
                    >
                      {statusLabel(row.status)}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-neutral-700">
                    {formatUpdatedAt(row.created_at)}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-2">
                      <span className="text-xs text-neutral-400">상세 페이지 없음</span>

                      <Link
                        href="/dashboard/tasks"
                        className="text-xs text-neutral-500 hover:text-neutral-700 hover:underline"
                      >
                        학생 뷰
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {normalizedRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-neutral-500">
                    등록된 과제가 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
