// apps/web/app/(protected)/reading/test-v2/page.tsx
import { getSupabaseServer } from '@/lib/supabaseServer';
import type { RPassage, RQuestion } from '@/models/reading';
import ClientPage from '../test/ClientPage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RQType = RQuestion['type'];

/** safe JSON parse with fallback */
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

/** normalize legacy/various question types into RQType */
function normalizeType(t: unknown): RQType {
  const allowed: RQType[] = [
    'vocab',
    'detail',
    'negative_detail',
    'paraphrasing',
    'inference',
    'purpose',
    'pronoun_ref',
    'insertion',
    'summary',
    'organization',
  ];
  if (t === 'single') return 'detail'; // legacy alias
  return (allowed as unknown as string[]).includes(String(t))
    ? (t as RQType)
    : 'detail';
}

export default async function Page({
  searchParams,
}: {
  searchParams?: { setId?: string };
}) {
  const setId = searchParams?.setId ?? 'demo-set';
  const supabase = await getSupabaseServer();

  // latest passage in the set
  const { data: p, error: pErr } = await supabase
    .from('reading_passages')
    .select('*')
    .eq('set_id', setId)
    .order('ord', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pErr) return <div className="p-6 text-red-600">패시지 로드 오류: {pErr.message}</div>;
  if (!p) return <div className="p-6">Passage 없음 (setId={setId}).</div>;

  const { data: qs, error: qErr } = await supabase
    .from('reading_questions')
    .select('*, choices:reading_choices(*)')
    .eq('passage_id', p.id)
    .order('number', { ascending: true });

  if (qErr) {
    return <div className="p-6 text-red-600">문항 로드 오류: {qErr.message}</div>;
  }

  // paragraphs 우선 사용, 없으면 content를 빈 줄 기준으로 분해
  const paragraphs: string[] = Array.isArray((p as any)?.paragraphs)
    ? (p as any).paragraphs
    : typeof (p as any)?.content === 'string' && (p as any).content.length
    ? String((p as any).content).split(/\r?\n\r?\n+/g)
    : [];

  const passage: RPassage = {
    id: p.id,
    title: p.title ?? '',
    paragraphs,
    questions: (qs ?? []).map((q: any) => {
      const metaRaw = safeJson<NonNullable<RQuestion['meta']>>(q.meta, undefined as any);

      // explanation/clue_quote는 meta로 흡수하여 보존
      const mergedMeta =
        metaRaw || q.explanation || q.clue_quote
          ? {
              ...(metaRaw ?? {}),
              ...(q.explanation ? { explanation: String(q.explanation) } : {}),
              ...(q.clue_quote ? { clue_quote: String(q.clue_quote) } : {}),
            }
          : undefined;

      const choices = (q.choices ?? []).map((c: any) => ({
        id: c.id,
        text: c.text ?? c.label ?? '',
        isCorrect: (c as any).isCorrect ?? !!c.is_correct, // 레거시 호환
      }));

      return {
        id: q.id,
        number: q.number ?? 0,
        stem: q.stem ?? '',
        type: normalizeType(q.type),
        meta: mergedMeta,
        choices,
      } as RQuestion;
    }),
  };

  return (
    <div className="px-6 py-4">
      <ClientPage passage={passage} />
    </div>
  );
}
