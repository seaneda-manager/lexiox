'use server';

import { getServerSupabase } from '@/lib/supabase/server';
import type { ExamQuestion } from './generate';

export async function saveGeneratedExam(
  schools: string[],
  grade: string,
  examYear: number,
  examMonth: number,
  questions: ExamQuestion[],
  title: string,
): Promise<{ id?: string; error?: string }> {
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const { data, error } = await supabase
    .from('generated_exams')
    .insert({ created_by: user.id, school: schools.join(', '), grade, exam_year: examYear, exam_month: examMonth, questions, title })
    .select('id')
    .single();

  if (error) return { error: error.message };
  return { id: data.id };
}
