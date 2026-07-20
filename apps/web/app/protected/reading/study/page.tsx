// apps/web/app/(protected)/reading/study/page.tsx
import { getSupabaseServer } from '@/lib/supabaseServer';
import StudyRunner from './StudyRunner';

/** 안전 JSON 파서 */
function safeJson<T>(val: unknown, fallback: T): T {
  if (val == null) return fallback;
  if (typeof val === 'object') return val as T;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/** 문제 타입 정규화 */
function normalizeType(
  t: unknown
):
  | 'vocab'
  | 'detail'
  | 'negative_detail'
  | 'paraphrasing'
  | 'insertion'
  | 'inference'
  | 'purpose'
  | 'pronoun_ref'
  | 'summary'
  | 'organization' {
  const allowed = [
    'vocab',
    'detail',
    'negative_detail',
    'paraphrasing',
    'insertion',
    'inference',
    'purpose',
    'pronoun_ref',
    'summary',
    'organization',
  ];
  if (t === 'single') return 'detail';
  const s = String(t);
  return (allowed as string[]).includes(s) ? (s as any) : 'detail';
}

export default async function Page() {
  const supabase = await getSupabaseServer();

  // 최신 passage 1개
  const { data: p, error: pErr } = await supabase
    .from('reading_passages')
    .select('*')
    .order('ord', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pErr) return <div className="p-6 text-red-600">오류: {pErr.message}</div>;
  if (!p) return <div className="p-6">Passage가 없습니다.</div>;

  // 해당 passage의 문제 + 보기
  const { data: qs, error: qErr } = await supabase
    .from('reading_questions')
    .select('*, choices:reading_choices(*)')
    .eq('passage_id', p.id)
    .order('number', { ascending: true });

  if (qErr) return <div className="p-6 text-red-600">문항 로드 오류: {qErr.message}</div>;

  // StudyRunner 입력 형태로 변환: { passage: { id, title, content, questions } }
  const passage = {
    id: String(p.id),
    title: p.title ?? 'Reading Study',
    content: p.content ?? '',
    questions: (qs ?? []).map((q: any) => {
      const _meta = safeJson(q?.meta, undefined as unknown as Record<string, unknown> | undefined);
      const _explanation =
        q?.explanation
          ? q.explanation
          : q?.clue_quote
          ? { clue_quote: q.clue_quote }
          : undefined;

      return {
        id: String(q.id),
        number: q.number ?? 0,
        type: normalizeType(q.type),
        stem: q.stem ?? '',
        explanation: _explanation ?? undefined,
        clue_quote: q?.clue_quote ?? undefined,
        choices: (q?.choices ?? []).map((c: any) => ({
          id: String(c.id),
          text: c.text ?? c.label ?? '',
          is_correct: !!c.is_correct,
        })),
      };
    }),
  };

  return (
    <div className="p-6">
      <StudyRunner passage={passage} />
    </div>
  );
}
