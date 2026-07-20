// apps/web/app/(protected)/reading/test/[sessionId]/p/[passageId]/page.tsx
import { getSupabaseServer } from '@/lib/supabaseServer';
import ReadingTestRunner from '@/components/reading/ReadingTestRunner';
import type { RPassage, RQuestion } from '@/models/reading';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RQType = RQuestion['type'];
const normalizeType = (t: unknown): RQType => {
  const ok: RQType[] = [
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
  if (t === 'single') return 'detail'; // legacy 호환
  return (ok as unknown as string[]).includes(String(t)) ? (t as RQType) : 'detail';
};

export default async function Page(...args: any[]) {
  const [{ params }] = args as [{ params: { sessionId: string; passageId: string } }];

  const supabase = await getSupabaseServer();

  // passage 로드
  const { data: p, error: pErr } = await supabase
    .from('reading_passages')
    .select('*')
    .eq('id', params.passageId)
    .maybeSingle();

  if (pErr) return <div className="p-6 text-red-600">Passage load error: {pErr.message}</div>;
  if (!p) return <div className="p-6">Passage not found.</div>;

  // 질문/보기 로드
  const { data: qs, error: qErr } = await supabase
    .from('reading_questions')
    .select('*, choices:reading_choices(*)')
    .eq('passage_id', p.id)
    .order('number', { ascending: true });

  if (qErr) {
    return <div className="p-6 text-red-600">Questions load error: {qErr.message}</div>;
  }

  // paragraphs 우선, 없으면 content를 빈 줄 기준으로 분해
  const paragraphs: string[] = Array.isArray((p as any)?.paragraphs)
    ? (p as any).paragraphs
    : typeof (p as any)?.content === 'string' && (p as any).content.length
    ? String((p as any).content).split(/\r?\n\r?\n+/g)
    : [];

  const questions: RQuestion[] = (qs ?? []).map((q: any) => {
    const metaRaw =
      typeof q.meta === 'string'
        ? (() => {
            try {
              return JSON.parse(q.meta);
            } catch {
              return undefined;
            }
          })()
        : q.meta ?? undefined;

    // explanation/clue_quote를 meta로 병합(보존)
    const meta =
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
      meta,
      choices,
    } as RQuestion;
  });

  const passage: RPassage = {
    id: p.id,
    title: p.title ?? '',
    paragraphs,
    questions,
  };

  async function onAnswer(a: { sessionId: string; questionId: string; choiceId: string }) {
    'use server';
    const supa = await getSupabaseServer();
    await supa.from('reading_answers').upsert(
      { session_id: a.sessionId, question_id: a.questionId, choice_id: a.choiceId },
      { onConflict: 'session_id,question_id' }
    );
    return { ok: true as const };
  }

  async function onFinish(a: { sessionId: string }) {
    'use server';
    const supa = await getSupabaseServer();
    const { data: { user } } = await supa.auth.getUser();
    if (user) {
      await supa.from('reading_sessions')
        .update({ finished_at: new Date().toISOString() })
        .eq('id', a.sessionId)
        .eq('user_id', user.id);
    }
    return { ok: true as const };
  }

  return (
    <ReadingTestRunner
      passage={passage}
      sessionId={params.sessionId}
      onAnswer={onAnswer}
      onFinish={onFinish}
    />
  );
}
