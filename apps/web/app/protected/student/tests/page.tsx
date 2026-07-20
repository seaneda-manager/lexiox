// apps/web/app/(protected)/student/tests/page.tsx
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";

type AssignmentRow = {
  id: string;
  template_id: string;
  student_id: string;
  teacher_id: string | null;
  kind: "full" | "half" | "section";
  due_at: string | null;
  expires_at: string | null;
  status: "assigned" | "in_progress" | "completed" | "expired" | "cancelled";
  created_at: string;
  template?: {
    id: string;
    label: string;
    kind: "full" | "half" | "section";
  } | null;
  sessions?: {
    id: string;
    total_score: number | null;
    section_scores: any | null;
    created_at: string;
  }[] | null;
};

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const now = Date.now();
  const exp = new Date(expiresAt).getTime();
  return exp < now;
}

function daysUntil(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const now = Date.now();
  const exp = new Date(expiresAt).getTime();
  const diffMs = exp - now;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function formatDue(expiresAt: string | null): string {
  if (!expiresAt) return "기한 제한 없음";
  const d = new Date(expiresAt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatKind(kind: "full" | "half" | "section"): string {
  if (kind === "full") return "Full Test";
  if (kind === "half") return "Half Test";
  return "Individual";
}

function formatStatus(status: AssignmentRow["status"]): string {
  switch (status) {
    case "assigned":
      return "배정됨";
    case "in_progress":
      return "진행 중";
    case "completed":
      return "완료";
    case "expired":
      return "만료됨";
    case "cancelled":
      return "취소됨";
    default:
      return status;
  }
}

export default async function StudentTestsPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // (protected 레이아웃이라 실제로는 잘 안 오겠지만 방어용)
    return null;
  }

  const { data: rows, error } = await supabase
    .from("test_assignments")
    .select(
      `
      id, template_id, student_id, teacher_id, kind, due_at, expires_at, status, created_at,
      template:test_templates (
        id, label, kind
      ),
      sessions:test_sessions (
        id, total_score, section_scores, created_at
      )
    `,
    )
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load assignments", error);
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-xl font-bold">My Tests</h1>
        <p className="mt-4 text-sm text-red-600">
          시험 정보를 불러오는 중 오류가 발생했습니다.
        </p>
      </main>
    );
  }

  // 🔧 여기서 Supabase 결과 → AssignmentRow[]로 안전하게 변환
  const assignments: AssignmentRow[] = (rows ?? []).map((row: any) => {
    const tpl = Array.isArray(row.template) ? row.template[0] : row.template;

    return {
      id: String(row.id),
      template_id: String(row.template_id),
      student_id: String(row.student_id),
      teacher_id: row.teacher_id ? String(row.teacher_id) : null,
      kind: row.kind as AssignmentRow["kind"],
      due_at: row.due_at,
      expires_at: row.expires_at,
      status: row.status as AssignmentRow["status"],
      created_at: row.created_at,
      template: tpl
        ? {
            id: String(tpl.id),
            label: String(tpl.label),
            kind: tpl.kind as AssignmentRow["kind"],
          }
        : null,
      sessions: row.sessions
        ? row.sessions.map((s: any) => ({
            id: String(s.id),
            total_score: s.total_score,
            section_scores: s.section_scores,
            created_at: s.created_at,
          }))
        : null,
    };
  });

  const nowAssigned = assignments.filter(
    (a) =>
      (a.status === "assigned" || a.status === "in_progress") &&
      !isExpired(a.expires_at),
  );
  const completed = assignments.filter((a) => a.status === "completed");

  const expiringSoon = nowAssigned.filter((a) => {
    const d = daysUntil(a.expires_at);
    return d !== null && d >= 0 && d <= 3;
  });

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">My Tests</h1>
        <p className="text-sm text-gray-600">
          여기에서 선생님 또는 관리자에게 배정된 시험을 확인하고 응시할 수
          있습니다.
        </p>
      </header>

      {/* 곧 만료되는 시험 알림 */}
      {expiringSoon.length > 0 && (
        <section className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm">
          <div className="font-semibold text-amber-800">
            ⚠ 곧 만료되는 시험이 {expiringSoon.length}개 있습니다.
          </div>
          <ul className="mt-2 space-y-1 text-amber-900">
            {expiringSoon.map((a) => {
              const d = daysUntil(a.expires_at);
              return (
                <li key={a.id}>
                  • {a.template?.label ?? "이름 없는 시험"} —{" "}
                  {d === 0
                    ? "오늘까지 응시 가능"
                    : d !== null
                      ? `D-${d} (${formatDue(a.expires_at)}까지)`
                      : "기한 정보 없음"}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Assigned 섹션 */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold">Assigned</h2>
          <span className="text-xs text-gray-500">
            아직 응시하지 않았거나 진행 중인 시험
          </span>
        </div>

        {nowAssigned.length === 0 ? (
          <p className="text-sm text-gray-500">
            현재 배정된 시험이 없습니다. 선생님이 새로운 시험을 배정하면 여기에
            표시됩니다.
          </p>
        ) : (
          <div className="space-y-3">
            {nowAssigned.map((a) => {
              const d = daysUntil(a.expires_at);
              const attemptsCount = a.sessions?.length ?? 0;
              const isInProgress = a.status === "in_progress";

              const expText =
                d === null
                  ? "기한 제한 없음"
                  : d < 0
                    ? "만료됨"
                    : d === 0
                      ? `오늘까지 (${formatDue(a.expires_at)})`
                      : `D-${d} (${formatDue(a.expires_at)}까지)`;

              const expClass =
                d === null
                  ? "text-gray-500"
                  : d < 0
                    ? "text-red-600"
                    : d <= 3
                      ? "text-amber-600"
                      : "text-gray-600";

              return (
                <article
                  key={a.id}
                  className="space-y-2 rounded-md border bg-white p-4 shadow-sm"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold">
                        {a.template?.label ?? "이름 없는 시험"}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {formatKind(a.kind)}
                        {attemptsCount > 0
                          ? ` · 이전 응시 ${attemptsCount}회`
                          : ""}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-gray-500">
                      {formatStatus(a.status)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className={expClass}>만료: {expText}</span>
                    {a.due_at && (
                      <span className="text-gray-500">
                        권장 마감일: {formatDue(a.due_at)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1 text-xs">
                    {/* TODO: assignment 기반 실제 러너 페이지로 연결 */}
                    <Link
                      href={`/toefl-2026/test/full?assignmentId=${a.id}`}
                      className="inline-flex items-center rounded bg-gray-900 px-3 py-1.5 font-medium text-white hover:bg-gray-800"
                    >
                      {isInProgress ? "Continue" : "Start Test"}
                    </Link>

                    {/* 나중에: 선생님에게 재배정 요청 / 취소 요청 같은 액션 */}
                    {/* <button
                      type="button"
                      className="inline-flex items-center rounded border px-3 py-1.5 text-gray-700 hover:bg-gray-50"
                    >
                      시험 취소 요청
                    </button> */}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Completed 섹션 */}
      <section className="space-y-3 border-t pt-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold">Completed</h2>
          <span className="text-xs text-gray-500">
            이미 응시한 시험과 요약 정보
          </span>
        </div>

        {completed.length === 0 ? (
          <p className="text-sm text-gray-500">
            아직 완료된 시험이 없습니다.
          </p>
        ) : (
          <div className="space-y-3">
            {completed.map((a) => {
              const sessions = a.sessions ?? [];
              const latest = sessions[0]; // created_at desc로 가져왔다고 가정

              const totalScore = latest?.total_score ?? null;

              return (
                <article
                  key={a.id}
                  className="space-y-2 rounded-md border bg-white p-4 shadow-sm"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold">
                        {a.template?.label ?? "이름 없는 시험"}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {formatKind(a.kind)} · 응시 {sessions.length}회
                      </p>
                    </div>
                    <span className="text-xs font-medium text-emerald-700">
                      완료
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    {latest ? (
                      <>
                        <span className="text-gray-600">
                          마지막 응시:{" "}
                          {formatDue(latest.created_at.split("T")[0])}
                        </span>
                        {totalScore !== null && (
                          <span className="font-semibold text-gray-800">
                            Score: {totalScore}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-500">
                        세션 정보가 없습니다.
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1 text-xs">
                    <Link
                      href={`/student/tests/${a.id}/report`}
                      className="inline-flex items-center rounded border px-3 py-1.5 text-gray-800 hover:bg-gray-50"
                    >
                      View Report
                    </Link>

                    {/* 나중에: 재응시 요청 */}
                    <button
                      type="button"
                      className="inline-flex items-center rounded border px-3 py-1.5 text-gray-600 hover:bg-gray-50"
                      disabled
                    >
                      Retake Request (TODO)
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
