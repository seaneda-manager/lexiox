'use server';

import { revalidatePath } from 'next/cache';
import { getServiceSupabase } from '@/lib/supabase/service';
import { getUserAndProfile } from '@/lib/getUserAndProfile';
import { syncConceptPlan, rescheduleConceptPlan } from '@/lib/grammar/syncConceptPlan';

const PATH = '/admin/grammar-engine/schedule';
type Result = { ok: true; created: number } | { error: string };

async function requireStaff(): Promise<{ userId: string } | { error: string }> {
  const { user, profile } = await getUserAndProfile();
  if (!user) return { error: '로그인이 필요합니다.' };
  if (profile?.role !== 'admin' && profile?.role !== 'teacher') return { error: '관리자/선생님만 사용할 수 있습니다.' };
  return { userId: user.id };
}

const done = (r: { created: number } | { error: string }): Result => {
  revalidatePath(PATH);
  revalidatePath('/student/grammar');
  return 'error' in r ? { error: r.error } : { ok: true, created: r.created };
};

// 학생의 개념 스케줄을 만들거나(없으면) 바꾸고(있으면), 오늘부터 일정을 다시 잡는다.
export async function saveConceptPlanAction(input: {
  studentId: string;
  bookId: string | null;
  currentUnitId: string | null;
  level: number;
  startDate: string;
  weekdays: number[];
  perSession: number;
}): Promise<Result> {
  const who = await requireStaff();
  if ('error' in who) return who;

  const weekdays = [...new Set(input.weekdays)].filter((w) => Number.isInteger(w) && w >= 0 && w <= 6).sort();
  if (!input.studentId) return { error: '학생을 선택하세요.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) return { error: '시작일 형식이 올바르지 않습니다.' };
  if (weekdays.length === 0) return { error: '요일을 하나 이상 선택하세요.' };
  if (!Number.isInteger(input.perSession) || input.perSession < 1 || input.perSession > 10) return { error: '회당 개념 수는 1~10 입니다.' };
  if (!Number.isInteger(input.level) || input.level < 1 || input.level > 5) return { error: '레벨은 1~5 입니다.' };
  if (input.currentUnitId && !input.bookId) return { error: '교재를 먼저 선택하세요.' };

  const db = getServiceSupabase();
  const { data: stu } = await db.from('profiles').select('id, role').eq('id', input.studentId).maybeSingle();
  if (!stu || stu.role !== 'student') return { error: '학생 계정을 찾을 수 없습니다.' };

  const fields = {
    book_id: input.bookId || null,
    current_unit_id: input.bookId ? input.currentUnitId || null : null,
    level: input.level,
    start_date: input.startDate,
    weekdays,
    units_per_session: input.perSession,
    is_enabled: true,
    updated_at: new Date().toISOString(),
  };
  const { data: existing } = await db.from('student_grammar_concept_plans').select('id').eq('student_id', input.studentId).eq('kind', 'regular').maybeSingle();

  let planId = existing?.id as string | undefined;
  if (planId) {
    const { error } = await db.from('student_grammar_concept_plans').update(fields).eq('id', planId);
    if (error) return { error: error.message };
  } else {
    const { data: created, error } = await db
      .from('student_grammar_concept_plans')
      .insert({ ...fields, student_id: input.studentId, kind: 'regular', created_by: who.userId })
      .select('id')
      .single();
    if (error || !created) return { error: error?.message ?? '플랜을 만들지 못했습니다.' };
    planId = created.id as string;
  }
  return done(await rescheduleConceptPlan(planId));
}

// 여러 학생(같은 반·학년)에게 같은 설정으로 한 번에 배정한다. 학생마다 saveConceptPlanAction 과 같은 규칙을 적용.
export async function saveConceptPlansForStudentsAction(
  input: Omit<Parameters<typeof saveConceptPlanAction>[0], 'studentId'> & { studentIds: string[] },
): Promise<{ ok: true; students: number; created: number } | { error: string }> {
  const ids = [...new Set(input.studentIds)].filter(Boolean);
  if (ids.length === 0) return { error: '학생을 한 명 이상 선택하세요.' };
  const { studentIds: _ignored, ...rest } = input;
  let created = 0;
  const failed: string[] = [];
  for (const studentId of ids) {
    const r = await saveConceptPlanAction({ ...rest, studentId });
    if ('error' in r) failed.push(`${studentId.slice(0, 8)}: ${r.error}`);
    else created += r.created;
  }
  if (failed.length === ids.length) return { error: failed[0] };
  if (failed.length > 0) return { error: `${ids.length - failed.length}명 완료, ${failed.length}명 실패 — ${failed[0]}` };
  return { ok: true, students: ids.length, created };
}

export async function toggleConceptPauseAction(planId: string, paused: boolean): Promise<Result> {
  const who = await requireStaff();
  if ('error' in who) return who;
  const { error } = await getServiceSupabase().from('student_grammar_concept_plans').update({ is_paused: paused }).eq('id', planId);
  if (error) return { error: error.message };
  return done(paused ? { created: 0 } : await rescheduleConceptPlan(planId));
}

export async function resyncConceptPlanAction(planId: string): Promise<Result> {
  const who = await requireStaff();
  if ('error' in who) return who;
  return done(await syncConceptPlan(planId));
}

export async function rescheduleConceptPlanAction(planId: string): Promise<Result> {
  const who = await requireStaff();
  if ('error' in who) return who;
  return done(await rescheduleConceptPlan(planId));
}

export async function deleteConceptPlanAction(planId: string): Promise<Result> {
  const who = await requireStaff();
  if ('error' in who) return who;
  const { error } = await getServiceSupabase().from('student_grammar_concept_plans').delete().eq('id', planId);
  if (error) return { error: error.message };
  return done({ created: 0 });
}
