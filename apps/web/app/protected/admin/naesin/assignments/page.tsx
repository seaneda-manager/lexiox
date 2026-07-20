import Link from "next/link";

type TargetType = "class" | "student";
type Status = "draft" | "assigned" | "in_progress" | "completed" | "closed";

type NaesinAssignmentRow = {
  id: string;
  title: string;
  scopeTitle: string;
  targetType: TargetType;
  targetLabel: string;
  assignedCount: number;
  completedCount: number;
  status: Status;
  dueAt: string;
  updatedAt: string;
};

const rows: NaesinAssignmentRow[] = [
  {
    id: "na_asg_001",
    title: "송도고1-1 중간 범위 A 배정",
    scopeTitle: "송도고1-1 중간 범위 A",
    targetType: "class",
    targetLabel: "고1A반",
    assignedCount: 18,
    completedCount: 7,
    status: "assigned",
    dueAt: "2026-03-20",
    updatedAt: "2026-03-14 10:20",
  },
  {
    id: "na_asg_002",
    title: "중2-1 1차 내신 범위 배정",
    scopeTitle: "중2-1 1차 내신 범위",
    targetType: "student",
    targetLabel: "student_001",
    assignedCount: 1,
    completedCount: 0,
    status: "in_progress",
    dueAt: "2026-03-18",
    updatedAt: "2026-03-14 09:15",
  },
  {
    id: "na_asg_003",
    title: "고1 3월 실전 범위 배정",
    scopeTitle: "고1 3월 실전 범위",
    targetType: "class",
    targetLabel: "고1B반",
    assignedCount: 16,
    completedCount: 16,
    status: "completed",
    dueAt: "2026-03-13",
    updatedAt: "2026-03-13 18:40",
  },
];

function targetTypeLabel(targetType: TargetType) {
  switch (targetType) {
    case "class":
      return "반";
    case "student":
      return "학생";
    default:
      return targetType;
  }
}

function statusLabel(status: Status) {
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
      return status;
  }
}

function statusBadgeClass(status: Status) {
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

export const dynamic = "force-dynamic";

export default function AdminNaesinAssignmentsPage() {
  const totalCount = rows.length;
  const assignedCount = rows.filter((row) => row.status === "assigned").length;
  const inProgressCount = rows.filter((row) => row.status === "in_progress").length;
  const completedCount = rows.filter((row) => row.status === "completed").length;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-[0.18em] text-neutral-400">
            Admin / Naesin / Assignments
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            내신 과제 배정
          </h1>
          <p className="text-sm text-neutral-500">
            시험 범위를 학생 또는 반에 실제로 배정하는 운영 레이어.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/naesin/scopes"
            className="rounded-xl border px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            시험 범위
          </Link>
          <Link
            href="/admin/assignments"
            className="rounded-xl border px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            공통 과제 보드
          </Link>
          <Link
            href="/admin/naesin/assignments/new"
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            새 배정 만들기
          </Link>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs font-medium text-neutral-500">전체 배정</div>
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
          <div className="mt-2 text-2xl font-semibold text-emerald-700">{completedCount}</div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4">
        <form className="grid gap-3 md:grid-cols-5">
          <input
            name="q"
            placeholder="배정 제목 / 범위 / 대상 검색"
            className="rounded-xl border px-3 py-2 text-sm outline-none"
          />

          <select name="targetType" className="rounded-xl border px-3 py-2 text-sm outline-none">
            <option value="">전체 대상</option>
            <option value="class">반</option>
            <option value="student">학생</option>
          </select>

          <select name="status" className="rounded-xl border px-3 py-2 text-sm outline-none">
            <option value="">전체 상태</option>
            <option value="draft">초안</option>
            <option value="assigned">배정됨</option>
            <option value="in_progress">진행중</option>
            <option value="completed">완료</option>
            <option value="closed">마감</option>
          </select>

          <input
            name="dueAt"
            placeholder="마감일 검색"
            className="rounded-xl border px-3 py-2 text-sm outline-none"
          />

          <button
            type="submit"
            className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
          >
            적용
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-semibold text-neutral-900">내신 배정 목록</div>
          <div className="text-xs text-neutral-500">다음 단계에서 DB 조회로 교체</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-600">
              <tr className="[&>th]:px-4 [&>th]:py-3">
                <th>제목</th>
                <th>범위</th>
                <th>대상 유형</th>
                <th>대상</th>
                <th>진행</th>
                <th>상태</th>
                <th>마감일</th>
                <th>수정일</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t [&>td]:px-4 [&>td]:py-3">
                  <td>
                    <div className="space-y-1">
                      <Link
                        href={`/admin/assignments/${row.id}`}
                        className="font-medium text-neutral-900 hover:underline"
                      >
                        {row.title}
                      </Link>
                      <div className="text-xs text-neutral-500">내신 scope 기반 배정</div>
                    </div>
                  </td>

                  <td className="text-neutral-700">{row.scopeTitle}</td>
                  <td className="text-neutral-700">{targetTypeLabel(row.targetType)}</td>
                  <td className="text-neutral-700">{row.targetLabel}</td>
                  <td className="text-neutral-700">
                    {row.completedCount} / {row.assignedCount}
                  </td>

                  <td>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                        row.status,
                      )}`}
                    >
                      {statusLabel(row.status)}
                    </span>
                  </td>

                  <td className="text-neutral-700">{row.dueAt}</td>
                  <td className="text-neutral-700">{row.updatedAt}</td>

                  <td>
                    <div className="flex flex-col items-start gap-2">
                      <Link
                        href={`/admin/assignments/${row.id}`}
                        className="text-xs font-medium text-neutral-700 hover:underline"
                      >
                        상세
                      </Link>
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

              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-sm text-neutral-500"
                  >
                    등록된 내신 배정이 없습니다.
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
