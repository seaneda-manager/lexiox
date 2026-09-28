'use server';

import { getServerSupabase } from '@/lib/supabase/server';

export const MIDDLE_NAESIN_DRILL_TYPES = [
  'translation',
  'composition',
  'vocab_check',
  'vocab_test_en_en',
  'vocab_test_en_to_ko',
  'vocab_test_ko_to_en',
  'vocab_cram',
  'grammar_point',
] as const;
export type MiddleNaesinDrillType = (typeof MIDDLE_NAESIN_DRILL_TYPES)[number];

export type MiddleNaesinDrillDetailItem = {
  prompt: string;
  yourAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation?: string | null;
};

type SaveParams = {
  unitId: string;
  drillType: MiddleNaesinDrillType;
  refId?: string;
  score: number;
  total: number;
  detail?: MiddleNaesinDrillDetailItem[];
};

// 관리자가 /admin/middle-naesin/units/[unitId]/drill 에서 미리보기용으로 풀 때는
// 저장하지 않는다 — 실제 학생(student role)일 때만 기록한다.
export async function saveMiddleNaesinDrillResultAction(params: SaveParams) {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: '로그인이 필요합니다.' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.role !== 'student') {
      return { ok: true, skipped: true };
    }

    const refId = params.refId ?? '';

    const { data: existing } = await supabase
      .from('middle_naesin_drill_results')
      .select('id, attempt_count')
      .eq('student_id', user.id)
      .eq('unit_id', params.unitId)
      .eq('drill_type', params.drillType)
      .eq('ref_id', refId)
      .maybeSingle();

    const payload = {
      student_id: user.id,
      unit_id: params.unitId,
      drill_type: params.drillType,
      ref_id: refId,
      score: params.score,
      total: params.total,
      detail: params.detail ?? null,
      attempt_count: (existing?.attempt_count ?? 0) + 1,
      completed_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabase
        .from('middle_naesin_drill_results')
        .update(payload)
        .eq('id', existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from('middle_naesin_drill_results').insert(payload);
      if (error) throw new Error(error.message);
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '저장 실패' };
  }
}
