import { createClient } from '@supabase/supabase-js';
import ProblemBankClient from './_client/ProblemBankClient';

export default async function ProblemBankPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  try {
    // 전체 통계 조회
    const [
      { count: totalCompleteWords },
      { count: totalDailyLife },
      { count: totalAcademicPassage },
      { data: recentProblems },
    ] = await Promise.all([
      supabase.from('problem_bank_complete_words_2026').select('*', { count: 'exact', head: true }),
      supabase.from('problem_bank_daily_life_2026').select('*', { count: 'exact', head: true }),
      supabase.from('problem_bank_academic_passage_2026').select('*', { count: 'exact', head: true }),
      supabase
        .from('problem_bank_complete_words_2026')
        .select('id, topic, difficulty, created_at, source_test_id')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const stats = {
      totalCompleteWords: totalCompleteWords ?? 0,
      totalDailyLife: totalDailyLife ?? 0,
      totalAcademicPassage: totalAcademicPassage ?? 0,
      total: (totalCompleteWords ?? 0) + (totalDailyLife ?? 0) + (totalAcademicPassage ?? 0),
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📚 Problem Bank 관리</h1>
          <p className="text-sm text-gray-600 mt-1">Reading/Listening 테스트에서 추출된 문제 데이터베이스</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">전체 문제</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <span className="text-3xl">📊</span>
            </div>
          </div>

          <div className="rounded-lg border bg-sky-50 p-4 shadow-sm border-sky-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-sky-700">완성형 (Complete Words)</p>
                <p className="text-2xl font-bold text-sky-900 mt-1">{stats.totalCompleteWords}</p>
              </div>
              <span className="text-3xl">✏️</span>
            </div>
          </div>

          <div className="rounded-lg border bg-amber-50 p-4 shadow-sm border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-700">일상 (Daily Life)</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">{stats.totalDailyLife}</p>
              </div>
              <span className="text-3xl">💬</span>
            </div>
          </div>

          <div className="rounded-lg border bg-violet-50 p-4 shadow-sm border-violet-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-violet-700">학술 (Academic)</p>
                <p className="text-2xl font-bold text-violet-900 mt-1">{stats.totalAcademicPassage}</p>
              </div>
              <span className="text-3xl">📖</span>
            </div>
          </div>
        </div>

        {/* Client Component */}
        <ProblemBankClient stats={stats} recentProblems={recentProblems ?? []} />
      </div>
    );
  } catch (error) {
    console.error('Problem Bank page error:', error);
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6">
        <p className="text-sm text-rose-700">⚠️ 데이터 로드 실패</p>
        <p className="text-xs text-rose-600 mt-2">{error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }
}
