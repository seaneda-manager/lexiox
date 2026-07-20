import { getServerSupabase } from '@/lib/supabase/server';
import Link from 'next/link';
import ExamGeneratorForm from './_components/ExamGeneratorForm';

export type PassageFilter = {
  school: string;
  grade: string;
  examYear: number;
  examMonth: number;
};

export default async function ExamGeneratorPage() {
  const supabase = await getServerSupabase();

  // Fetch distinct combinations of school/grade/year/month that have assignments
  const { data: rows } = await supabase
    .from('hi_naesin_passages')
    .select('school_name, grade, exam_year, exam_month')
    .eq('is_published', true)
    .not('school_name', 'is', null)
    .not('grade', 'is', null)
    .not('exam_year', 'is', null)
    .not('exam_month', 'is', null);

  // Deduplicate combinations
  const seen = new Set<string>();
  const filters: PassageFilter[] = [];
  for (const r of rows ?? []) {
    const key = `${r.school_name}|${r.grade}|${r.exam_year}|${r.exam_month}`;
    if (!seen.has(key)) {
      seen.add(key);
      filters.push({
        school: r.school_name as string,
        grade: r.grade as string,
        examYear: r.exam_year as number,
        examMonth: r.exam_month as number,
      });
    }
  }

  // Sort: school → grade → year desc → month desc
  filters.sort((a, b) =>
    a.school.localeCompare(b.school) ||
    a.grade.localeCompare(b.grade) ||
    b.examYear - a.examYear ||
    b.examMonth - a.examMonth,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="print:hidden flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">📝 예상문제 생성기</h1>
          <p className="mt-1 text-sm text-neutral-500">
            학교·학년·시험 범위별 배정 지문을 분석해 수능/내신 스타일 30문항을 생성합니다.
          </p>
        </div>
        <Link href="/teacher/exam-generator/saved"
          className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition whitespace-nowrap">
          📋 저장된 시험
        </Link>
      </div>

      {filters.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700">
          배정된 지문이 없습니다. 먼저 관리자 화면에서 지문을 학생에게 배정해주세요.
        </div>
      ) : (
        <ExamGeneratorForm filters={filters} />
      )}
    </div>
  );
}
