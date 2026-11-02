import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = { level: number; concept: { key: string; title_ko: string; title_en: string; difficulty_rank: number; category: string | null } | null };

// 학생에게는 확정(final)된 레슨만 보인다 — grammar_lessons RLS 가 status = 'final' 로 제한한다.
export default async function StudentGrammarListPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

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

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
      <h1 className="text-xl font-semibold text-neutral-900">문법 레슨</h1>
      <p className="text-sm text-neutral-600">설명을 읽고, 따라 쓰고, 문제를 풀어 보세요. 레벨 숫자가 클수록 어렵습니다.</p>
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
