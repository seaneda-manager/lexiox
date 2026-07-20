import { getServerSupabase } from '@/lib/supabase/server';

export type AwardPointsInput = {
  studentId:  string;
  ruleId:     string;
  bonus?:     number;
  sourceRef?: string;
  metadata?:  Record<string, unknown>;
};

export type AwardPointsResult = {
  pointsEarned: number;
  newTotal:     number;
  newLevel:     number;
  levelUp:      boolean;
};

export async function awardPoints(input: AwardPointsInput): Promise<AwardPointsResult | null> {
  try {
    const supabase = await getServerSupabase();

    // 현재 레벨 기억
    const { data: before } = await supabase
      .from('student_gamification')
      .select('total_points, level')
      .eq('student_id', input.studentId)
      .maybeSingle();

    const prevLevel = before?.level ?? 1;

    // DB 함수로 원자적 포인트 적립
    const { data: earned, error } = await supabase.rpc('award_points', {
      p_student_id: input.studentId,
      p_rule_id:    input.ruleId,
      p_bonus:      input.bonus ?? 0,
      p_source_ref: input.sourceRef ?? null,
      p_metadata:   input.metadata ? JSON.stringify(input.metadata) : null,
    });

    if (error || earned === null) {
      console.error('[awardPoints]', error);
      return null;
    }

    const { data: after } = await supabase
      .from('student_gamification')
      .select('total_points, level')
      .eq('student_id', input.studentId)
      .maybeSingle();

    return {
      pointsEarned: earned as number,
      newTotal:     after?.total_points ?? 0,
      newLevel:     after?.level ?? 1,
      levelUp:      (after?.level ?? 1) > prevLevel,
    };
  } catch (err) {
    console.error('[awardPoints] unexpected', err);
    return null;
  }
}
