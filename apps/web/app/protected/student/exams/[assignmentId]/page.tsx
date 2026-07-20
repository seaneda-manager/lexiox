import { getServerSupabase } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ExamTaker from './_components/ExamTaker';

const MONTH_LABEL: Record<number, string> = {
  4: '1학기 중간 (4월)', 7: '1학기 기말 (7월)', 10: '2학기 중간 (10월)', 12: '2학기 기말 (12월)',
};
const GRADE_LABEL: Record<string, string> = {
  H1: '고1', H2: '고2', H3: '고3', M1: '중1', M2: '중2', M3: '중3',
};

export default async function StudentExamPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: assignment } = await supabase
    .from('generated_exam_assignments')
    .select('id, exam_id, due_date')
    .eq('id', assignmentId)
    .eq('student_id', user!.id)
    .single();

  if (!assignment) notFound();

  const [{ data: exam }, { data: response }] = await Promise.all([
    supabase.from('generated_exams')
      .select('id, school, grade, exam_year, exam_month, questions')
      .eq('id', assignment.exam_id)
      .single(),
    supabase.from('generated_exam_responses')
      .select('answers, submitted_at')
      .eq('assignment_id', assignmentId)
      .eq('student_id', user!.id)
      .maybeSingle(),
  ]);

  if (!exam) notFound();

  const submitted = !!response?.submitted_at;
  const savedAnswers: Record<string, string> = response?.answers ?? {};

  const gradeLabel = GRADE_LABEL[exam.grade] ?? exam.grade;
  const monthLabel = MONTH_LABEL[exam.exam_month] ?? `${exam.exam_month}월`;
  const examLabel = `${exam.school} ${gradeLabel} ${exam.exam_year}년 ${monthLabel}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/student/exams" className="text-sm text-neutral-400 hover:text-neutral-600 transition">
          ← 목록
        </Link>
        <span className="text-neutral-200">|</span>
        <h1 className="text-xl font-bold text-neutral-900">{examLabel}</h1>
        {submitted && (
          <span className="rounded-full bg-green-100 px-3 py-0.5 text-xs font-semibold text-green-700">제출완료</span>
        )}
      </div>

      <ExamTaker
        assignmentId={assignmentId}
        questions={exam.questions ?? []}
        savedAnswers={savedAnswers}
        submitted={submitted}
      />
    </div>
  );
}
