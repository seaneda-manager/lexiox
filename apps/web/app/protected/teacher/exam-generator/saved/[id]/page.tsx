import { getServerSupabase } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import SavedExamViewer from './_components/SavedExamViewer';
import AssignPanel from './_components/AssignPanel';
import ResponsesPanel from './_components/ResponsesPanel';

const MONTH_LABEL: Record<number, string> = {
  4: '1학기 중간 (4월)',
  7: '1학기 기말 (7월)',
  10: '2학기 중간 (10월)',
  12: '2학기 기말 (12월)',
};

const GRADE_LABEL: Record<string, string> = {
  H1: '고1', H2: '고2', H3: '고3',
  M1: '중1', M2: '중2', M3: '중3',
};

export default async function SavedExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [{ data: exam }, { data: studentRows }, { data: assignmentRows }, { data: responseRows }] = await Promise.all([
    supabase.from('generated_exams').select('*').eq('id', id).single(),
    supabase.from('academy_students')
      .select('id, display_name, school, grade, user_id, auth_user_id')
      .eq('is_active', true)
      .order('display_name'),
    supabase.from('generated_exam_assignments')
      .select('student_id')
      .eq('exam_id', id),
    supabase.from('generated_exam_assignments')
      .select('student_id, generated_exam_responses(answers, submitted_at)')
      .eq('exam_id', id),
  ]);

  if (!exam) notFound();

  const gradeLabel = GRADE_LABEL[exam.grade] ?? exam.grade;
  const monthLabel = MONTH_LABEL[exam.exam_month] ?? `${exam.exam_month}월`;
  const examLabel = `${exam.school} ${gradeLabel} ${exam.exam_year}년 ${monthLabel}`;

  const students = (studentRows ?? []).map((s: any) => ({
    id: (s.user_id ?? s.auth_user_id ?? s.id) as string,
    name: s.display_name ?? '이름없음',
    school: s.school ?? '',
    grade: s.grade ?? '',
  }));

  const assignedStudentIds = new Set((assignmentRows ?? []).map((r) => r.student_id));

  const responses = (responseRows ?? []).map((r: any) => ({
    studentId: r.student_id,
    answers: r.generated_exam_responses?.[0]?.answers ?? {},
    submittedAt: r.generated_exam_responses?.[0]?.submitted_at ?? null,
  }));

  const assignedStudents = students.filter((s) => assignedStudentIds.has(s.id));

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="print:hidden flex items-center gap-3">
        <Link href="/teacher/exam-generator/saved" className="text-sm text-neutral-400 hover:text-neutral-600 transition">
          ← 목록
        </Link>
        <span className="text-neutral-200">|</span>
        <h1 className="text-xl font-bold text-neutral-900">{examLabel}</h1>
      </div>

      <SavedExamViewer exam={exam} examLabel={examLabel} />

      <AssignPanel
        examId={id}
        students={students}
        assignedStudentIds={[...assignedStudentIds]}
      />

      <ResponsesPanel
        students={assignedStudents}
        responses={responses}
        questions={exam.questions ?? []}
      />
    </div>
  );
}
