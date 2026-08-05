import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';

type StudentResult = {
  studentId: string;
  studentName: string;
  lastScore: number | null;
  lastSubmittedAt: string | null;
  totalSubmitted: number;
};

export default async function TeacherHiNaesinResultsCard() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // 현재 선생님이 배정한 모든 학생 조회
  const { data: assignments } = await supabase
    .from('hi_naesin_assignments')
    .select('student_id')
    .eq('assigned_by', user.id);

  if (!assignments || assignments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
        <p className="text-sm text-gray-600">📊 배정한 학생이 없습니다</p>
      </div>
    );
  }

  const studentIds = [...new Set(assignments.map(a => a.student_id))];

  // 각 학생의 최근 hi-naesin 결과
  const { data: sessions } = await supabase
    .from('hi_naesin_sessions')
    .select('student_id, score_percent, submitted_at')
    .eq('session_type', 'drill')
    .eq('status', 'submitted')
    .in('student_id', studentIds)
    .order('submitted_at', { ascending: false });

  // 학생 이름 조회
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', studentIds);

  const profileMap = new Map(
    (profiles ?? []).map((p: any) => [p.id, p.full_name || '이름없음'])
  );

  // 학생별로 최근 결과 그룹화
  const studentResults: Record<string, StudentResult> = {};

  for (const studentId of studentIds) {
    studentResults[studentId] = {
      studentId,
      studentName: profileMap.get(studentId) || '이름없음',
      lastScore: null,
      lastSubmittedAt: null,
      totalSubmitted: 0,
    };
  }

  // 세션 데이터 매핑
  if (sessions) {
    for (const session of sessions) {
      const key = session.student_id;
      if (studentResults[key]) {
        studentResults[key].totalSubmitted++;
        if (!studentResults[key].lastScore) {
          studentResults[key].lastScore = session.score_percent ?? null;
          studentResults[key].lastSubmittedAt = session.submitted_at ?? null;
        }
      }
    }
  }

  const results = Object.values(studentResults)
    .filter(r => r.lastScore !== null)
    .sort((a, b) => (b.lastScore ?? 0) - (a.lastScore ?? 0));

  const avgScore = results.length > 0
    ? Math.round(
        results.reduce((sum, r) => sum + (r.lastScore || 0), 0) / results.length
      )
    : null;

  const noResults = Object.values(studentResults).filter(r => r.lastScore === null);

  return (
    <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-cyan-50 to-blue-25 px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-cyan-900">Hi-내신 드릴 결과</h3>
            <p className="text-xs text-cyan-700 mt-1">
              학생 {studentIds.length}명 • 평균 점수 {avgScore ?? '—'}%
            </p>
          </div>
          <Link
            href={`/teacher/reports/students`}
            className="text-xs font-medium text-cyan-600 hover:text-cyan-700 hover:underline"
          >
            상세보기 →
          </Link>
        </div>
      </div>

      {/* 결과 있는 학생 */}
      {results.length > 0 && (
        <div className="divide-y">
          {results.slice(0, 8).map((result) => {
            const score = result.lastScore ?? 0;
            const scoreColor =
              score >= 80
                ? 'bg-emerald-50 text-emerald-700'
                : score >= 60
                ? 'bg-amber-50 text-amber-700'
                : 'bg-rose-50 text-rose-700';

            const submitted = result.lastSubmittedAt
              ? new Date(result.lastSubmittedAt).toLocaleDateString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                })
              : '—';

            return (
              <div
                key={result.studentId}
                className="flex items-center justify-between gap-3 p-3 hover:bg-cyan-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {result.studentName}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {result.totalSubmitted}회 제출 • {submitted}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${scoreColor}`}>
                  {score}%
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 아직 미제출 학생 */}
      {noResults.length > 0 && (
        <div className="border-t bg-gray-50 px-4 py-3">
          <p className="text-xs font-medium text-gray-600 mb-2">아직 미제출 ({noResults.length}명)</p>
          <div className="space-y-1">
            {noResults.slice(0, 3).map((result) => (
              <p key={result.studentId} className="text-xs text-gray-500">
                • {result.studentName}
              </p>
            ))}
            {noResults.length > 3 && (
              <p className="text-xs text-gray-400">• 외 {noResults.length - 3}명</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
