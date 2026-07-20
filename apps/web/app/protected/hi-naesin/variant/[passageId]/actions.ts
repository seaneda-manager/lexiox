'use server';

import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';

// ── 변형문제 세션 시작 or 재사용 ─────────────────────────
export async function startVariantSessionAction(passageId: string): Promise<{ sessionId: string }> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인 필요');

  // 진행 중인 variant 세션 재사용
  const { data: existing } = await supabase
    .from('hi_naesin_sessions')
    .select('id')
    .eq('student_id', user.id)
    .eq('passage_id', passageId)
    .eq('session_type', 'variant')
    .eq('status', 'started')
    .maybeSingle();

  if (existing?.id) return { sessionId: existing.id };

  const { data, error } = await supabase
    .from('hi_naesin_sessions')
    .insert({ student_id: user.id, passage_id: passageId, session_type: 'variant', status: 'started' })
    .select('id')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'session 생성 실패');
  return { sessionId: data.id };
}

// ── 변형문제 답 제출 ──────────────────────────────────────
export async function submitVariantAnswerAction(
  passageId: string,
  fd: FormData,
): Promise<void> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인 필요');

  const questionId   = fd.get('question_id') as string;
  const sessionId    = fd.get('session_id')  as string;
  const selectedOrder = (fd.getAll('order') as string[]);   // text_ordering: ['A','B','C']
  const correctOrder  = JSON.parse(fd.get('correct_order') as string) as string[];

  const isCorrect = JSON.stringify(selectedOrder) === JSON.stringify(correctOrder);

  await supabase
    .from('hi_naesin_variant_answers')
    .upsert(
      { session_id: sessionId, question_id: questionId, selected_order: selectedOrder, is_correct: isCorrect },
      { onConflict: 'session_id,question_id' },
    );

  // 세션 내 모든 문제가 답변됐으면 submitted 처리
  const { data: allQ } = await supabase
    .from('hi_naesin_variant_questions')
    .select('id')
    .eq('passage_id', passageId)
    .eq('is_published', true);

  const { data: allA } = await supabase
    .from('hi_naesin_variant_answers')
    .select('question_id')
    .eq('session_id', sessionId);

  const answeredIds = new Set((allA ?? []).map((a) => a.question_id));
  const allAnswered = (allQ ?? []).every((q) => answeredIds.has(q.id));

  if (allAnswered) {
    await supabase
      .from('hi_naesin_sessions')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', sessionId);
  }

  redirect(`/hi-naesin/variant/${passageId}?session=${sessionId}&q=${questionId}&result=1`);
}
