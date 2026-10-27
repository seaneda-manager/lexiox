// 사용: npx tsx scripts/grammar-toc/import-middle-naesin-lessons.ts [--dry]
// 선행: 마이그레이션 + seed-grammar-engine.ts 완료.
// middle_naesin_contents(grammar_point)의 extra_data.lesson 4개를 grammar_lessons(level=3, source='imported')로 복사한다.
// DB에 있는 현재 내용(관리자 수정·status 포함)을 그대로 옮긴다. 이미 있는 (개념, 레벨)은 건드리지 않는다(ignore-duplicates).
// 원본(middle_naesin_contents)은 수정하지 않는다 — 기존 학생/검수 화면은 계속 원본을 쓴다.
import fs from 'fs';
import path from 'path';
import { validateGrammarLesson, lessonCounts } from '../../models/middle-naesin/grammar-lesson';
import { EXISTING_LESSON_MAP } from './neuron-middle3-concepts';

const IMPORT_LEVEL = 3;
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

// 레슨 topic(grammar-lesson-drafts.ts) → 개념 key. lessonKey 는 EXISTING_LESSON_MAP 과 같은 "과-순서" 키.
const TOPIC_TO_LESSON_KEY: Record<string, string> = {
  'so ~ that 구문': '5-0',
  '지각동사 + 목적어 + 목적격보어': '5-1',
  '목적격 관계대명사 (뒤 구조)': '6-0',
  'used to (부정문 · 의문문)': '6-1',
};

async function get<T = any>(url: string): Promise<T> {
  const res = await fetch(`${base}/${url}`, { headers: H });
  if (!res.ok) throw new Error(`${url}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  const concepts: { id: string; key: string }[] = await get('grammar_concepts?select=id,key');
  if (concepts.length === 0) throw new Error('grammar_concepts 가 비어 있음 — seed-grammar-engine.ts 먼저 실행');

  const contents: { id: string; title: string; extra_data: any }[] = await get(
    `middle_naesin_contents?select=id,title,extra_data&content_type=eq.grammar_point&extra_data=not.is.null`,
  );

  const rows: object[] = [];
  for (const m of EXISTING_LESSON_MAP) {
    const topic = Object.keys(TOPIC_TO_LESSON_KEY).find((t) => TOPIC_TO_LESSON_KEY[t] === m.lessonKey)!;
    const concept = concepts.find((c) => c.key === m.conceptKey);
    if (!concept) {
      console.log(`SKIP  ${m.lessonTitle} — 개념 ${m.conceptKey} 없음`);
      continue;
    }
    const src = contents.find((c) => c.title === topic && c.extra_data?.lesson);
    if (!src) {
      console.log(`SKIP  ${m.lessonTitle} — middle_naesin_contents 에서 '${topic}' 를 찾지 못함`);
      continue;
    }
    const lesson = src.extra_data.lesson;
    const check = validateGrammarLesson(lesson);
    if ('errors' in check) {
      console.log(`SKIP  ${m.lessonTitle} — 검증 실패: ${check.errors.join(' / ')}`);
      continue;
    }
    const counts = lessonCounts(lesson);
    console.log(`${dry ? 'DRY ' : 'READY'} ${m.lessonTitle} → ${m.conceptKey} L${IMPORT_LEVEL} (status=${lesson.status}, 예문 ${counts.exampleCount ?? 0}, 문제 ${lesson.questions.length})`);
    rows.push({
      concept_id: concept.id,
      level: IMPORT_LEVEL,
      status: lesson.status === 'final' ? 'final' : 'draft',
      lesson,
      source: 'imported',
    });
  }

  if (dry || rows.length === 0) {
    console.log(dry ? '\n(dry-run — 아무것도 쓰지 않음)' : '\n넣을 레슨 없음');
    return;
  }
  const res = await fetch(`${base}/grammar_lessons?on_conflict=concept_id,level`, {
    method: 'POST',
    headers: { ...H, Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`grammar_lessons insert 실패: ${res.status} ${await res.text()}`);
  const inserted = await res.json();
  console.log(`\nOK  grammar_lessons: ${inserted.length}행 추가 (이미 있던 ${rows.length - inserted.length}건은 그대로 둠)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
