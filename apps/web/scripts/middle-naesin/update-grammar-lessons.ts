// 사용: npx tsx scripts/middle-naesin/update-grammar-lessons.ts [--dry] [--force]
// 이미 등록된 문법 레슨 초안을 최신 초안 데이터로 갱신한다.
// 안전장치: 확정(final)된 레슨은 건드리지 않고, 관리자가 수정한 초안은 새 내용만 덧붙인다. (--force 로만 통째로 덮어씀)
import fs from 'fs';
import path from 'path';
import { GRAMMAR_LESSON_DRAFTS } from './grammar-lesson-drafts';
import { validateGrammarLesson } from '../../models/middle-naesin/grammar-lesson';

const dry = process.argv.includes('--dry');
const force = process.argv.includes('--force');
const env = Object.fromEntries(
  fs
    .readFileSync(path.resolve(__dirname, '../../.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]),
);
const base = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' };

async function main() {
  const units: { id: string; lesson_number: number }[] = await (
    await fetch(`${base}/middle_naesin_units?select=id,lesson_number&publisher=like.*${encodeURIComponent('윤정미')}*&lesson_number=in.(5,6)`, { headers: H })
  ).json();

  for (const d of GRAMMAR_LESSON_DRAFTS) {
    const check = validateGrammarLesson(d.lesson);
    if ('errors' in check) throw new Error(`${d.lesson.topic}: ${check.errors.join(' / ')}`);
    const unit = units.find((u) => u.lesson_number === d.lessonNumber);
    if (!unit) continue;
    const rows: { id: string; created_at: string; updated_at: string; extra_data: { lesson?: { status?: string } } | null }[] = await (
      await fetch(`${base}/middle_naesin_contents?select=id,created_at,updated_at,extra_data&content_type=eq.grammar_point&unit_id=eq.${unit.id}&title=eq.${encodeURIComponent(d.lesson.topic)}`, { headers: H })
    ).json();
    const row = rows[0];
    if (!row) {
      console.log(`NONE   ${d.lessonNumber}과 ${d.lesson.topic} — 없음 (seed 먼저 실행)`);
      continue;
    }
    const edited = new Date(row.updated_at).getTime() - new Date(row.created_at).getTime() > 1000;
    const isFinal = row.extra_data?.lesson?.status === 'final';
    if (isFinal && !force) {
      console.log(`KEEP   ${d.lessonNumber}과 ${d.lesson.topic} — 확정됨, 건드리지 않음`);
      continue;
    }
    if (edited && !force) {
      // 관리자가 수정한 초안: 기존 내용은 그대로 두고 새 것(예문 모음·추가 규칙·추가 문제)만 덧붙인다.
      const cur = (row.extra_data?.lesson ?? {}) as Record<string, any>;
      const curRules: { en: string }[] = cur.explanation?.rules ?? [];
      const curQs: { stem: string; choices: { en: string }[] }[] = cur.questions ?? [];
      // "Which sentence is correct?" 처럼 문제 문장이 같을 수 있어서 보기까지 합쳐 같은 문제인지 판단한다
      const qKey = (q: { stem: string; choices: { en: string }[] }) => `${q.stem}||${q.choices.map((c) => c.en).sort().join('|')}`;
      const curKeys = new Set(curQs.map(qKey));
      const newRules = d.lesson.explanation.rules.filter((r) => !curRules.some((c) => c.en === r.en));
      const newQs = d.lesson.questions.filter((q) => !curKeys.has(qKey(q)));
      const merged = {
        ...cur,
        explanation: { ...cur.explanation, rules: [...curRules, ...newRules] },
        exampleGroups: cur.exampleGroups?.length ? cur.exampleGroups : d.lesson.exampleGroups,
        questions: [...curQs, ...newQs],
        status: 'draft',
      };
      const vcheck = validateGrammarLesson(merged);
      if ('errors' in vcheck) throw new Error(`${d.lesson.topic} 병합 결과가 올바르지 않음: ${vcheck.errors.join(' / ')}`);
      if (dry) {
        console.log(`MERGE? ${d.lessonNumber}과 ${d.lesson.topic} — 수정본 유지 + 규칙 ${newRules.length} · 문제 ${newQs.length} 추가, 예문 모음 ${cur.exampleGroups?.length ? '이미 있음' : '추가'}`);
        continue;
      }
      const r = await fetch(`${base}/middle_naesin_contents?id=eq.${row.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ extra_data: { ...(row.extra_data ?? {}), lesson: merged } }) });
      if (!r.ok) throw new Error(`${d.lesson.topic}: ${await r.text()}`);
      console.log(`MERGE  ${d.lessonNumber}과 ${d.lesson.topic} — 수정본 유지 + 규칙 ${newRules.length} · 문제 ${newQs.length} 추가`);
      continue;
    }
    if (dry) {
      console.log(`DRY    ${d.lessonNumber}과 ${d.lesson.topic} — 갱신 예정 (문제 ${d.lesson.questions.length}, 예문 ${(d.lesson.exampleGroups ?? []).reduce((a, g) => a + g.examples.length, 0)})`);
      continue;
    }
    const res = await fetch(`${base}/middle_naesin_contents?id=eq.${row.id}`, {
      method: 'PATCH',
      headers: H,
      body: JSON.stringify({ extra_data: { lesson: d.lesson }, body_text: d.lesson.explanation.summaryEn, translation_ko: d.lesson.explanation.summaryKo }),
    });
    if (!res.ok) throw new Error(`${d.lesson.topic}: ${await res.text()}`);
    console.log(`UPDATE ${d.lessonNumber}과 ${d.lesson.topic}`);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
