'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

export type LevelTestAnswer = { questionId: string; choiceId?: string; audioUrl?: string; textResponse?: string };

export async function startLevelTestSessionAction(): Promise<void> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다.');

  const { data, error } = await supabase
    .from('level_test_sessions')
    .insert({ student_id: user.id, status: 'in_progress' })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  redirect(`/student/level-test/${data.id}`);
}

const SCORED_SECTIONS = ['grammar', 'vocab', 'listening', 'reading'] as const;

export async function submitLevelTestAction(
  sessionId: string,
  answers: LevelTestAnswer[],
): Promise<{ ok: true } | { error: string }> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const service = getServiceSupabase();

  const { data: session } = await service
    .from('level_test_sessions')
    .select('id, student_id, status')
    .eq('id', sessionId)
    .maybeSingle();
  if (!session || session.student_id !== user.id) return { error: '세션을 찾을 수 없습니다.' };
  if (session.status === 'completed') return { error: '이미 제출된 테스트입니다.' };

  const questionIds = answers.map((a) => a.questionId);
  const { data: questions } =
    questionIds.length > 0
      ? await service.from('level_test_questions').select('id, section, correct_choice_id').in('id', questionIds)
      : { data: [] as { id: string; section: string; correct_choice_id: string | null }[] };
  const questionById = new Map((questions ?? []).map((q) => [q.id, q]));

  const responseRows = answers.flatMap((a) => {
    const q = questionById.get(a.questionId);
    if (!q) return [];
    const isCorrect = a.choiceId != null ? a.choiceId === q.correct_choice_id : null;
    return [{
      session_id: sessionId,
      student_id: user.id,
      question_id: a.questionId,
      response_choice_id: a.choiceId ?? null,
      response_audio_url: a.audioUrl ?? null,
      response_text: a.textResponse ?? null,
      is_correct: isCorrect,
    }];
  });

  if (responseRows.length > 0) {
    const { error: insertErr } = await service.from('level_test_responses').insert(responseRows);
    if (insertErr) return { error: insertErr.message };
  }

  // 섹션별 점수 계산 (speaking은 자동채점 대상이 아니라 제외)
  const sectionStats = new Map<string, { correct: number; total: number }>();
  for (const row of responseRows) {
    const q = questionById.get(row.question_id);
    if (!q || row.is_correct === null) continue;
    if (!(SCORED_SECTIONS as readonly string[]).includes(q.section)) continue;
    const stat = sectionStats.get(q.section) ?? { correct: 0, total: 0 };
    stat.total += 1;
    if (row.is_correct) stat.correct += 1;
    sectionStats.set(q.section, stat);
  }
  const sectionScores: Record<string, number> = {};
  for (const [section, stat] of sectionStats) {
    sectionScores[section] = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
  }

  const { error: updateErr } = await service
    .from('level_test_sessions')
    .update({ status: 'completed', completed_at: new Date().toISOString(), section_scores: sectionScores })
    .eq('id', sessionId);
  if (updateErr) return { error: updateErr.message };

  revalidatePath(`/student/level-test/${sessionId}`);
  return { ok: true };
}
