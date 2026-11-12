import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = { level: number; concept: { key: string; title_ko: string; title_en: string; difficulty_rank: number; category: string | null } | null };

// 학생에게는 확정(final)된 레슨만 보인다 — grammar_lessons RLS 가 status = 'final' 로 제한한다.
export default async function StudentGrammarListPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login"); // 로그인이 풀렸을 때 404 대신 로그인 화면으로

  const { data } = await supabase
    .from("grammar_lessons")
    .select("level, concept:grammar_concepts(key, title_ko, title_en, difficulty_rank, category)")
    .eq("status", "final");
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => r.concept);

  const byConcept = new Map<string, { c: NonNullable<Row["concept"]>; levels: number[] }>();
  for (const r of rows) {
    const c = r.concept!;
    const e = byConcept.get(c.key) ?? { c, levels: [] };
    e.levels.push(r.level);
    byConcept.set(c.key, e);
  }
  const list = [...byConcept.values()].sort((a, b) => a.c.difficulty_rank - b.c.difficulty_rank);

  // 선생님이 잡아 준 내 일정 (오늘 · 밀린 것 · 다가오는 것). 테이블이 아직 없으면 조용히 비워 둔다.
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const { data: myPlan } = await supabase.from("student_grammar_concept_plans").select("id, level").eq("student_id", user.id).maybeSingle();
  type Sched = { scheduled_date: string; seq: number; concept: { id: string; key: string; title_ko: string } | null };
  let schedule: { date: string; key: string; title: string; ready: boolean; overdue: boolean }[] = [];
  if (myPlan) {
    const [{ data: assigns }, { data: doneRows }] = await Promise.all([
      supabase
        .from("student_grammar_concept_assignments")
        .select("scheduled_date, seq, concept:grammar_concepts(id, key, title_ko)")
        .eq("plan_id", myPlan.id)
        .order("scheduled_date")
        .order("seq"),
      supabase.from("student_grammar_concept_done").select("concept_id").eq("student_id", user.id).eq("level", myPlan.level),
    ]);
    const doneIds = new Set((doneRows ?? []).map((d) => d.concept_id as string));
    const readyKeys = new Set(rows.filter((r) => r.level === myPlan.level).map((r) => r.concept!.key));
    schedule = ((assigns ?? []) as unknown as Sched[])
      .filter((a) => a.concept && !doneIds.has(a.concept.id))
      .slice(0, 10)
      .map((a) => ({ date: a.scheduled_date, key: a.concept!.key, title: a.concept!.title_ko, ready: readyKeys.has(a.concept!.key), overdue: a.scheduled_date < today }));
  }
  const level = myPlan?.level;

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
      <h1 className="text-xl font-semibold text-neutral-900">문법 레슨</h1>
      <p className="text-sm text-neutral-600">설명을 읽고, 따라 쓰고, 문제를 풀어 보세요. 레벨 숫자가 클수록 어렵습니다.</p>
      {schedule.length > 0 && (
        <section className="space-y-2 rounded-xl border border-violet-200 bg-violet-50/40 p-4">
          <h2 className="text-sm font-semibold text-violet-900">내 문법 일정</h2>
          <ul className="divide-y rounded-lg border bg-white text-sm">
            {schedule.map((s, i) => (
              <li key={i} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="w-12 shrink-0 text-xs text-neutral-500">{s.date === today ? "오늘" : s.date.slice(5).replace("-", "/")}</span>
                <span className="flex-1 truncate text-neutral-900">{s.title}</span>
                {s.overdue && <span className="rounded bg-rose-50 px-1.5 text-xs text-rose-700">밀림</span>}
                {s.ready ? (
                  <Link href={`/student/grammar/${s.key}/${level}`} className="rounded-lg border px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-50">
                    L{level} 시작
                  </Link>
                ) : (
                  <span className="text-xs text-neutral-400">준비 중</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {list.length === 0 && <div className="rounded-xl border bg-white p-6 text-sm text-neutral-500">아직 공개된 레슨이 없습니다.</div>}
      <div className="space-y-3">
        {list.map(({ c, levels }) => (
          <div key={c.key} className="rounded-xl border bg-white p-4">
            {c.category && <div className="text-xs text-neutral-500">{c.category}</div>}
            <div className="font-medium text-neutral-900">
              {c.title_ko} <span className="text-xs font-normal text-neutral-500">{c.title_en}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {levels.sort().map((lv) => (
                <Link key={lv} href={`/student/grammar/${c.key}/${lv}`} className="rounded-lg border px-3 py-1 text-sm font-medium text-violet-700 hover:bg-violet-50">
                  L{lv}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
