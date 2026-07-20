import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import StudentAnalyzeClient from './_client/StudentAnalyzeClient';

export const dynamic = 'force-dynamic';

type Params = Promise<{ passageId: string }>;

export default async function StudentPassageAnalyzePage({ params }: { params: Params }) {
  const { passageId } = await params;
  const supabase = await getServerSupabase();

  const [{ data: passage }, { data: analysis }] = await Promise.all([
    supabase
      .from('hi_naesin_passages')
      .select('id, title, passage_text')
      .eq('id', passageId)
      .single(),
    supabase
      .from('hi_naesin_passage_analysis')
      .select('grammar_items, vocab_items, connector_items, blank_items, grammar_locked, vocab_locked, connector_locked, blank_locked')
      .eq('passage_id', passageId)
      .maybeSingle(),
  ]);

  if (!passage) notFound();

  const hasAny = analysis && (
    analysis.grammar_locked || analysis.vocab_locked ||
    analysis.connector_locked || analysis.blank_locked
  );

  if (!hasAny) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-neutral-400 text-sm">아직 분석 자료가 준비되지 않았습니다.</p>
      </main>
    );
  }

  return (
    <StudentAnalyzeClient
      passageText={passage.passage_text}
      passageTitle={passage.title ?? '(제목 없음)'}
      analysis={analysis}
    />
  );
}
