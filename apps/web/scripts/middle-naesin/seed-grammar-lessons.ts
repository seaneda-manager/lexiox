// 사용: npx tsx scripts/middle-naesin/seed-grammar-lessons.ts [--dry]
// 동아(윤정미) M2 2학기 5·6과에 문법 레슨 초안을 등록한다. (status: draft → 학생에게 보이지 않음)
// 이미 같은 제목의 문법 포인트가 있으면 건드리지 않는다(관리자가 고친 내용 보호).
import fs from 'fs';
import path from 'path';
import { GRAMMAR_LESSON_DRAFTS } from './grammar-lesson-drafts';
import { validateGrammarLesson } from '../../models/middle-naesin/grammar-lesson';

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

async function main() {
  const units: { id: string; publisher: string; lesson_number: number }[] = await (
    await fetch(`${base}/middle_naesin_units?select=id,publisher,lesson_number&publisher=like.*${encodeURIComponent('윤정미')}*&lesson_number=in.(5,6)`, { headers: H })
  ).json();

  for (const d of GRAMMAR_LESSON_DRAFTS) {
    const check = validateGrammarLesson(d.lesson);
    if ('errors' in check) throw new Error(`${d.lesson.topic}: ${check.errors.join(' / ')}`);
    const unit = units.find((u) => u.lesson_number === d.lessonNumber);
    if (!unit) {
      console.log(`SKIP  ${d.lessonNumber}과 ${d.lesson.topic} — 단원을 찾지 못함`);
      continue;
    }
    const existing: { id: string }[] = await (
      await fetch(`${base}/middle_naesin_contents?select=id&content_type=eq.grammar_point&unit_id=eq.${unit.id}&title=eq.${encodeURIComponent(d.lesson.topic)}`, { headers: H })
    ).json();
    if (existing.length > 0) {
      console.log(`EXISTS ${d.lessonNumber}과 ${d.lesson.topic} (${existing[0].id}) — 그대로 둠`);
      continue;
    }
    const row = {
      unit_id: unit.id,
      content_type: 'grammar_point',
      title: d.lesson.topic,
      body_text: d.lesson.explanation.summaryEn,
      translation_ko: d.lesson.explanation.summaryKo,
      sort_order: d.sortOrder,
      extra_data: { lesson: d.lesson },
    };
    if (dry) {
      console.log(`DRY   ${d.lessonNumber}과 ${d.lesson.topic} — 문제 ${d.lesson.questions.length}개`);
      continue;
    }
    const res = await fetch(`${base}/middle_naesin_contents`, { method: 'POST', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify(row) });
    const body = await res.json();
    if (!res.ok) throw new Error(`${d.lesson.topic}: ${JSON.stringify(body)}`);
    console.log(`INSERT ${d.lessonNumber}과 ${d.lesson.topic} → ${body[0].id}`);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
