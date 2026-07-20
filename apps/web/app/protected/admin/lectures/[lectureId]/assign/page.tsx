import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { assignLectureAction } from "../../actions";

export const dynamic = "force-dynamic";

type Student = { id: string; user_id: string | null; full_name: string | null; display_name: string | null; login_id: string | null };
type Assignment = {
  id: string;
  student_id: string | null;
  due_at: string | null;
  created_at: string;
};

function studentLabel(s: Student) {
  return s.full_name || s.display_name || s.login_id || s.id.slice(0, 8);
}

export default async function AssignLecturePage({
  params,
}: {
  params: Promise<{ lectureId: string }>;
}) {
  const { lectureId } = await params;
  const supabase = await getServerSupabase();

  const [{ data: lec }, { data: students }, { data: assignments }] = await Promise.all([
    supabase.from("lectures").select("id, title").eq("id", lectureId).maybeSingle(),
    supabase.from("academy_students").select("id, user_id, full_name, display_name, login_id").eq("is_active", true).order("full_name"),
    supabase
      .from("lecture_assignments")
      .select("id, student_id, due_at, created_at")
      .eq("lecture_id", lectureId)
      .order("created_at", { ascending: false }),
  ]);

  if (!lec) notFound();

  const studentList = (students ?? []) as Student[];
  const assignmentList = (assignments ?? []) as Assignment[];
  const studentMap = new Map(studentList.flatMap((s) => s.user_id ? [[s.user_id, s]] : [[s.id, s]]));

  const assignWithId = assignLectureAction.bind(null, lectureId);

  return (
    <main className="mx-auto max-w-xl space-y-6 px-6 py-8">
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-widest text-neutral-400">Admin / Lectures / 배정</div>
        <h1 className="text-xl font-semibold">{(lec as { title: string }).title}</h1>
      </div>

      <section className="rounded-2xl border bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-700">학생 배정</h2>
        <form action={assignWithId} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-600">학생 *</label>
            <select
              name="student_id"
              required
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
            >
              <option value="">학생 선택</option>
              {studentList.map((s) => (
                <option key={s.id} value={s.user_id ?? s.id}>{studentLabel(s)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-600">마감일</label>
            <input
              name="due_date"
              type="date"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            배정
          </button>
        </form>
      </section>

      {assignmentList.length > 0 && (
        <section className="rounded-2xl border bg-white p-6 space-y-3">
          <h2 className="text-sm font-semibold text-neutral-700">배정 현황 ({assignmentList.length}명)</h2>
          <div className="space-y-2">
            {assignmentList.map((a) => {
              const s = a.student_id ? studentMap.get(a.student_id) : null;
              const label = s ? studentLabel(s) : (a.student_id?.slice(0, 8) ?? "-");
              const due = a.due_at
                ? new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(new Date(a.due_at))
                : null;
              return (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-neutral-100 px-3 py-2 text-sm">
                  <span className="text-neutral-800">{label}</span>
                  {due && <span className="text-xs text-neutral-400">마감 {due}</span>}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
