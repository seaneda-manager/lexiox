// 사용: npx tsx scripts/grammar-toc/upsert-draft.ts drafts/<개념key>.l1.ts [--dry]
// 초안 레슨을 검증(validateGrammarLesson) 후 grammar_lessons 에 draft 로 upsert. 확정(final) 레슨은 건드리지 않는다.
// 파일은 default export 로 { conceptKey, level, lesson } 을 내보낸다. 음성(audioUrl/timings)은 확정 후 별도 생성.
import fs from 'fs';
import path from 'path';
import { validateGrammarLesson } from '../../models/middle-naesin/grammar-lesson';
import { lintLesson } from '../../lib/grammar-engine/lint';

const dry = process.argv.includes('--dry');
const file = process.argv[2];
if (!file) throw new Error('초안 파일 경로가 필요합니다.');
const env = Object.fromEntries(
  fs.readFileSync(path.resolve(__dirname, '../../.env.local'), 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]),
);
const base = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' };

(async () => {
  const mod = require(path.resolve(process.cwd(), file));
  const { conceptKey, level, lesson } = mod.default ?? mod;
  const v: any = validateGrammarLesson(lesson);
  if (v?.errors?.length || v?.ok === false) { console.error('검증 실패:', JSON.stringify(v, null, 1).slice(0, 2000)); process.exit(1); }
  console.log('검증 통과');
  const issues = lintLesson(v.lesson);
  for (const i of issues) console.log(`  [${i.level}] ${i.where}: ${i.msg}`);
  if (dry) return;
  const c = await (await fetch(`${base}/grammar_concepts?key=eq.${conceptKey}&select=id`, { headers: H })).json();
  if (!c[0]) throw new Error(`개념 없음: ${conceptKey}`);
  const ex = await (await fetch(`${base}/grammar_lessons?concept_id=eq.${c[0].id}&level=eq.${level}&select=status`, { headers: H })).json();
  if (ex[0]?.status === 'final') throw new Error('확정 레슨은 덮어쓰지 않습니다.');
  const row = { concept_id: c[0].id, level, status: 'draft', lesson: { ...lesson, status: 'draft' }, source: 'ai', ai_review: null, reviewed_by: null, reviewed_at: null, updated_at: new Date().toISOString() };
  const res = await fetch(`${base}/grammar_lessons?on_conflict=concept_id,level`, { method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify([row]) });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  console.log(`OK  ${conceptKey} L${level} 초안 저장`);
})();
