'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase/server';
import { analyzePassage } from '@/lib/hi-naesin/passage-analyzer';
import type { PassageAnalysis } from '@/lib/hi-naesin/passage-analyzer';

export async function generateAnalysisAction(passageId: string, passageText: string) {
  const analysis = await analyzePassage(passageText);
  if (!analysis) return { error: 'AI 분석 생성 실패' };

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from('hi_naesin_passage_analysis')
    .upsert({
      passage_id: passageId,
      grammar_items: analysis.grammar,
      vocab_items: analysis.vocab,
      connector_items: analysis.connectors,
      blank_items: analysis.blanks,
      grammar_locked: false,
      vocab_locked: false,
      connector_locked: false,
      blank_locked: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'passage_id' });

  if (error) return { error: error.message };
  revalidatePath(`/admin/hi-naesin/passages/${passageId}/analyze`);
  return { ok: true };
}

export async function saveAnalysisSectionAction(
  passageId: string,
  section: 'grammar' | 'vocab' | 'connector' | 'blank',
  items: unknown[],
) {
  const supabase = await getServerSupabase();
  const col = `${section}_items`;
  const { error } = await supabase
    .from('hi_naesin_passage_analysis')
    .update({ [col]: items, updated_at: new Date().toISOString() })
    .eq('passage_id', passageId);

  if (error) return { error: error.message };
  revalidatePath(`/admin/hi-naesin/passages/${passageId}/analyze`);
  return { ok: true };
}

export async function toggleLockAction(
  passageId: string,
  section: 'grammar' | 'vocab' | 'connector' | 'blank',
  locked: boolean,
) {
  const supabase = await getServerSupabase();
  const col = `${section}_locked`;
  const { error } = await supabase
    .from('hi_naesin_passage_analysis')
    .update({ [col]: locked, updated_at: new Date().toISOString() })
    .eq('passage_id', passageId);

  if (error) return { error: error.message };
  revalidatePath(`/admin/hi-naesin/passages/${passageId}/analyze`);
  revalidatePath(`/hi-naesin/analyze/${passageId}`);
  return { ok: true };
}
