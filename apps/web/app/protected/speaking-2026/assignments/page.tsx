import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function fmtDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending:     { text: "미시작",   cls: "bg-slate-100 text-slate-600" },
  in_progress: { text: "진행중",   cls: "bg-amber-100 text-amber-700" },
  completed:   { text: "완료",     cls: "bg-emerald-100 text-emerald-700" },
};

export default async function SpeakingAssignmentsPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: assignments } = await supabase
    .from("test_assignments")
    .select(`
      id, status, due_date, assigned_at, sections,
      speaking_test_id,
      speaking_tests!test_assignments_speaking_test_id_fkey (
        id, label
      )
    `)
    .eq("student_id", user.id)
    .contains("sections", ["speaking"])
    .order("assigned_at", { ascending: false });

  const list = assignments ?? [];

  return (
    <main className="mx-auto max-w-xl space-y-5 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-slate-900">Speaking 시험</h1>
        <p className="text-xs text-slate-400">선생님이 배정한 시험 목록입니다.</p>
      </header>

      {list.length === 0 ? (
        <div className="rounded-xl border bg-white px-6 py-10 text-center text-sm text-slate-400">
          배정된 시험이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((a) => {
            const test = Array.isArray(a.speaking_tests) ? a.speaking_tests[0] : a.speaking_tests;
            const statusInfo = STATUS_LABEL[a.status] ?? STATUS_LABEL.pending;
            const canStart = a.status !== "completed";

            return (
              <div key={a.id} className="flex items-center justify-between rounded-xl border bg-white px-4 py-4 shadow-sm">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {test?.label ?? "시험"}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${statusInfo.cls}`}>
                      {statusInfo.text}
                    </span>
                    {a.due_date && <span>마감 {fmtDate(a.due_date)}</span>}
                  </div>
                </div>

                {canStart ? (
                  <Link
                    href={`/speaking-2026/assignments/${a.id}/start`}
                    className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-600"
                  >
                    {a.status === "in_progress" ? "이어하기" : "시작"}
                  </Link>
                ) : (
                  <span className="rounded-lg border px-4 py-2 text-xs font-medium text-slate-400">
                    완료
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
