import { getServerSupabase } from '@/lib/supabase/server';
import Link from 'next/link';

const MONTH_LABEL: Record<number, string> = {
  4: '1학기 중간',
  7: '1학기 기말',
  10: '2학기 중간',
  12: '2학기 기말',
};

const GRADE_LABEL: Record<string, string> = {
  H1: '고1', H2: '고2', H3: '고3',
  M1: '중1', M2: '중2', M3: '중3',
};

export default async function SavedExamsPage() {
  const supabase = await getServerSupabase();

  const { data: exams } = await supabase
    .from('generated_exams')
    .select('id, created_at, school, grade, exam_year, exam_month, questions')
    .order('created_at', { ascending: false });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">📋 저장된 시험</h1>
          <p className="mt-1 text-sm text-neutral-500">생성 후 저장한 예상문제 목록입니다.</p>
        </div>
        <Link href="/teacher/exam-generator"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">
          + 새 문제 생성
        </Link>
      </div>

      {!exams || exams.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-8 text-center text-sm text-neutral-400">
          저장된 시험이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => {
            const date = new Date(exam.created_at).toLocaleDateString('ko-KR', {
              year: 'numeric', month: 'long', day: 'numeric',
            });
            const gradeLabel = GRADE_LABEL[exam.grade] ?? exam.grade;
            const monthLabel = MONTH_LABEL[exam.exam_month] ?? `${exam.exam_month}월`;
            const qCount = Array.isArray(exam.questions) ? exam.questions.length : 0;

            return (
              <Link key={exam.id} href={`/teacher/exam-generator/saved/${exam.id}`}
                className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition">
                <div className="space-y-1">
                  <p className="font-semibold text-neutral-900">
                    {exam.school} · {gradeLabel} · {exam.exam_year}년 {monthLabel}
                  </p>
                  <p className="text-sm text-neutral-500">{qCount}문항 · {date}</p>
                </div>
                <span className="text-sm text-indigo-500 font-medium">열기 →</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
