import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const LEVELS = [1, 2, 3, 4, 5] as const;

type Unit = { id: string; chapter_no: number; chapter_title: string; unit_no: number; title: string; page: number | null; sort_order: number };
type Link_ = { unit_id: string; taught_level: number | null; sort_order: number; concept: { id: string; key: string; title_ko: string; tier: number } | null };
type Lesson = { concept_id: string; level: number; status: "draft" | "final" };

const gradeText = (g: string | null) => (g && /^M[1-3]$/.test(g) ? `중${g[1]}` : g ?? "");

export default async function GrammarBookTocPage({ params }: { params: Promise<{ bookKey: string }> }) {
  const { bookKey } = await params;
  const authed = await getServerSupabase();
  await authed.auth.getUser();
  const db = getServiceRoleClient();

  const { data: book } = await db.from("grammar_books").select("id, key, title, grade").eq("key", bookKey).maybeSingle();
  if (!book) notFound();

  const { data: unitData } = await db
    .from("grammar_book_units")
    .select("id, chapter_no, chapter_title, unit_no, title, page, sort_order")
    .eq("book_id", book.id)
    .order("sort_order");
  const units = (unitData ?? []) as Unit[];
  const unitIds = units.map((u) => u.id);

  const { data: linkData } = unitIds.length
    ? await db.from("grammar_unit_concepts").select("unit_id, taught_level, sort_order, concept:grammar_concepts(id, key, title_ko, tier)").in("unit_id", unitIds).order("sort_order")
    : { data: [] };
  const links = (linkData ?? []) as unknown as Link_[];

  const conceptIds = [...new Set(links.map((l) => l.concept?.id).filter(Boolean) as string[])];
  const { data: lessonData } = conceptIds.length
    ? await db.from("grammar_lessons").select("concept_id, level, status").in("concept_id", conceptIds)
    : { data: [] };
  const lessonByKey = new Map(((lessonData ?? []) as Lesson[]).map((x) => [`${x.concept_id}:${x.level}`, x.status]));

  const chapters = new Map<number, { title: string; units: Unit[] }>();
  for (const u of units) {
    if (!chapters.has(u.chapter_no)) chapters.set(u.chapter_no, { title: u.chapter_title, units: [] });
    chapters.get(u.chapter_no)!.units.push(u);
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <Link href="/admin/grammar-engine/books" className="text-sm text-violet-700 hover:underline">← 교재 목록</Link>
      <h1 className="mt-1 text-2xl font-bold text-gray-900">
        {book.title} <span className="text-base font-normal text-gray-500">{gradeText(book.grade)}</span>
      </h1>
      <p className="mt-1 text-sm text-gray-600">칸을 누르면 그 개념·레벨의 편집 화면으로 갑니다. 노란 테두리는 이 교재에서 가르치는 레벨입니다.</p>

      <div className="mt-4 space-y-4">
        {[...chapters.entries()].map(([no, ch]) => (
          <section key={no} className="overflow-hidden rounded-xl border bg-white">
            <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">
              Chapter {no} · {ch.title}
            </div>
            <ul className="divide-y">
              {ch.units.map((u) => {
                const uls = links.filter((l) => l.unit_id === u.id && l.concept);
                return (
                  <li key={u.id} className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {no}-{u.unit_no} {u.title}
                      {u.page ? <span className="ml-2 text-xs text-gray-400">p.{u.page}</span> : null}
                    </div>
                    {uls.length === 0 && <div className="mt-1 text-xs text-gray-400">연결된 개념 없음</div>}
                    {uls.map((l) => (
                      <div key={l.concept!.id} className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="min-w-[10rem] text-sm text-gray-700">{l.concept!.title_ko}</span>
                        {LEVELS.map((lv) => {
                          const st = lessonByKey.get(`${l.concept!.id}:${lv}`);
                          const taught = l.taught_level === lv;
                          const tone = st === "final" ? "bg-emerald-100 text-emerald-700" : st === "draft" ? "bg-amber-100 text-amber-700" : "bg-gray-50 text-gray-400";
                          return (
                            <Link
                              key={lv}
                              href={`/admin/grammar-engine/${l.concept!.key}/${lv}`}
                              className={`rounded px-2 py-0.5 text-xs font-medium hover:ring-2 hover:ring-violet-300 ${tone} ${taught ? "ring-2 ring-yellow-400" : ""}`}
                            >
                              L{lv}
                            </Link>
                          );
                        })}
                      </div>
                    ))}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {units.length === 0 && <div className="text-sm text-gray-500">이 교재에는 아직 단원이 없습니다.</div>}
      </div>
    </div>
  );
}
