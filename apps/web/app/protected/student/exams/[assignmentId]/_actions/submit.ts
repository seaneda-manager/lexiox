'use server';

import { getServerSupabase } from '@/lib/supabase/server';

export async function saveExamAnswers(
  assignmentId: string,
  answers: Record<string, string>,
): Promise<{ error?: string }> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const { error } = await supabase
    .from('generated_exam_responses')
    .upsert({ assignment_id: assignmentId, student_id: user.id, answers }, { onConflict: 'assignment_id,student_id' });

  if (error) return { error: error.message };
  return {};
}

export async function submitExam(
  assignmentId: string,
  answers: Record<string, string>,
): Promise<{ error?: string }> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const { error } = await supabase
    .from('generated_exam_responses')
    .upsert({
      assignment_id: assignmentId,
      student_id: user.id,
      answers,
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'assignment_id,student_id' });

  if (error) return { error: error.message };
  return {};
}
