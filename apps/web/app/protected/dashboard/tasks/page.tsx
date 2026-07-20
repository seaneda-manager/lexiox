import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  track?: string;
  status?: string;
}>;

type StudentTaskStatus = "todo" | "in_progress" | "done";
type StudentTaskPriority = "low" | "medium" | "high";
type TrackKey = "toefl" | "naesin" | "junior" | "voca" | "unknown";
type StudentState = "active" | "inactive" | "deactivated" | "merged" | "missing";
type SupabaseServerClient = Awaited<ReturnType<typeof getServerSupabase>>;

type RawStudentTask = {
  id: string;
  title: string | null;
  description: string | null;
  status: StudentTaskStatus;
  priority: StudentTaskPriority;
  kind: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string | null;
  start_at: string | null;
  due_at: string | null;
  payload_json: unknown;
};

type TaskViewModel = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  status: StudentTaskStatus;
  priority: StudentTaskPriority;
  kind: string | null;
  track: TrackKey;
  trackLabel: string;
  sectionLabel: string;
  curriculumLabel: string | null;
  progressLabel: string | null;
  dueLabel: string | null;
  completedLabel: string | null;
  href: string;
};

type TrackSummary = {
  track: TrackKey;
  total: number;
  todo: number;
  inProgress: number;
  done: number;
};

type CurrentStudentProfile = {
  id: string | null;
  label: string;
  state: StudentState;
};

const STATUS_META: Record<
  StudentTaskStatus,
  { label: string; tone: string; empty: string }
> = {
  todo: {
    label: "할 일",
    tone: "border-slate-200 bg-slate-50 text-slate-700",
    empty: "아직 할 일이 없습니다.",
  },
  in_progress: {
    label: "진행 중",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
    empty: "진행 중인 과제가 없습니다.",
  },
  done: {
    label: "완료",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    empty: "완료한 과제가 아직 없습니다.",
  },
};

const PRIORITY_META: Record<StudentTaskPriority, { label: string; tone: string }> = {
  low: {
    label: "낮음",
    tone: "border-slate-200 bg-white text-slate-600",
  },
  medium: {
    label: "보통",
    tone: "border-sky-200 bg-sky-50 text-sky-700",
  },
  high: {
    label: "높음",
    tone: "border-rose-200 bg-rose-50 text-rose-700",
  },
};

const TRACK_META: Record<TrackKey, { label: string; tone: string; href: string }> = {
  voca: {
    label: "Lingo-X Voca",
    tone: "border-violet-200 bg-violet-50 text-violet-700",
    href: "/student?program=voca",
  },
  naesin: {
    label: "Lingo-X 내신",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    href: "/student?program=naesin",
  },
  junior: {
    label: "Lingo-X Junior",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
    href: "/student?program=junior",
  },
  toefl: {
    label: "Lingo-X TOEFL",
    tone: "border-sky-200 bg-sky-50 text-sky-700",
    href: "/student?program=toefl",
  },
  unknown: {
    label: "기타",
    tone: "border-slate-200 bg-slate-50 text-slate-600",
    href: "/student",
  },
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

function normalizeTrack(value: unknown): TrackKey | null {
  const v = asString(value)?.toLowerCase();
  if (!v) return null;
  if (v === "toefl") return "toefl";
  if (v === "naesin") return "naesin";
  if (v === "junior") return "junior";
  if (v === "voca" || v === "vocab" || v === "lingo_vocab") return "voca";
  if (v === "unknown") return "unknown";
  return null;
}

function formatDateTime(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: value.includes("T") ? "2-digit" : undefined,
    minute: value.includes("T") ? "2-digit" : undefined,
    hour12: false,
  }).format(d);
}

function getDueLabel(task: RawStudentTask): string | null {
  const raw = task.due_at ?? task.due_date;
  const formatted = formatDateTime(raw);
  return formatted ? `마감 ${formatted}` : null;
}

function getCompletedLabel(task: RawStudentTask): string | null {
  const formatted = formatDateTime(task.completed_at);
  return formatted ? `완료 ${formatted}` : null;
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

function getStudentState(row: Record<string, unknown>): StudentState {
  if (isMergedStudentRow(row)) return "merged";
  if (hasValue(row.deactivated_at)) return "deactivated";
  if (!isTrueValue(row.is_active)) return "inactive";
  return "active";
}

function getStudentLabel(row: Record<string, unknown>): string {
  const id = asString(row.id) ?? "";
  const fullName = asString(row.full_name);
  const displayName = asString(row.display_name);
  const email = asString(row.email);
  const loginId = asString(row.login_id);

  return fullName || displayName || email || loginId || `학생 ${shortId(id)}`;
}

function studentStateLabel(state: StudentState) {
  switch (state) {
    case "inactive":
      return "비활성";
    case "deactivated":
      return "비활성화";
    case "merged":
      return "Merged";
    case "missing":
      return "학생연결없음";
    case "active":
    default:
      return "활성";
  }
}

function studentStateBadgeClass(state: StudentState) {
  switch (state) {
    case "inactive":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "deactivated":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "merged":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "missing":
      return "border-slate-200 bg-slate-50 text-slate-600";
    case "active":
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

function getStudentStateNotice(state: StudentState) {
  switch (state) {
    case "inactive":
      return {
        tone: "border-amber-200 bg-amber-50 text-amber-800",
        message:
          "현재 학생 계정이 비활성 상태로 보입니다. 기존 과제는 표시하지만, 일부 배정/진행 흐름은 제한될 수 있습니다.",
      };
    case "deactivated":
      return {
        tone: "border-rose-200 bg-rose-50 text-rose-800",
        message:
          "현재 학생 계정이 비활성화 상태로 보입니다. 기존 과제 이력은 유지되며, 운영자가 계정 상태를 확인해야 할 수 있습니다.",
      };
    case "merged":
      return {
        tone: "border-violet-200 bg-violet-50 text-violet-800",
        message:
          "현재 학생 계정이 merged 상태로 보입니다. 과제는 표시되지만, 학생 통합 이후 기준 계정 연결을 확인하는 편이 좋습니다.",
      };
    case "missing":
      return {
        tone: "border-slate-200 bg-slate-50 text-slate-700",
        message:
          "academy_students 연결을 찾지 못했습니다. 로그인 계정 기준으로 조회 가능한 과제만 표시합니다.",
      };
    case "active":
    default:
      return {
        tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
        message: "현재 활성 학생 계정으로 연결되어 있습니다.",
      };
  }
}

function inferTrack(kind: string | null, payloadJson: unknown): TrackKey {
  const payload = isRecord(payloadJson) ? payloadJson : null;
  const spec = payload && isRecord(payload.spec) ? payload.spec : null;

  const rawKind = asString(kind)?.toUpperCase();
  const specKind = asString(spec?.kind)?.toUpperCase();

  if (rawKind === "LINGO_VOCAB" || specKind === "LINGO_VOCAB") return "voca";
  if (rawKind === "NAESIN" || specKind === "NAESIN") return "naesin";
  if (rawKind === "JUNIOR" || specKind === "JUNIOR") return "junior";
  if (rawKind === "TOEFL" || specKind === "TOEFL") return "toefl";

  return (
    normalizeTrack(spec?.track) ||
    normalizeTrack(spec?.program) ||
    normalizeTrack(spec?.course) ||
    normalizeTrack(spec?.curriculumType) ||
    "unknown"
  );
}

function inferSectionLabel(kind: string | null, payloadJson: unknown, track: TrackKey): string {
  const payload = isRecord(payloadJson) ? payloadJson : null;
  const spec = payload && isRecord(payload.spec) ? payload.spec : null;

  const section =
    asString(spec?.section)?.toLowerCase() ||
    asString(spec?.area)?.toLowerCase() ||
    asString(spec?.domain)?.toLowerCase();

  if (track === "voca") return "Vocab";
  if (section === "reading") return "Reading";
  if (section === "listening") return "Listening";
  if (section === "speaking") return "Speaking";
  if (section === "writing") return "Writing";
  if (section === "grammar") return "Grammar";
  if (section === "vocab") return "Vocab";

  const rawKind = asString(kind)?.toUpperCase() ?? "";
  if (rawKind.includes("READING")) return "Reading";
  if (rawKind.includes("LISTENING")) return "Listening";
  if (rawKind.includes("SPEAKING")) return "Speaking";
  if (rawKind.includes("WRITING")) return "Writing";
  if (rawKind.includes("GRAMMAR")) return "Grammar";
  if (rawKind.includes("VOCAB")) return "Vocab";

  return "Task";
}

function buildTaskTitle(task: RawStudentTask) {
  const payload = isRecord(task.payload_json) ? task.payload_json : null;
  const spec = payload && isRecord(payload.spec) ? payload.spec : null;
  const chapter = spec && isRecord(spec.chapter) ? spec.chapter : null;

  const curriculumLabel = asString(spec?.curriculumLabel);
  const chapterLabel = asString(chapter?.label);
  const packageId = asString(spec?.packageId);

  const title =
    [curriculumLabel, chapterLabel].filter(Boolean).join(" · ") ||
    task.title ||
    "학생 과제";

  const subtitle =
    [packageId, chapterLabel].filter(Boolean).join(" · ") ||
    asString(task.kind);

  return {
    title,
    subtitle: subtitle || null,
    curriculumLabel,
    chapterLabel,
    packageId,
    vocabSetId: chapter ? asString(chapter.vocabSetId) : null,
  };
}

function parseTask(task: RawStudentTask): TaskViewModel {
  const payload = isRecord(task.payload_json) ? task.payload_json : null;
  const spec = payload && isRecord(payload.spec) ? payload.spec : null;

  const kind = asString(task.kind);
  const specKind = asString(spec?.kind);
  const effectiveKind = specKind ?? kind;

  const titleInfo = buildTaskTitle(task);
  const track = inferTrack(kind, task.payload_json);
  const sectionLabel = inferSectionLabel(kind, task.payload_json, track);

  const progressLabel =
    [titleInfo.packageId, titleInfo.chapterLabel, titleInfo.vocabSetId]
      .filter(Boolean)
      .join(" · ") || null;

  return {
    id: task.id,
    title: titleInfo.title,
    subtitle: titleInfo.subtitle,
    description: task.description,
    status: task.status,
    priority: task.priority,
    kind: effectiveKind,
    track,
    trackLabel: TRACK_META[track].label,
    sectionLabel,
    curriculumLabel: titleInfo.curriculumLabel,
    progressLabel,
    dueLabel: getDueLabel(task),
    completedLabel: getCompletedLabel(task),
    href: TRACK_META[track].href,
  };
}

function getTrackCount(tasks: TaskViewModel[], track: TrackKey): number {
  return tasks.filter((task) => task.track === track).length;
}

function buildTrackSummary(tasks: TaskViewModel[], track: TrackKey): TrackSummary {
  const filtered = tasks.filter((task) => task.track === track);
  return {
    track,
    total: filtered.length,
    todo: filtered.filter((task) => task.status === "todo").length,
    inProgress: filtered.filter((task) => task.status === "in_progress").length,
    done: filtered.filter((task) => task.status === "done").length,
  };
}

async function tryResolveCurrentStudentRow(
  supabase: SupabaseServerClient,
  authUserId: string
): Promise<Record<string, unknown> | null> {
  const tries: Array<"id" | "auth_user_id" | "user_id" | "profile_id"> = [
    "id",
    "auth_user_id",
    "user_id",
    "profile_id",
  ];

  for (const col of tries) {
    try {
      const { data, error } = await supabase
        .from("academy_students")
        .select("*")
        .eq(col, authUserId)
        .maybeSingle();

      if (!error && data) {
        return data as Record<string, unknown>;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

async function resolveCurrentStudentProfile(
  supabase: SupabaseServerClient,
  authUserId: string
): Promise<CurrentStudentProfile> {
  const row = await tryResolveCurrentStudentRow(supabase, authUserId);

  if (!row) {
    return {
      id: null,
      label: "학생",
      state: "missing",
    };
  }

  return {
    id: asString(row.id),
    label: getStudentLabel(row),
    state: getStudentState(row),
  };
}

function resolveStudentKeys(profile: CurrentStudentProfile, authUserId: string): string[] {
  return Array.from(new Set([profile.id, authUserId].filter(Boolean) as string[]));
}

function TaskCard({ task }: { task: TaskViewModel }) {
  const priority = PRIORITY_META[task.priority];
  const trackMeta = TRACK_META[task.track];
  const statusMeta = STATUS_META[task.status];

  return (
    <Link
      href={task.href}
      className="group block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${trackMeta.tone}`}
        >
          {trackMeta.label}
        </span>

        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {task.sectionLabel}
        </span>

        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusMeta.tone}`}
        >
          {statusMeta.label}
        </span>

        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${priority.tone}`}
        >
          우선순위 {priority.label}
        </span>
      </div>

      <div className="space-y-1">
        <h3 className="line-clamp-2 text-base font-semibold text-slate-900 group-hover:text-violet-700">
          {task.title}
        </h3>

        {task.subtitle ? (
          <p className="text-sm font-medium text-slate-600">{task.subtitle}</p>
        ) : null}

        {task.description ? (
          <p className="line-clamp-2 pt-1 text-sm text-slate-500">{task.description}</p>
        ) : null}
      </div>

      <div className="mt-4 space-y-1 text-xs text-slate-500">
        {task.curriculumLabel ? <p>교재/커리큘럼: {task.curriculumLabel}</p> : null}
        {task.progressLabel ? <p>진행 라벨: {task.progressLabel}</p> : null}
        {task.dueLabel ? <p>{task.dueLabel}</p> : null}
        {task.status === "done" && task.completedLabel ? <p>{task.completedLabel}</p> : null}
      </div>
    </Link>
  );
}

export default async function DashboardTasksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">내 과제</h1>
          <p className="mt-2 text-sm text-slate-500">로그인이 필요합니다.</p>
        </div>
      </main>
    );
  }

  const currentStudent = await resolveCurrentStudentProfile(supabase, user.id);
  const studentKeys = resolveStudentKeys(currentStudent, user.id);

  const selectedTrack = normalizeTrack(sp.track) ?? null;
  const selectedStatus: StudentTaskStatus | null =
    sp.status === "todo" || sp.status === "in_progress" || sp.status === "done"
      ? sp.status
      : null;

  const { data, error } = await supabase
    .from("student_tasks")
    .select(
      "id, title, description, status, priority, kind, due_date, completed_at, created_at, updated_at, start_at, due_at, payload_json"
    )
    .in("student_id", studentKeys)
    .order("created_at", { ascending: false });

  const rawTasks = (data ?? []) as RawStudentTask[];
  const allTasks = rawTasks.map(parseTask);

  const tasks = allTasks.filter((task) => {
    if (selectedTrack && task.track !== selectedTrack) return false;
    if (selectedStatus && task.status !== selectedStatus) return false;
    return true;
  });

  const grouped: Record<StudentTaskStatus, TaskViewModel[]> = {
    todo: [],
    in_progress: [],
    done: [],
  };

  for (const task of tasks) {
    grouped[task.status].push(task);
  }

  const totalCount = tasks.length;
  const todoCount = grouped.todo.length;
  const progressCount = grouped.in_progress.length;
  const doneCount = grouped.done.length;

  const allTrackCounts = {
    voca: getTrackCount(allTasks, "voca"),
    naesin: getTrackCount(allTasks, "naesin"),
    junior: getTrackCount(allTasks, "junior"),
    toefl: getTrackCount(allTasks, "toefl"),
    unknown: getTrackCount(allTasks, "unknown"),
  };

  const trackSummaries = [
    buildTrackSummary(allTasks, "voca"),
    buildTrackSummary(allTasks, "naesin"),
    buildTrackSummary(allTasks, "junior"),
    buildTrackSummary(allTasks, "toefl"),
  ];

  const studentNotice = getStudentStateNotice(currentStudent.state);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-700">Dashboard</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">내 과제</h1>
            <p className="mt-2 text-sm text-slate-500">
              student_tasks 기준으로 현재 학생에게 할당된 과제를 표시합니다.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:min-w-[320px]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">전체</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{totalCount}</p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold text-amber-700">진행 필요</p>
              <p className="mt-1 text-2xl font-bold text-amber-900">
                {todoCount + progressCount}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold text-emerald-700">완료</p>
              <p className="mt-1 text-2xl font-bold text-emerald-900">{doneCount}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${studentStateBadgeClass(
              currentStudent.state
            )}`}
          >
            학생 상태 {studentStateLabel(currentStudent.state)}
          </span>
          <span className="text-sm font-medium text-slate-700">{currentStudent.label}</span>
        </div>

        <div className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${studentNotice.tone}`}>
          {studentNotice.message}
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            student_tasks 조회 중 오류가 발생했습니다: {error.message}
          </div>
        ) : null}

        <form className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <select
            name="track"
            defaultValue={selectedTrack ?? ""}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none"
          >
            <option value="">전체 트랙</option>
            <option value="voca">Lingo-X Voca ({allTrackCounts.voca})</option>
            <option value="naesin">Lingo-X 내신 ({allTrackCounts.naesin})</option>
            <option value="junior">Lingo-X Junior ({allTrackCounts.junior})</option>
            <option value="toefl">Lingo-X TOEFL ({allTrackCounts.toefl})</option>
            <option value="unknown">기타 ({allTrackCounts.unknown})</option>
          </select>

          <select
            name="status"
            defaultValue={selectedStatus ?? ""}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none"
          >
            <option value="">전체 상태</option>
            <option value="todo">할 일</option>
            <option value="in_progress">진행 중</option>
            <option value="done">완료</option>
          </select>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              적용
            </button>

            <Link
              href="/dashboard/tasks"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              초기화
            </Link>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {(["voca", "naesin", "junior", "toefl"] as TrackKey[]).map((track) => {
            const meta = TRACK_META[track];
            const count = allTrackCounts[track];

            return (
              <Link
                key={track}
                href={`/dashboard/tasks?track=${track}`}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${meta.tone}`}
              >
                {meta.label} {count}
              </Link>
            );
          })}

          {allTrackCounts.unknown > 0 ? (
            <Link
              href="/dashboard/tasks?track=unknown"
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${TRACK_META.unknown.tone}`}
            >
              기타 {allTrackCounts.unknown}
            </Link>
          ) : null}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {trackSummaries.map((summary) => {
          const meta = TRACK_META[summary.track];
          return (
            <div
              key={summary.track}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-500">Track Summary</p>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.tone}`}
                >
                  {meta.label}
                </span>
              </div>

              <p className="mt-3 text-3xl font-bold text-slate-900">{summary.total}</p>

              <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-600">
                <div className="rounded-2xl bg-slate-50 px-3 py-2">
                  <p className="text-slate-400">할 일</p>
                  <p className="mt-1 font-semibold text-slate-800">{summary.todo}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-2">
                  <p className="text-slate-400">진행 중</p>
                  <p className="mt-1 font-semibold text-slate-800">{summary.inProgress}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-2">
                  <p className="text-slate-400">완료</p>
                  <p className="mt-1 font-semibold text-slate-800">{summary.done}</p>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        {(["todo", "in_progress", "done"] as StudentTaskStatus[]).map((status) => {
          const meta = STATUS_META[status];
          const items = grouped[status];

          return (
            <div
              key={status}
              className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.tone}`}
                  >
                    {meta.label}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">{items.length}</span>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  {meta.empty}
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}
