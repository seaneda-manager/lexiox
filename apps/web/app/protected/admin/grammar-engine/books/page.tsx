import Link from "next/link";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Book = { id: string; key: string; title: string; grade: string | null; kind: string };

const gradeText = (g: string | null) => (g && /^M[1-3]$/.test(g) ? `중${g[1]}` : g ?? "");

export default async function GrammarBooksPage() {
  let books: Book[] = [];
  let units: { book_id: string; id: string }[] = [];
  let links: { unit_id: string; concept_id: string }[] = [];
  let lessons: { concept_id: string; level: number; status: string }[] = [];
  let loadError: string | null = null;

  try {
    const authed = await getServerSupabase();
    await authed.auth.getUser();
    const db = getServiceRoleClient();
    const [b, u, l, g] = await Promise.all([
      db.from("grammar_books").select("id, key, title, grade, kind").order("grade").order("title"),
      db.from("grammar_book_units").select("id, book_id"),
      db.from("grammar_unit_concepts").select("unit_id, concept_id"),
      db.from("grammar_lessons").select("concept_id, level, status"),
    ]);
    const err = b.error ?? u.error ?? l.error ?? g.error;
    if (err) loadError = err.message;
    books = (b.data ?? []) as Book[];
    units = (u.data ?? []) as typeof units;
    links = (l.data ?? []) as typeof links;
    lessons = (g.data ?? []) as typeof lessons;
  } catch (e: any) {
    loadError = e?.message ?? "로드 실패";
  }

  const bookOfUnit = new Map(units.map((u) => [u.id, u.book_id]));
  const conceptsByBook = new Map<string, Set<string>>();
  for (const l of links) {
    const bid = bookOfUnit.get(l.unit_id);
    if (!bid) continue;
    if (!conceptsByBook.has(bid)) conceptsByBook.set(bid, new Set());
    conceptsByBook.get(bid)!.add(l.concept_id);
  }
  const lessonsByConcept = new Map<string, { final: number; draft: number }>();
  for (const x of lessons) {
    const s = lessonsByConcept.get(x.concept_id) ?? { final: 0, draft: 0 };
    if (x.status === "final") s.final++;
    else s.draft++;
    lessonsByConcept.set(x.concept_id, s);
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">문법 엔진 · 교재별 목차</h1>
        <Link href="/admin/grammar-engine" className="text-sm text-violet-700 hover:underline">← 개념 × 레벨 표</Link>
      </div>
      <p className="mt-1 text-sm text-gray-600">교재를 누르면 챕터-유닛 목차가 나오고, 유닛의 개념을 누르면 해당 레벨 칸으로 들어갑니다.</p>

      {loadError && <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">불러오기 실패: {loadError}</div>}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {books.map((b) => {
          const cs = [...(conceptsByBook.get(b.id) ?? [])];
          const final = cs.reduce((n, c) => n + (lessonsByConcept.get(c)?.final ?? 0), 0);
          const draft = cs.reduce((n, c) => n + (lessonsByConcept.get(c)?.draft ?? 0), 0);
          const unitCount = units.filter((u) => u.book_id === b.id).length;
          return (
            <Link key={b.id} href={`/admin/grammar-engine/books/${b.key}`} className="rounded-xl border bg-white p-4 hover:ring-2 hover:ring-violet-300">
              <div className="text-xs text-gray-500">{gradeText(b.grade)}</div>
              <div className="mt-0.5 text-base font-semibold text-gray-900">{b.title}</div>
              <div className="mt-2 text-xs text-gray-500">
                유닛 {unitCount} · 개념 {cs.length} · 확정 레슨 {final} · 초안 {draft}
              </div>
            </Link>
          );
        })}
        {!loadError && books.length === 0 && <div className="text-sm text-gray-500">등록된 교재가 없습니다.</div>}
      </div>
    </div>
  );
}
