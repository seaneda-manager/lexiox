import Link from "next/link";

type PageProps = {
  params: Promise<{ assignmentId: string }>;
};

type TaskStatus = "not_started" | "in_progress" | "completed" | "overdue";

type StudentTaskDetail = {
  id: string;
  title: string;
  track: "naesin" | "junior" | "toefl";
  section: "reading" | "listening" | "speaking" | "writing" | "grammar" | "vocab";
  kind: "scope" | "content";
  dueAt: string;
  status: TaskStatus;
  description: string;
  scopeLabel?: string;
  contentLabel?: string;
  reviewRequired: boolean;
  retryAllowed: boolean;
};

const taskMap: Record<string, StudentTaskDetail> = {
  asg_001: {
    id: "asg_001",
    title: "송도고1-1 중간 범위 A",
    track: "naesin",
    section: "reading",
    kind: "scope",
    dueAt: "2026-03-20",
    status: "not_started",
    description:
      "내신 시험 범위 기반 과제입니다. 범위 안의 Reading 콘텐츠를 풀고 제출한 뒤, 정답 근거와 핵심 문장을 리뷰합니다.",
    scopeLabel: "송도고1-1 중간 범위 A",
    reviewRequired: true,
    retryAllowed: true,
  },
  asg_002: {
    id: "asg_002",
    title: "Junior Reading Passage 01",
    track: "junior",
    section: "reading",
    kind: "content",
    dueAt: "2026-03-19",
    status: "in_progress",
    description:
      "주니어 Reading 직접 배정 과제입니다. 콘텐츠 단위로 들어가서 풀이를 진행합니다.",
    contentLabel: "Junior Reading Passage 01",
    reviewRequired: true,
    retryAllowed: true,
  },
  asg_003: {
    id: "asg_003",
    title: "TOEFL Reading Drill Set 01",
    track: "toefl",
    section: "reading",
    kind: "content",
    dueAt: "2026-03-13",
    status: "completed",
    description:
      "TOEFL Reading 콘텐츠 과제입니다. 제출이 완료된 상태이며, 결과/리뷰 페이지로 바로 진입할 수 있습니다.",
    contentLabel: "TOEFL Reading Drill Set 01",
    reviewRequired: true,
    retryAllowed: false,
  },
};

function trackLabel(track: StudentTaskDetail["track"]) {
  switch (track) {
    case "naesin":
      return "내신";
    case "junior":
      return "주니어";
    case "toefl":
      return "TOEFL";
    default:
      return track;
  }
}

function sectionLabel(section: StudentTaskDetail["section"]) {
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
    default:
      return section;
  }
}

function kindLabel(kind: StudentTaskDetail["kind"]) {
  switch (kind) {
    case "scope":
      return "범위 과제";
    case "content":
      return "콘텐츠 과제";
    default:
      return kind;
  }
}

function statusLabel(status: TaskStatus) {
  switch (status) {
    case "not_started":
      return "미시작";
    case "in_progress":
      return "진행중";
    case "completed":
      return "완료";
    case "overdue":
      return "기한 지남";
    default:
      return status;
  }
}

function statusBadgeClass(status: TaskStatus) {
  switch (status) {
    case "not_started":
      return "border-neutral-300 bg-neutral-50 text-neutral-700";
    case "in_progress":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "overdue":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-neutral-300 bg-neutral-50 text-neutral-700";
  }
}

export const dynamic = "force-dynamic";

export default async function DashboardTaskDetailPage({ params }: PageProps) {
  const { assignmentId } = await params;
  const task = taskMap[assignmentId];

  if (!task) {
    return (
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <div className="rounded-2xl border bg-white px-4 py-10 text-center text-sm text-neutral-500">
          해당 과제를 찾을 수 없습니다.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.18em] text-neutral-400">
            Student / Tasks / Detail
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              {task.title}
            </h1>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                task.status,
              )}`}
            >
              {statusLabel(task.status)}
            </span>
          </div>

          <p className="text-sm text-neutral-500">
            {trackLabel(task.track)} · {sectionLabel(task.section)} · {kindLabel(task.kind)} · 마감일{" "}
            {task.dueAt}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/tasks"
            className="rounded-xl border px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            과제 목록
          </Link>
        </div>
      </header>

      <section className="rounded-2xl border bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900">과제 안내</h2>
        <p className="mt-3 text-sm leading-6 text-neutral-700">{task.description}</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border bg-neutral-50 p-4">
            <div className="text-xs font-medium text-neutral-500">범위 / 콘텐츠</div>
            <div className="mt-2 text-sm font-medium text-neutral-900">
              {task.scopeLabel ?? task.contentLabel ?? "-"}
            </div>
          </div>

          <div className="rounded-xl border bg-neutral-50 p-4">
            <div className="text-xs font-medium text-neutral-500">옵션</div>
            <div className="mt-2 space-y-1 text-sm text-neutral-700">
              <div>Review 필수: {task.reviewRequired ? "예" : "아니오"}</div>
              <div>재시도 허용: {task.retryAllowed ? "예" : "아니오"}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900">다음 동작</h2>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/reading"
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            과제 시작
          </Link>

          <Link
            href="/dashboard/tasks"
            className="rounded-xl border px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            나중에 하기
          </Link>

          {task.status === "completed" ? (
            <Link
              href="/reading/review"
              className="rounded-xl border px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              결과 / 리뷰 보기
            </Link>
          ) : null}
        </div>

        <p className="mt-3 text-xs text-neutral-500">
          현재는 Day 4 연결 버전이라 Reading runner / review route에 우선 연결한다.
        </p>
      </section>
    </main>
  );
}
