'use server';

// 변형문제 AI 출제 — 지문에서 시험 출제 유형 문제를 만들어 "비공개 초안"으로 저장한다.
// 관리자가 검수 탭에서 확인·수정한 뒤 공개해야 학생에게 보인다.

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import {
  AI_VARIANT_TYPES,
  aiTypeLabel,
  buildTextOrderingVariant,
  generateVariantQuestions,
  recommendVariantTypes,
  type AiVariantType,
  type GeneratedVariant,
} from '@/lib/hi-naesin/variant-generator';
import { targetPositions } from '@/lib/hi-naesin/variantMarks';

const BASE = (id: string) => `/admin/hi-naesin/passages/${id}/edit`;

export async function generateVariantQuestionsAction(passageId: string, fd: FormData): Promise<void> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`${BASE(passageId)}?tab=variant&err=${encodeURIComponent('로그인 필요')}`);

  const { data: passage } = await supabase
    .from('hi_naesin_passages')
    .select('passage_text')
    .eq('id', passageId)
    .single();
  if (!passage?.passage_text) {
    redirect(`${BASE(passageId)}?tab=variant&err=${encodeURIComponent('지문을 찾을 수 없습니다')}`);
  }

  const mode = String(fd.get('mode') ?? 'pick');
  const withOrdering = fd.get('text_ordering') === '1';
  const valid = new Set<string>(AI_VARIANT_TYPES);

  let types: AiVariantType[] = [];
  let reasons: Array<{ type: AiVariantType; reason: string }> = [];
  if (mode === 'auto') {
    reasons = await recommendVariantTypes(passage.passage_text);
    types = reasons.map((r) => r.type);
    if (types.length === 0) {
      redirect(`${BASE(passageId)}?tab=variant&err=${encodeURIComponent('유형 추천에 실패했습니다. 유형을 직접 골라 주세요.')}`);
    }
  } else {
    types = (fd.getAll('types') as string[]).filter((t): t is AiVariantType => valid.has(t));
  }
  if (types.length === 0 && !withOrdering) {
    redirect(`${BASE(passageId)}?tab=variant&err=${encodeURIComponent('출제할 유형을 하나 이상 선택하세요')}`);
  }

  const { generated, failed, skipped } = types.length > 0
    ? await generateVariantQuestions(passage.passage_text, types)
    : { generated: [] as GeneratedVariant[], failed: [] as AiVariantType[], skipped: [] as Array<{ type: AiVariantType; reason: string }> };

  // 지문 배열은 문장 분리 결과로 코드 생성
  if (withOrdering) {
    const { data: sents } = await supabase
      .from('hi_naesin_passage_sentences')
      .select('sentence_en')
      .eq('passage_id', passageId)
      .order('order_index');
    const pos = targetPositions(1, Date.now() % 997)[0];
    const to = buildTextOrderingVariant((sents ?? []).map((s) => s.sentence_en as string), pos, Date.now() % 5);
    if (to) generated.push(to);
  }

  if (generated.length === 0) {
    redirect(`${BASE(passageId)}?tab=variant&err=${encodeURIComponent('생성된 문제가 없습니다. 이 지문에는 선택한 유형이 어울리지 않을 수 있어요. 다른 유형을 골라 보세요.')}`);
  }

  const db = getServiceSupabase();

  // 같은 유형의 "비공개 초안"은 새로 만든 것으로 교체 (공개된 문제는 건드리지 않는다)
  const genTypes = [...new Set(generated.map((g) => g.questionType))];
  await db
    .from('hi_naesin_variant_questions')
    .delete()
    .eq('passage_id', passageId)
    .eq('is_published', false)
    .in('question_type', genTypes);

  const { data: last } = await db
    .from('hi_naesin_variant_questions')
    .select('order_index')
    .eq('passage_id', passageId)
    .order('order_index', { ascending: false })
    .limit(1);
  let next = (last?.[0]?.order_index ?? -1) + 1;

  let saved = 0;
  for (const g of generated) {
    const { data: q, error } = await db
      .from('hi_naesin_variant_questions')
      .insert({
        passage_id:    passageId,
        question_type: g.questionType,
        order_index:   next++,
        payload:       g.payload,
        explanation:   g.explanation || null,
        is_published:  false,
      })
      .select('id')
      .single();
    if (error || !q) {
      // 마이그레이션(20261112000001) 미적용 시 CHECK 제약으로 여기서 실패한다
      redirect(`${BASE(passageId)}?tab=variant&err=${encodeURIComponent('저장 실패: ' + (error?.message ?? 'unknown') + ' (마이그레이션 20261112000001 적용 여부 확인)')}`);
    }
    const { error: cErr } = await db.from('hi_naesin_variant_choices').insert(
      g.choices.map((c, i) => ({ question_id: q.id, order_index: i + 1, text: c.text, is_correct: c.isCorrect })),
    );
    if (cErr) {
      await db.from('hi_naesin_variant_questions').delete().eq('id', q.id);
      redirect(`${BASE(passageId)}?tab=variant&err=${encodeURIComponent('보기 저장 실패: ' + cErr.message)}`);
    }
    saved++;
  }

  revalidatePath(BASE(passageId));
  const failedLabels = failed.map((t) => aiTypeLabel(t)).join(', ');
  const skippedText = skipped.map((x) => `${aiTypeLabel(x.type)}(${x.reason})`).join(', ');
  const recText = reasons.map((r) => `${aiTypeLabel(r.type)}: ${r.reason}`).join(' | ');
  redirect(
    `${BASE(passageId)}?tab=variant&ok=variant_ai&vn=${saved}`
    + (failedLabels ? `&vf=${encodeURIComponent(failedLabels)}` : '')
    + (skippedText ? `&vs=${encodeURIComponent(skippedText)}` : '')
    + (recText ? `&vr=${encodeURIComponent(recText)}` : ''),
  );
}
