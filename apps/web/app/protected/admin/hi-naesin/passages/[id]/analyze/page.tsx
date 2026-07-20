import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import AnalyzeClient from './_client/AnalyzeClient';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

export default async function PassageAnalyzePage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [{ data: passage }, { data: analysis }] = await Promise.all([
    supabase
      .from('hi_naesin_passages')
      .select('id, title, passage_text')
      .eq('id', id)
      .single(),
    supabase
      .from('hi_naesin_passage_analysis')
      .select('*')
      .eq('passage_id', id)
      .maybeSingle(),
  ]);

  if (!passage) notFound();

  return (
    <AnalyzeClient
      passageId={id}
      passageText={passage.passage_text}
      passageTitle={passage.title ?? '(제목 없음)'}
      initial={analysis}
    />
  );
}
