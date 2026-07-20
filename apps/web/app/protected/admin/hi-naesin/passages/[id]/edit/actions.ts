'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase/server';
import type { HiNaesinDrillType, HiNaesinVariantType } from '@/models/hi-naesin';

type Ok<T extends object = object> = { ok: true } & T;
type Fail = { ok: false; error: string };

function str(fd: FormData, key: string) {
  return (fd.get(key) as string | null)?.trim() ?? '';
}

function revalidate(id: string) {
  revalidatePath(`/admin/hi-naesin/passages/${id}/edit`);
}

// ── 지문 기본 정보 수정 ──────────────────────────────

export async function updateHiNaesinPassageAction(
  id: string,
  fd: FormData,
): Promise<Ok | Fail> {
  const supabase = await getServerSupabase();

  const topicTags = str(fd, 'topic_tags')
    .split(',').map((t) => t.trim()).filter(Boolean);

  const examYear  = parseInt(str(fd, 'exam_year'), 10)  || null;
  const examMonth = parseInt(str(fd, 'exam_month'), 10) || null;

  const { error } = await supabase
    .from('hi_naesin_passages')
    .update({
      title:          str(fd, 'title') || null,
      passage_text:   str(fd, 'passage_text'),
      translation_ko: str(fd, 'translation_ko') || null,
      topic_tags:     topicTags,
      school_name:    str(fd, 'school_name') || null,
      grade:          str(fd, 'grade') || null,
      exam_year:      examYear,
      exam_month:     examMonth,
    })
    .eq('id', id);

  if (error) return { ok: false, error: error.message };
  revalidate(id);
  return { ok: true };
}

// ── Drill 추가 ───────────────────────────────────────

export async function addHiNaesinDrillAction(
  passageId: string,
  fd: FormData,
): Promise<Ok<{ drillId: string }> | Fail> {
  const supabase = await getServerSupabase();

  const drillType = str(fd, 'drill_type') as HiNaesinDrillType;
  const payloadRaw = str(fd, 'payload_json');

  let payload: unknown;
  try {
    payload = JSON.parse(payloadRaw || '{}');
  } catch {
    return { ok: false, error: 'payload JSON 형식 오류' };
  }

  // 현재 최대 order_index 조회
  const { data: existing } = await supabase
    .from('hi_naesin_drills')
    .select('order_index')
    .eq('passage_id', passageId)
    .eq('drill_type', drillType)
    .order('order_index', { ascending: false })
    .limit(1);

  const nextOrder = existing?.[0]?.order_index != null
    ? existing[0].order_index + 1
    : 0;

  const { data, error } = await supabase
    .from('hi_naesin_drills')
    .insert({
      passage_id:  passageId,
      drill_type:  drillType,
      order_index: nextOrder,
      payload,
      is_published: false,
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };
  revalidate(passageId);
  return { ok: true, drillId: data.id };
}

export async function deleteHiNaesinDrillAction(
  passageId: string,
  drillId: string,
): Promise<Ok | Fail> {
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from('hi_naesin_drills')
    .delete()
    .eq('id', drillId);

  if (error) return { ok: false, error: error.message };
  revalidate(passageId);
  return { ok: true };
}

// ── 변형문제 추가 ────────────────────────────────────

export async function addHiNaesinVariantQuestionAction(
  passageId: string,
  fd: FormData,
): Promise<Ok<{ questionId: string }> | Fail> {
  const supabase = await getServerSupabase();

  const questionType = str(fd, 'question_type') as HiNaesinVariantType;
  const payloadRaw = str(fd, 'payload_json');
  const stem = str(fd, 'stem') || null;
  const explanation = str(fd, 'explanation') || null;

  let payload: unknown;
  try {
    payload = JSON.parse(payloadRaw || '{}');
  } catch {
    return { ok: false, error: 'payload JSON 형식 오류' };
  }

  const { data: existing } = await supabase
    .from('hi_naesin_variant_questions')
    .select('order_index')
    .eq('passage_id', passageId)
    .order('order_index', { ascending: false })
    .limit(1);

  const nextOrder = existing?.[0]?.order_index != null
    ? existing[0].order_index + 1
    : 0;

  const { data, error } = await supabase
    .from('hi_naesin_variant_questions')
    .insert({
      passage_id:    passageId,
      question_type: questionType,
      order_index:   nextOrder,
      stem,
      payload,
      explanation,
      is_published:  false,
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };

  revalidate(passageId);
  return { ok: true, questionId: data.id };
}

export async function deleteHiNaesinVariantQuestionAction(
  passageId: string,
  questionId: string,
): Promise<Ok | Fail> {
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from('hi_naesin_variant_questions')
    .delete()
    .eq('id', questionId);

  if (error) return { ok: false, error: error.message };
  revalidate(passageId);
  return { ok: true };
}

// ── 변형문제 보기(choices) 저장 ─────────────────────

export async function saveHiNaesinVariantChoicesAction(
  passageId: string,
  questionId: string,
  fd: FormData,
): Promise<Ok | Fail> {
  const supabase = await getServerSupabase();

  const choices = [1, 2, 3, 4, 5].map((i) => ({
    question_id: questionId,
    order_index: i,
    text:        str(fd, `choice_${i}`),
    is_correct:  str(fd, 'correct') === String(i),
  })).filter((c) => c.text);

  if (choices.length === 0) return { ok: false, error: '보기를 입력해주세요.' };

  // 기존 보기 삭제 후 재삽입
  await supabase
    .from('hi_naesin_variant_choices')
    .delete()
    .eq('question_id', questionId);

  const { error } = await supabase
    .from('hi_naesin_variant_choices')
    .insert(choices);

  if (error) return { ok: false, error: error.message };
  revalidate(passageId);
  return { ok: true };
}

// ── 변형문제 공개 토글 ───────────────────────────────
export async function toggleVariantPublishAction(
  passageId: string,
  questionId: string,
  currentValue: boolean,
): Promise<Ok | Fail> {
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from('hi_naesin_variant_questions')
    .update({ is_published: !currentValue })
    .eq('id', questionId);

  if (error) return { ok: false, error: error.message };
  revalidate(passageId);
  return { ok: true };
}
