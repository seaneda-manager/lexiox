'use server';

import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { gradeTranslation, gradeWriting } from '@/lib/hi-naesin/translation-grader';

type Fail = { ok: false; error: string };

// ── 드릴 답변 제출 ────────────────────────────────────────
// type  = 현재 블록 타입 (translation | fill_blank | writing | grammar_choice)
// step  = 블록 내 인덱스 (0-based)
export async function submitDrillAnswerAction(
  sessionId: string,
  drillId: string,
  type: string,
  step: number,
  fd: FormData,
): Promise<Fail | void> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '로그인 필요' };

  const drillType      = (fd.get('drill_type') as string)?.trim();
  const responseText   = (fd.get('response_text') as string)?.trim() ?? '';
  const responseChoice = (fd.get('response_choice') as string)?.trim() ?? '';

  let isCorrect:    boolean | null = null;
  let scorePct:     number  | null = null;
  let feedbackText: string  | null = null;

  // ── 즉시 채점 가능한 타입 (로컬 비교) ──────────────────────
  if (drillType === 'fill_blank') {
    const answer = (fd.get('answer') as string)?.trim().toLowerCase();
    isCorrect = responseText.toLowerCase() === answer;

  } else if (drillType === 'grammar_choice' || drillType === 'translation_choice') {
    const correct = (fd.get('correct_option') as string)?.trim();
    isCorrect = responseChoice === correct;

  } else if (drillType === 'translation_arrange' || drillType === 'writing_arrange') {
    const correctOrder = (fd.get('correct_order') as string)?.trim();
    isCorrect = responseChoice === correctOrder;

  } else if (drillType === 'vocab') {
    const answerKo = (fd.get('answer_ko') as string)?.trim().toLowerCase() ?? '';
    if (answerKo && responseText) {
      const student = responseText.toLowerCase();
      isCorrect = student === answerKo;
      if (!isCorrect) {
        const parts = answerKo.split(/[,\/·]/);
        isCorrect = parts.some((p) => student === p.trim());
      }
    }
  }

  // ── AI 채점이 필요한 타입 → 백그라운드에서 실행 ─────────────
  // after()는 redirect 이후 응답이 나간 뒤에 실행되므로 체감 딜레이 없음
  if (drillType === 'translation') {
    const sentenceEn = (fd.get('sentence_en') as string)?.trim() ?? '';
    const answerKo   = (fd.get('answer_ko') as string)?.trim() ?? '';
    const captured   = { sessionId, drillId, sentenceEn, answerKo, responseText };
    after(async () => {
      const result = await gradeTranslation(captured.sentenceEn, captured.answerKo, captured.responseText);
      if (!result) return;
      const bg = await getServerSupabase();
      await bg
        .from('hi_naesin_drill_responses')
        .update({ is_correct: result.isCorrect, score_pct: result.scorePct, feedback_text: result.feedbackText })
        .eq('session_id', captured.sessionId)
        .eq('drill_id', captured.drillId);
    });

  } else if (drillType === 'writing') {
    const promptKo = (fd.get('prompt_ko') as string)?.trim() ?? '';
    const answerEn = (fd.get('answer_en') as string)?.trim() ?? '';
    const captured = { sessionId, drillId, promptKo, answerEn, responseText };
    after(async () => {
      const result = await gradeWriting(captured.promptKo, captured.answerEn, captured.responseText);
      if (!result) return;
      const bg = await getServerSupabase();
      await bg
        .from('hi_naesin_drill_responses')
        .update({ is_correct: result.isCorrect, score_pct: result.scorePct, feedback_text: result.feedbackText })
        .eq('session_id', captured.sessionId)
        .eq('drill_id', captured.drillId);
    });
  }

  // ── 응답 저장 (채점 결과 없이 즉시 upsert) ─────────────────
  const { error } = await supabase
    .from('hi_naesin_drill_responses')
    .upsert(
      {
        session_id:      sessionId,
        drill_id:        drillId,
        response_text:   responseText || null,
        response_choice: responseChoice || null,
        is_correct:      isCorrect,   // AI 채점 타입은 null, 나중에 after()가 update
        score_pct:       scorePct,
        feedback_text:   feedbackText,
      },
      { onConflict: 'session_id,drill_id' },
    );

  if (error) return { ok: false, error: error.message };

  // 응답 존재 여부로 isAnswered 판단하므로 done 파라미터 불필요
  redirect(`/hi-naesin/drill/${sessionId}?type=${type}&step=${step}`);
}

// ── 자기 채점 폴백 ────────────────────────────────────────
export async function selfCheckDrillAction(
  sessionId: string,
  drillId: string,
  type: string,
  step: number,
  typeTotal: number,
  nextType: string | null,
  isCorrect: boolean,
): Promise<Fail | void> {
  const supabase = await getServerSupabase();

  await supabase
    .from('hi_naesin_drill_responses')
    .update({ is_correct: isCorrect })
    .eq('session_id', sessionId)
    .eq('drill_id', drillId);

  await buildNextUrl(sessionId, type, step, typeTotal, nextType);
}

// ── 다음으로 ──────────────────────────────────────────────
export async function nextDrillStepAction(
  sessionId: string,
  type: string,
  step: number,
  typeTotal: number,
  nextType: string | null,
): Promise<void> {
  await buildNextUrl(sessionId, type, step, typeTotal, nextType);
}

// ── 내부 헬퍼 ─────────────────────────────────────────────
async function buildNextUrl(
  sessionId: string,
  type: string,
  step: number,
  typeTotal: number,
  nextType: string | null,
): Promise<never> {
  const nextStep = step + 1;

  if (nextStep < typeTotal) {
    // 같은 블록 내 다음 문제
    redirect(`/hi-naesin/drill/${sessionId}?type=${type}&step=${nextStep}`);
  } else if (nextType) {
    // 다음 블록의 첫 번째 문제 (step=0, 페이지에서 미완료 위치 자동 계산)
    redirect(`/hi-naesin/drill/${sessionId}?type=${nextType}`);
  } else {
    // 모든 블록 완료
    const supabase = await getServerSupabase();
    await supabase
      .from('hi_naesin_sessions')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', sessionId);
    redirect(`/hi-naesin/drill/${sessionId}/complete`);
  }
}

// ═══════════════════════════════════════════════════════════
// 클라이언트 사이드 네비게이션용 (redirect 없이 데이터 반환)
// ═══════════════════════════════════════════════════════════

export type ClientResponseRow = {
  drill_id: string;
  response_text: string | null;
  response_choice: string | null;
  is_correct: boolean | null;
  score_pct: number | null;
  feedback_text: string | null;
};

export async function submitAnswerClientAction(
  sessionId: string,
  drillId: string,
  fd: FormData,
): Promise<ClientResponseRow | { error: string }> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인 필요' };

  const drillType      = (fd.get('drill_type') as string)?.trim();
  const responseText   = (fd.get('response_text') as string)?.trim() ?? '';
  const responseChoice = (fd.get('response_choice') as string)?.trim() ?? '';

  let isCorrect:    boolean | null = null;
  let scorePct:     number  | null = null;
  let feedbackText: string  | null = null;

  if (drillType === 'fill_blank') {
    const answer = (fd.get('answer') as string)?.trim().toLowerCase();
    isCorrect = responseText.toLowerCase() === answer;

  } else if (drillType === 'grammar_choice' || drillType === 'translation_choice') {
    const correct = (fd.get('correct_option') as string)?.trim();
    isCorrect = responseChoice === correct;

  } else if (drillType === 'translation_arrange' || drillType === 'writing_arrange') {
    const correctOrder = (fd.get('correct_order') as string)?.trim();
    isCorrect = responseChoice === correctOrder;

  } else if (drillType === 'vocab') {
    const answerKo = (fd.get('answer_ko') as string)?.trim().toLowerCase() ?? '';
    if (answerKo && responseText) {
      const student = responseText.toLowerCase();
      isCorrect = student === answerKo;
      if (!isCorrect) {
        const parts = answerKo.split(/[,\/·]/);
        isCorrect = parts.some((p) => student === p.trim());
      }
    }
  }

  // AI 채점 타입 → 백그라운드 실행
  if (drillType === 'translation') {
    const sentenceEn = (fd.get('sentence_en') as string)?.trim() ?? '';
    const answerKo   = (fd.get('answer_ko') as string)?.trim() ?? '';
    const captured   = { sessionId, drillId, sentenceEn, answerKo, responseText };
    after(async () => {
      const result = await gradeTranslation(captured.sentenceEn, captured.answerKo, captured.responseText);
      if (!result) return;
      const bg = await getServerSupabase();
      await bg.from('hi_naesin_drill_responses')
        .update({ is_correct: result.isCorrect, score_pct: result.scorePct, feedback_text: result.feedbackText })
        .eq('session_id', captured.sessionId).eq('drill_id', captured.drillId);
    });
  } else if (drillType === 'writing') {
    const promptKo = (fd.get('prompt_ko') as string)?.trim() ?? '';
    const answerEn = (fd.get('answer_en') as string)?.trim() ?? '';
    const captured = { sessionId, drillId, promptKo, answerEn, responseText };
    after(async () => {
      const result = await gradeWriting(captured.promptKo, captured.answerEn, captured.responseText);
      if (!result) return;
      const bg = await getServerSupabase();
      await bg.from('hi_naesin_drill_responses')
        .update({ is_correct: result.isCorrect, score_pct: result.scorePct, feedback_text: result.feedbackText })
        .eq('session_id', captured.sessionId).eq('drill_id', captured.drillId);
    });
  }

  const row = {
    session_id:      sessionId,
    drill_id:        drillId,
    response_text:   responseText || null,
    response_choice: responseChoice || null,
    is_correct:      isCorrect,
    score_pct:       scorePct,
    feedback_text:   feedbackText,
  };

  const { error } = await supabase.from('hi_naesin_drill_responses')
    .upsert(row, { onConflict: 'session_id,drill_id' });
  if (error) return { error: error.message };

  return {
    drill_id:        drillId,
    response_text:   row.response_text,
    response_choice: row.response_choice,
    is_correct:      row.is_correct,
    score_pct:       row.score_pct,
    feedback_text:   row.feedback_text,
  };
}

export async function selfCheckClientAction(
  sessionId: string,
  drillId: string,
  isCorrect: boolean,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await getServerSupabase();
  const { error } = await supabase.from('hi_naesin_drill_responses')
    .update({ is_correct: isCorrect })
    .eq('session_id', sessionId).eq('drill_id', drillId);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function pollResponseClientAction(
  sessionId: string,
  drillId: string,
): Promise<ClientResponseRow | null> {
  const supabase = await getServerSupabase();
  const { data } = await supabase.from('hi_naesin_drill_responses')
    .select('drill_id, response_text, response_choice, is_correct, score_pct, feedback_text')
    .eq('session_id', sessionId).eq('drill_id', drillId).maybeSingle();
  return data as ClientResponseRow | null;
}

export async function completeSessionClientAction(sessionId: string): Promise<void> {
  const supabase = await getServerSupabase();
  await supabase.from('hi_naesin_sessions')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', sessionId);
}
