'use server';

import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

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

// ── 5지선다형 변형문제 채점 (정답은 서버에서만 읽는다) ─────────────
export type ChoiceResult =
  | { ok: true; isCorrect: boolean; correctChoiceId: string; reasonOptions: string[] | null; choiceNotes: string[] | null }
  | { ok: false; error: string };

export async function submitVariantChoiceAction(
  passageId: string,
  sessionId: string,
  questionId: string,
  choiceId: string,
): Promise<ChoiceResult> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '로그인 필요' };

  // 내 세션인지 확인
  const { data: sess } = await supabase
    .from('hi_naesin_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('student_id', user.id)
    .maybeSingle();
  if (!sess) return { ok: false, error: '세션을 찾을 수 없습니다' };

  const db = getServiceSupabase();
  const [{ data: choices }, { data: qRow }] = await Promise.all([
    db.from('hi_naesin_variant_choices').select('id, is_correct').eq('question_id', questionId),
    db.from('hi_naesin_variant_questions').select('payload').eq('id', questionId).single(),
  ]);
  const extra = qRow?.payload as { reason?: { options?: string[] }; choiceNotes?: string[] } | undefined;
  const reasonOptions = Array.isArray(extra?.reason?.options) ? extra!.reason!.options! : null;
  const picked = (choices ?? []).find((c) => c.id === choiceId);
  const correct = (choices ?? []).find((c) => c.is_correct);
  if (!picked || !correct) return { ok: false, error: '보기를 찾을 수 없습니다' };

  const { error } = await supabase
    .from('hi_naesin_variant_answers')
    .upsert(
      { session_id: sessionId, question_id: questionId, selected_choice_id: choiceId, is_correct: picked.is_correct },
      { onConflict: 'session_id,question_id', ignoreDuplicates: true },
    );
  if (error) return { ok: false, error: error.message };

  await finishSessionIfDone(supabase, passageId, sessionId);
  return {
    ok: true,
    isCorrect: picked.is_correct,
    correctChoiceId: correct.id,
    reasonOptions,
    // 이유 문항이 없으면 바로 보기별 해설을 보여 준다
    choiceNotes: reasonOptions ? null : (extra?.choiceNotes ?? null),
  };
}

// ── "정답인 이유 고르기" 채점 ─────────────────────────────
export type ReasonResult =
  | { ok: true; isCorrect: boolean; correctIndex: number; choiceNotes: string[] | null }
  | { ok: false; error: string };

export async function submitVariantReasonAction(
  sessionId: string,
  questionId: string,
  reasonIndex: number,
): Promise<ReasonResult> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '로그인 필요' };

  // 본문제를 먼저 푼 내 답안만 이유를 고를 수 있다
  const { data: ans } = await supabase
    .from('hi_naesin_variant_answers')
    .select('id, reason_choice_index')
    .eq('session_id', sessionId)
    .eq('question_id', questionId)
    .maybeSingle();
  if (!ans) return { ok: false, error: '먼저 문제를 풀어 주세요' };
  if (ans.reason_choice_index != null) return { ok: false, error: '이미 제출했습니다' };

  const db = getServiceSupabase();
  const { data: q } = await db
    .from('hi_naesin_variant_questions')
    .select('payload')
    .eq('id', questionId)
    .single();
  const pl = q?.payload as { reason?: { options?: string[]; correct?: number }; choiceNotes?: string[] } | undefined;
  const reason = pl?.reason;
  if (!reason || typeof reason.correct !== 'number' || !Array.isArray(reason.options)) {
    return { ok: false, error: '이유 문항이 없습니다' };
  }
  if (!Number.isInteger(reasonIndex) || reasonIndex < 0 || reasonIndex >= reason.options.length) {
    return { ok: false, error: '잘못된 선택' };
  }
  const isCorrect = reasonIndex === reason.correct;

  const { error } = await supabase
    .from('hi_naesin_variant_answers')
    .update({ reason_choice_index: reasonIndex, reason_is_correct: isCorrect })
    .eq('id', ans.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, isCorrect, correctIndex: reason.correct, choiceNotes: pl?.choiceNotes ?? null };
}

async function finishSessionIfDone(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  passageId: string,
  sessionId: string,
) {
  const { data: allQ } = await supabase
    .from('hi_naesin_variant_questions')
    .select('id')
    .eq('passage_id', passageId)
    .eq('is_published', true);
  const { data: allA } = await supabase
    .from('hi_naesin_variant_answers')
    .select('question_id')
    .eq('session_id', sessionId);
  const answered = new Set((allA ?? []).map((a) => a.question_id));
  if ((allQ ?? []).length > 0 && (allQ ?? []).every((q) => answered.has(q.id))) {
    await supabase
      .from('hi_naesin_sessions')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', sessionId);
  }
}
