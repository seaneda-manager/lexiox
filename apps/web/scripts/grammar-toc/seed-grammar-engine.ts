// 사용: npx tsx scripts/grammar-toc/seed-grammar-engine.ts [--dry]
// 선행: supabase/migrations/20261028000001_grammar_engine_core.sql 적용.
// 교재 1·2(book01·book02) + 뉴런 중3 목차 → grammar_books / grammar_book_units / grammar_concepts / grammar_unit_concepts / grammar_concept_links.
// 멱등: unique key 기준 upsert(merge). 여러 번 실행해도 중복 없음. 레슨(grammar_lessons)은 이 스크립트가 만들지 않는다.
import fs from 'fs';
import path from 'path';
import { NEURON_MIDDLE3_BOOK, NEURON_MIDDLE3_TOC, type TocChapter } from './neuron-middle3-toc';
import { NEURON_MIDDLE3_CONCEPTS } from './neuron-middle3-concepts';
import { BOOK01_BOOK, BOOK01_TOC } from './book01-toc';
import { BOOK02_BOOK, BOOK02_TOC } from './book02-toc';
import { NEW_CONCEPTS, EXTRA_UNIT_LINKS } from './book12-concepts';

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

type BookId = 'b1' | 'b2' | 'b3';
type BookDef = { id: BookId; bookKey: string; title: string; grade: string; toc: TocChapter[] };
const BOOKS: BookDef[] = [
  { id: 'b1', ...BOOK01_BOOK, toc: BOOK01_TOC },
  { id: 'b2', ...BOOK02_BOOK, toc: BOOK02_TOC },
  { id: 'b3', ...NEURON_MIDDLE3_BOOK, toc: NEURON_MIDDLE3_TOC },
];

// 교재 1·2에서 새로 생긴 기초 개념 + 중3 개념을 한 목록으로. 단원 연결은 { 책 id → 단원 ref[] } 로 통일.
type AllConcept = { key: string; titleKo: string; titleEn: string; tier: number; units: Partial<Record<BookId, string[]>>; seeAlso?: string[]; firstBook: BookId; firstChapter: number };

function buildConcepts(): AllConcept[] {
  const fromNew: AllConcept[] = NEW_CONCEPTS.map((c) => ({
    key: c.key, titleKo: c.titleKo, titleEn: c.titleEn, tier: c.tier,
    units: { b1: c.b1, b2: c.b2 }, seeAlso: c.seeAlso,
    firstBook: c.b1 ? 'b1' : 'b2', firstChapter: Number((c.b1 ?? c.b2)![0].split('-')[0]),
  }));
  const fromMid3: AllConcept[] = NEURON_MIDDLE3_CONCEPTS.map((c) => ({
    key: c.key, titleKo: c.titleKo, titleEn: c.titleEn, tier: c.tier,
    units: { b3: c.units, ...EXTRA_UNIT_LINKS[c.key] },
    seeAlso: c.seeAlso, firstBook: 'b3', firstChapter: Number(c.units[0].split('-')[0]),
  }));
  const all = [...fromNew, ...fromMid3];
  if (new Set(all.map((c) => c.key)).size !== all.length) throw new Error('개념 key 중복');
  const badExtra = Object.keys(EXTRA_UNIT_LINKS).filter((k) => !fromMid3.some((c) => c.key === k));
  if (badExtra.length) throw new Error(`EXTRA_UNIT_LINKS 에 없는 개념 key: ${badExtra.join(', ')}`);
  // 학습 순서: tier 오름차순, 같은 tier 에서는 기초 개념(교재 1·2에서 생긴 것) 먼저, 그다음 중3 배열 순서.
  return all.map((c, i) => ({ c, i })).sort((x, y) => x.c.tier - y.c.tier || x.i - y.i).map((x) => x.c);
}

async function main() {
  const concepts = buildConcepts();

  // 매핑 검사 (dry 에서도 수행): 어떤 개념에도 안 걸린 단원 / 존재하지 않는 단원 참조
  for (const b of BOOKS) {
    const all = new Set(b.toc.flatMap((c) => c.units.map((u) => `${c.chapter}-${u.unit}`)));
    const used = new Set(concepts.flatMap((c) => c.units[b.id] ?? []));
    const missing = [...all].filter((r) => !used.has(r));
    const unknown = [...used].filter((r) => !all.has(r));
    console.log(`CHECK ${b.bookKey}: 단원 ${all.size}, 매핑 안 된 단원 ${missing.length}${missing.length ? ` [${missing.join(' ')}]` : ''}, 없는 단원 참조 ${unknown.length}${unknown.length ? ` [${unknown.join(' ')}]` : ''}`);
    if (missing.length || unknown.length) throw new Error(`${b.bookKey} 단원 매핑 불일치`);
  }
  console.log(`CHECK 개념 ${concepts.length}개`);

  // 1) 교재
  const bookRows = await upsert('grammar_books', BOOKS.map((b) => ({ key: b.bookKey, title: b.title, grade: b.grade, kind: 'external' })), 'key');
  const bookIdByKey = new Map<string, string>(bookRows.map((r: any) => [r.key, r.id]));

  // 2) 단원 (책 순서 = sort_order)
  const unitIdByRef = new Map<string, string>(); // "b1|1-2" → unit id
  for (const b of BOOKS) {
    let order = 0;
    const unitRows = b.toc.flatMap((c) =>
      c.units.map((u) => ({
        book_id: bookIdByKey.get(b.bookKey) ?? '00000000-0000-0000-0000-000000000000',
        chapter_no: c.chapter,
        chapter_title: c.title,
        unit_no: u.unit,
        title: u.title,
        page: u.page,
        sort_order: ++order,
      })),
    );
    const units = await upsert('grammar_book_units', unitRows, 'book_id,chapter_no,unit_no');
    for (const u of units) unitIdByRef.set(`${b.id}|${u.chapter_no}-${u.unit_no}`, u.id);
  }

  // 3) 개념 (배열 순서 = difficulty_rank). category 는 처음 나온 교재의 챕터 제목.
  const chapterTitle = (bid: BookId, ch: number) => BOOKS.find((b) => b.id === bid)!.toc.find((c) => c.chapter === ch)?.title ?? null;
  const conceptRows = concepts.map((c, i) => ({ key: c.key, title_ko: c.titleKo, title_en: c.titleEn, tier: c.tier, difficulty_rank: i + 1, category: chapterTitle(c.firstBook, c.firstChapter), status: 'draft' }));
  const conceptOut = await upsert('grammar_concepts', conceptRows, 'key');
  const conceptIdByKey = new Map<string, string>(conceptOut.map((c: any) => [c.key, c.id]));

  // 4) 단원 ↔ 개념
  const linkRows = concepts.flatMap((c) =>
    BOOKS.flatMap((b) => (c.units[b.id] ?? []).map((ref, idx) => ({ unit_id: unitIdByRef.get(`${b.id}|${ref}`), concept_id: conceptIdByKey.get(c.key), sort_order: idx }))),
  );
  if (!dry) {
    const missing = linkRows.filter((r) => !r.unit_id || !r.concept_id);
    if (missing.length) throw new Error(`매핑 누락 ${missing.length}건`);
  }
  await upsert('grammar_unit_concepts', linkRows, 'unit_id,concept_id');

  // 5) 개념 간 짝 (seeAlso → contrast, 양방향)
  const relRows = concepts.flatMap((c) =>
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
