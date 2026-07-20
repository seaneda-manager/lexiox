'use server';

import { getServerSupabase } from '@/lib/supabase/server';

export async function assignExamToStudents(
  examId: string,
  studentIds: string[],
  dueDate?: string,
): Promise<{ error?: string }> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const rows = studentIds.map((studentId) => ({
    exam_id: examId,
    student_id: studentId,
    assigned_by: user.id,
    due_date: dueDate || null,
  }));

  const { error } = await supabase
    .from('generated_exam_assignments')
    .upsert(rows, { onConflict: 'exam_id,student_id' });

  if (error) return { error: error.message };
  return {};
}

export async function removeExamAssignment(
  examId: string,
  studentId: string,
): Promise<{ error?: string }> {
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from('generated_exam_assignments')
    .delete()
    .eq('exam_id', examId)
    .eq('student_id', studentId);

  if (error) return { error: error.message };
  return {};
}
