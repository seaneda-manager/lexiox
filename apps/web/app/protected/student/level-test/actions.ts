'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Track } from '@/lib/level-test/proficiencyLevels';
import { decideBranch, decideFinalLevel, stage2PoolLevel, type Branch } from '@/lib/level-test/adaptiveEngine';
import { levelLabel } from '@/lib/level-test/proficiencyLevels';

export type LevelTestAnswer = { questionId: string; choiceId?: string; audioUrl?: string; textResponse?: string };

const TRACKS: Track[] = ['jr', 'middle', 'high', 'toefl'];
const SCORED_SECTIONS = ['grammar', 'vocab', 'listening', 'reading'] as const;

export async function startLevelTestSessionAction(track: Track): Promise<void> {
  if (!TRACKS.includes(track)) throw new Error('알 수 없는 트랙입니다.');

  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다.');

  const { data, error } = await supabase
    .from('level_test_sessions')
    .insert({ student_id: user.id, status: 'in_progress', track, stage: 1 })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  redirect(`/student/level-test/${data.id}`);
}

type QuestionRow = { id: string; section: string; correct_choice_id: string | null };

function gradeAnswers(answers: LevelTestAnswer[], questionById: Map<string, QuestionRow>) {
  return answers.flatMap((a) => {
    const q = questionById.get(a.questionId);
    if (!q) return [];
    const isCorrect = a.choiceId != null ? a.choiceId === q.correct_choice_id : null;
    return [{
      question: q,
      row: {
        session_id: undefined as unknown as string, // 채워서 사용
        question_id: a.questionId,
        response_choice_id: a.choiceId ?? null,
        response_audio_url: a.audioUrl ?? null,
        response_text: a.textResponse ?? null,
        is_correct: isCorrect,
      },
    }];
  });
}

function computeAccuracy(graded: ReturnType<typeof gradeAnswers>): number {
  const scored = graded.filter((g) => (SCORED_SECTIONS as readonly string[]).includes(g.question.section));
  if (scored.length === 0) return 0;
  const correct = scored.filter((g) => g.row.is_correct === true).length;
  return correct / scored.length;
}

async function computeSectionScores(service: SupabaseClient, sessionId: string): Promise<Record<string, number>> {
  const { data: responses } = await service
    .from('level_test_responses')
    .select('question_id, is_correct')
    .eq('session_id', sessionId);
  const questionIds = [...new Set((responses ?? []).map((r) => r.question_id))];
  const { data: questions } =
    questionIds.length > 0
      ? await service.from('level_test_questions').select('id, section').in('id', questionIds)
      : { data: [] as { id: string; section: string }[] };
  const sectionById = new Map((questions ?? []).map((q) => [q.id, q.section]));

  const stats = new Map<string, { correct: number; total: number }>();
  for (const r of responses ?? []) {
    const section = sectionById.get(r.question_id);
    if (!section || !(SCORED_SECTIONS as readonly string[]).includes(section) || r.is_correct === null) continue;
    const stat = stats.get(section) ?? { correct: 0, total: 0 };
    stat.total += 1;
    if (r.is_correct) stat.correct += 1;
    stats.set(section, stat);
  }
  const scores: Record<string, number> = {};
  for (const [section, stat] of stats) {
    scores[section] = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
  }
  return scores;
}

async function finalizeSession(
  service: SupabaseClient,
  sessionId: string,
  track: Track,
  finalSubLevel: ReturnType<typeof decideFinalLevel>,
) {
  const sectionScores = await computeSectionScores(service, sessionId);
  await service
    .from('level_test_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      section_scores: sectionScores,
      recommended_sub_level: finalSubLevel,
      recommended_level: levelLabel(track, finalSubLevel),
    })
    .eq('id', sessionId);
}

export async function submitStageAction(
  sessionId: string,
  answers: LevelTestAnswer[],
): Promise<{ nextStage: 2 } | { completed: true } | { error: string }> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const service = getServiceSupabase();

  const { data: session } = await service
    .from('level_test_sessions')
    .select('id, student_id, status, track, stage, branch')
    .eq('id', sessionId)
    .maybeSingle();
  if (!session || session.student_id !== user.id) return { error: '세션을 찾을 수 없습니다.' };
  if (session.status === 'completed') return { error: '이미 제출된 테스트입니다.' };
  if (!session.track) return { error: '트랙 정보가 없는 세션입니다.' };
  const track = session.track as Track;

  const questionIds = answers.map((a) => a.questionId);
  const { data: questions } =
    questionIds.length > 0
      ? await service.from('level_test_questions').select('id, section, correct_choice_id').in('id', questionIds)
      : { data: [] as QuestionRow[] };
  const questionById = new Map((questions ?? []).map((q) => [q.id, q]));

  const graded = gradeAnswers(answers, questionById);
  if (graded.length > 0) {
    const { error: insertErr } = await service.from('level_test_responses').insert(
      graded.map((g) => ({ ...g.row, session_id: sessionId, student_id: user.id })),
    );
    if (insertErr) return { error: insertErr.message };
  }

  const stageAccuracy = computeAccuracy(graded);

  if (session.stage === 1) {
    const branch: Branch = decideBranch(stageAccuracy);
    const pool = stage2PoolLevel(branch);

    const { count } = await service
      .from('level_test_questions')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('track', track)
      .eq('sub_level', pool)
      .in('section', SCORED_SECTIONS as unknown as string[]);

    if (!count) {
      // Stage 2 문제 풀이 비어있으면 앵커(mid)로 즉시 확정 — 빈 화면 대신 완료 처리.
      await finalizeSession(service, sessionId, track, 'mid');
      revalidatePath(`/student/level-test/${sessionId}`);
      return { completed: true };
    }

    const { error: updateErr } = await service
      .from('level_test_sessions')
      .update({ stage: 2, branch })
      .eq('id', sessionId);
    if (updateErr) return { error: updateErr.message };

    revalidatePath(`/student/level-test/${sessionId}`);
    return { nextStage: 2 };
  }

  // stage === 2: 최종 레벨 확정
  const branch = (session.branch as Branch | null) ?? decideBranch(stageAccuracy);
  const finalLevel = decideFinalLevel(track, branch, stageAccuracy);
  await finalizeSession(service, sessionId, track, finalLevel);

  revalidatePath(`/student/level-test/${sessionId}`);
  return { completed: true };
}
