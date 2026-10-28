import { Fragment } from "react";
import Link from "next/link";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const LEVELS = [1, 2, 3, 4, 5] as const;

type Concept = { id: string; key: string; title_ko: string; title_en: string; tier: number; difficulty_rank: number; category: string | null; status: string };
type LessonRow = { concept_id: string; level: number; status: "draft" | "final"; source: string };
type UnitRow = { concept_id: string; unit: { chapter_no: number; unit_no: number; title: string; page: number | null } | null };

// 필수 레벨 = tier-1 ~ tier+1 (1~5로 자름). docs/GRAMMAR_LEVELS_AND_SCHEMA_DESIGN.md
const requiredRange = (tier: number): [number, number] => [Math.max(1, tier - 1), Math.min(5, tier + 1)];

function Cell({ lesson, required, href }: { lesson?: LessonRow; required: boolean; href: string }) {
  if (lesson) {
    const final = lesson.status === "final";
    return (
      <Link
        href={href}
        title={`${lesson.status} · ${lesson.source}`}
        className={`inline-block min-w-[3.25rem] rounded px-2 py-0.5 text-xs font-medium hover:ring-2 hover:ring-violet-300 ${
          final ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
        }`}
      >
        {final ? "확정" : "초안"}
      </Link>
    );
  }
  return required ? (
    <Link href={href} className="inline-block min-w-[3.25rem] rounded border border-dashed border-rose-300 px-2 py-0.5 text-xs text-rose-500 hover:bg-rose-50">필요</Link>
  ) : (
    <Link href={href} className="inline-block min-w-[3.25rem] px-2 py-0.5 text-xs text-gray-300 hover:text-violet-500">—</Link>
  );
}

export default async function GrammarEnginePage() {
  let concepts: Concept[] = [];
  let lessons: LessonRow[] = [];
  let unitRows: UnitRow[] = [];
  let loadError: string | null = null;

  try {
    const authed = await getServerSupabase();
    await authed.auth.getUser();
    const db = getServiceRoleClient();
    const [c, l, u] = await Promise.all([
      db.from("grammar_concepts").select("id, key, title_ko, title_en, tier, difficulty_rank, category, status").order("difficulty_rank"),
      db.from("grammar_lessons").select("concept_id, level, status, source"),
      db.from("grammar_unit_concepts").select("concept_id, unit:grammar_book_units(chapter_no, unit_no, title, page)").order("sort_order"),
    ]);
    const err = c.error ?? l.error ?? u.error;
    if (err) loadError = err.message;
    concepts = (c.data ?? []) as Concept[];
    lessons = (l.data ?? []) as LessonRow[];
    unitRows = (u.data ?? []) as unknown as UnitRow[];
  } catch (e: any) {
    loadError = e?.message ?? "로드 실패";
  }

  const lessonByKey = new Map(lessons.map((x) => [`${x.concept_id}:${x.level}`, x]));
  const unitsByConcept = new Map<string, UnitRow["unit"][]>();
  for (const r of unitRows) {
    if (!r.unit) continue;
    unitsByConcept.set(r.concept_id, [...(unitsByConcept.get(r.concept_id) ?? []), r.unit]);
  }

  let needed = 0;
  let done = 0;
  for (const c of concepts) {
    const [lo, hi] = requiredRange(c.tier);
    for (let lv = lo; lv <= hi; lv++) {
      needed++;
      if (lessonByKey.get(`${c.id}:${lv}`)?.status === "final") done++;
    }
  }
  const draftCount = lessons.filter((x) => x.status === "draft").length;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-900">문법 엔진 · 개념 × 레벨</h1>
      <p className="mt-1 text-sm text-gray-600">
        개념은 난이도순입니다. 칸은 레벨(L1~L5)별 레슨 상태이고, 필수 레벨(tier±1)이 비어 있으면 &quot;필요&quot;로 표시됩니다.
      </p>

      {loadError && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          불러오기 실패: {loadError}
          <div className="mt-1 text-xs text-rose-600">마이그레이션(20261028000001)과 seed-grammar-engine.ts 를 적용했는지 확인하세요.</div>
        </div>
      )}

      {!loadError && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["개념", concepts.length],
            ["필수 레슨(tier±1)", needed],
            ["확정", `${done} / ${needed}`],
            ["초안", draftCount],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-lg border bg-white p-3">
              <div className="text-xs text-gray-500">{label}</div>
              <div className="text-xl font-semibold text-gray-900">{value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">개념</th>
              <th className="px-3 py-2">tier</th>
              {LEVELS.map((lv) => (
                <th key={lv} className="px-3 py-2 text-center">L{lv}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {concepts.map((c, i) => {
              const [lo, hi] = requiredRange(c.tier);
              const units = unitsByConcept.get(c.id) ?? [];
              const newCategory = i === 0 || concepts[i - 1].category !== c.category;
              return (
                <Fragment key={c.id}>
                  {newCategory && (
                    <tr className="bg-gray-50/60">
                      <td colSpan={8} className="px-3 py-1 text-xs font-semibold text-gray-500">{c.category ?? "기타"}</td>
                    </tr>
                  )}
                  <tr className="border-t align-top">
                    <td className="px-3 py-2 text-gray-400">{c.difficulty_rank}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{c.title_ko}</div>
                      <div className="text-xs text-gray-500">{c.title_en}</div>
                      {units.length > 0 && (
                        <details className="mt-1 text-xs text-gray-500">
                          <summary className="cursor-pointer select-none">유닛 {units.length}개</summary>
                          <ul className="mt-1 space-y-0.5">
                            {units.map((u) => (
                              <li key={`${u!.chapter_no}-${u!.unit_no}`}>
                                {u!.chapter_no}-{u!.unit_no} {u!.title}
                                {u!.page ? ` (p.${u!.page})` : ""}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{c.tier}</td>
                    {LEVELS.map((lv) => (
                      <td key={lv} className="px-3 py-2 text-center">
                        <Cell lesson={lessonByKey.get(`${c.id}:${lv}`)} required={lv >= lo && lv <= hi} href={`/admin/grammar-engine/${c.key}/${lv}`} />
                      </td>
                    ))}
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
