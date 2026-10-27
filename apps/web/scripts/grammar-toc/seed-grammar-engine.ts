// 사용: npx tsx scripts/grammar-toc/seed-grammar-engine.ts [--dry]
// 선행: supabase/migrations/20261028000001_grammar_engine_core.sql 적용.
// 뉴런 중3 목차 → grammar_books / grammar_book_units / grammar_concepts / grammar_unit_concepts / grammar_concept_links.
// 멱등: unique key 기준 upsert(merge). 여러 번 실행해도 중복 없음. 레슨(grammar_lessons)은 이 스크립트가 만들지 않는다.
import fs from 'fs';
import path from 'path';
import { NEURON_MIDDLE3_BOOK, NEURON_MIDDLE3_TOC } from './neuron-middle3-toc';
import { NEURON_MIDDLE3_CONCEPTS } from './neuron-middle3-concepts';

const dry = process.argv.includes('--dry');
const envPath = path.resolve(__dirname, '../../.env.local');
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]),
);
const base = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' };

async function upsert<T = any>(table: string, rows: object[], onConflict: string): Promise<T[]> {
  if (dry) {
    console.log(`DRY  ${table}: ${rows.length}행`);
    return [];
  }
  const res = await fetch(`${base}/${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: { ...H, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`${table} upsert 실패: ${res.status} ${await res.text()}`);
  const out = await res.json();
  console.log(`OK   ${table}: ${out.length}행`);
  return out;
}

async function main() {
  const unitRef = (ch: number, u: number) => `${ch}-${u}`;
  const chapterTitle = new Map(NEURON_MIDDLE3_TOC.map((c) => [c.chapter, c.title]));

  // 1) 교재
  const [book] = await upsert('grammar_books', [{ key: NEURON_MIDDLE3_BOOK.bookKey, title: NEURON_MIDDLE3_BOOK.title, grade: NEURON_MIDDLE3_BOOK.grade, kind: 'external' }], 'key');

  // 2) 단원 (책 순서 = sort_order)
  let order = 0;
  const unitRows = NEURON_MIDDLE3_TOC.flatMap((c) =>
    c.units.map((u) => ({
      book_id: book?.id ?? '00000000-0000-0000-0000-000000000000',
      chapter_no: c.chapter,
      chapter_title: c.title,
      unit_no: u.unit,
      title: u.title,
      page: u.page,
      sort_order: ++order,
    })),
  );
  const units = await upsert('grammar_book_units', unitRows, 'book_id,chapter_no,unit_no');
  const unitIdByRef = new Map(units.map((u: any) => [unitRef(u.chapter_no, u.unit_no), u.id]));

  // 3) 개념 (배열 순서 = difficulty_rank)
  const conceptRows = NEURON_MIDDLE3_CONCEPTS.map((c, i) => {
    const firstChapter = Number(c.units[0].split('-')[0]);
    return { key: c.key, title_ko: c.titleKo, title_en: c.titleEn, tier: c.tier, difficulty_rank: i + 1, category: chapterTitle.get(firstChapter) ?? null, status: 'draft' };
  });
  const concepts = await upsert('grammar_concepts', conceptRows, 'key');
  const conceptIdByKey = new Map(concepts.map((c: any) => [c.key, c.id]));

  // 4) 단원 ↔ 개념
  const linkRows = NEURON_MIDDLE3_CONCEPTS.flatMap((c) =>
    c.units.map((ref, idx) => ({ unit_id: unitIdByRef.get(ref), concept_id: conceptIdByKey.get(c.key), sort_order: idx })),
  );
  if (!dry) {
    const missing = linkRows.filter((r) => !r.unit_id || !r.concept_id);
    if (missing.length) throw new Error(`매핑 누락 ${missing.length}건`);
  }
  await upsert('grammar_unit_concepts', linkRows, 'unit_id,concept_id');

  // 5) 개념 간 짝 (seeAlso → contrast, 양방향)
  const relRows = NEURON_MIDDLE3_CONCEPTS.flatMap((c) =>
    (c.seeAlso ?? []).flatMap((k) => [
      { concept_id: conceptIdByKey.get(c.key), related_id: conceptIdByKey.get(k), relation: 'contrast' },
      { concept_id: conceptIdByKey.get(k), related_id: conceptIdByKey.get(c.key), relation: 'contrast' },
    ]),
  );
  const uniqRel = [...new Map(relRows.map((r) => [`${r.concept_id}|${r.related_id}`, r])).values()];
  await upsert('grammar_concept_links', uniqRel, 'concept_id,related_id,relation');

  console.log(dry ? '\n(dry-run — 아무것도 쓰지 않음)' : '\n시드 완료');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
