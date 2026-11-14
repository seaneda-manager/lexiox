// 영역 홈(Reading/Listening/Speaking/Writing) 상단: 새로 배정된 시험 알림. 서버 컴포넌트.
// 새로 배정된 회차가 없으면 아무것도 그리지 않는다.
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { ASSIGN_LIST_HREF, loadNewAssignments, type AssignSkill } from "@/lib/student/newAssignments";

function fmt(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default async function NewAssignmentsNotice({ skill }: { skill: AssignSkill }) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const list = (await loadNewAssignments(supabase, user.id, [skill]))[skill];
  if (list.length === 0) return null;

  return (
    <section className="rounded-xl border border-rose-200 bg-rose-50/70 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
          {list.length}
        </span>
        <h2 className="text-sm font-bold text-rose-900">새로 배정된 시험이 있어요</h2>
      </div>
      <ul className="space-y-1.5">
        {list.map((a) => (
          <li key={a.id}>
            <Link
              href={ASSIGN_LIST_HREF[skill]}
              className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-rose-100 hover:ring-rose-300"
            >
              <span className="rounded bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">NEW</span>
              <span className="min-w-0 flex-1 truncate font-semibold text-slate-900">{a.label}</span>
              <span className="shrink-0 text-[11px] text-slate-500">
                {a.assignedAt && <>배정 {fmt(a.assignedAt)}</>}
                {a.dueDate && <> · 마감 {fmt(a.dueDate)}</>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
