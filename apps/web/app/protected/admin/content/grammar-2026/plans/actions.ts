'use server';

import { revalidatePath } from 'next/cache';
import { getServiceSupabase } from '@/lib/supabase/service';
import { getUserAndProfile } from '@/lib/getUserAndProfile';
import { syncGrammarPlan, rescheduleGrammarPlan } from '@/lib/grammar/syncGrammarPlan';

const PATH = '/admin/content/grammar-2026/plans';
const LEVELS = ['all', 'ms', 'hs', 'toefl'];
type Result = { ok: true; created: number } | { error: string };

async function requireStaff(): Promise<{ userId: string } | { error: string }> {
  const { user, profile } = await getUserAndProfile();
  if (!user) return { error: '로그인이 필요합니다.' };
  if (profile?.role !== 'admin' && profile?.role !== 'teacher') return { error: '관리자/선생님만 사용할 수 있습니다.' };
  return { userId: user.id };
}

const done = (r: { created: number } | { error: string }): Result => {
  revalidatePath(PATH);
  revalidatePath('/grammar-2026');
  return 'error' in r ? { error: r.error } : { ok: true, created: r.created };
};

// 학생의 플랜을 만들거나(없으면) 바꾸고(있으면), 오늘부터 일정을 다시 잡는다.
export async function savePlanAction(input: {
  studentId: string;
  startDate: string;
  weekdays: number[];
  unitsPerSession: number;
  level: string;
  startUnitId: string | null;
}): Promise<Result> {
  const who = await requireStaff();
  if ('error' in who) return who;

  const weekdays = [...new Set(input.weekdays)].filter((w) => Number.isInteger(w) && w >= 0 && w <= 6).sort();
  if (!input.studentId) return { error: '학생을 선택하세요.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) return { error: '시작일 형식이 올바르지 않습니다.' };
  if (weekdays.length === 0) return { error: '요일을 하나 이상 선택하세요.' };
  if (!Number.isInteger(input.unitsPerSession) || input.unitsPerSession < 1 || input.unitsPerSession > 10)
    return { error: '회당 챕터 수는 1~10 입니다.' };
  if (!LEVELS.includes(input.level)) return { error: '레벨 값이 올바르지 않습니다.' };

  const db = getServiceSupabase();
  const { data: stu } = await db.from('profiles').select('id, role').eq('id', input.studentId).maybeSingle();
  if (!stu || stu.role !== 'student') return { error: '학생 계정을 찾을 수 없습니다.' };

  const fields = {
    start_date: input.startDate,
    weekdays,
    units_per_session: input.unitsPerSession,
    level: input.level,
    start_unit_id: input.startUnitId || null,
    is_enabled: true,
  };
  const { data: existing } = await db.from('student_grammar_plans').select('id').eq('student_id', input.studentId).maybeSingle();

  let planId = existing?.id as string | undefined;
  if (planId) {
    const { error } = await db.from('student_grammar_plans').update(fields).eq('id', planId);
    if (error) return { error: error.message };
  } else {
    const { data: created, error } = await db
      .from('student_grammar_plans')
      .insert({ ...fields, student_id: input.studentId, created_by: who.userId })
      .select('id')
      .single();
    if (error || !created) return { error: error?.message ?? '플랜을 만들지 못했습니다.' };
    planId = created.id as string;
  }
  return done(await rescheduleGrammarPlan(planId));
}

export async function togglePauseAction(planId: string, paused: boolean): Promise<Result> {
  const who = await requireStaff();
  if ('error' in who) return who;
  const db = getServiceSupabase();
  const { error } = await db.from('student_grammar_plans').update({ is_paused: paused }).eq('id', planId);
  if (error) return { error: error.message };
  // 다시 시작할 때는 쉰 기간에 밀린 챕터를 오늘부터 다시 배치한다.
  return done(paused ? { created: 0 } : await rescheduleGrammarPlan(planId));
}

export async function resyncPlanAction(planId: string): Promise<Result> {
  const who = await requireStaff();
  if ('error' in who) return who;
  return done(await syncGrammarPlan(planId));
}

export async function reschedulePlanAction(planId: string): Promise<Result> {
  const who = await requireStaff();
  if ('error' in who) return who;
  return done(await rescheduleGrammarPlan(planId));
}

export async function deletePlanAction(planId: string): Promise<Result> {
  const who = await requireStaff();
  if ('error' in who) return who;
  const { error } = await getServiceSupabase().from('student_grammar_plans').delete().eq('id', planId);
  if (error) return { error: error.message };
  return done({ created: 0 });
}
