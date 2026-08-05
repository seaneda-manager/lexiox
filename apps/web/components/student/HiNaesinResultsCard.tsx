import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';

export default async function HiNaesinResultsCard() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // 최근 제출된 세션들 조회
  const { data: sessions } = await supabase
    .from('hi_naesin_sessions')
    .select('id, passage_id, status, submitted_at, score_percent')
    .eq('student_id', user.id)
    .eq('session_type', 'drill')
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })
    .limit(5);

  if (!sessions || sessions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
        <p className="text-sm text-gray-600">📊 아직 제출된 Hi-내신 드릴이 없습니다</p>
      </div>
    );
  }

  // 평균 점수 계산
  const avgScore = Math.round(
    sessions.reduce((sum, s) => sum + (s.score_percent || 0), 0) / sessions.length
  );

  return (
    <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-cyan-50 to-blue-25 px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-cyan-900">📊 Hi-내신 드릴 결과</h3>
            <p className="text-xs text-cyan-700 mt-1">최근 {sessions.length}개 제출 • 평균 점수 {avgScore}%</p>
          </div>
          <Link
            href="/hi-naesin/stats"
            className="text-xs font-medium text-cyan-600 hover:text-cyan-700 hover:underline"
          >
            전체보기 →
          </Link>
        </div>
      </div>

      {/* 결과 목록 */}
      <div className="divide-y">
        {sessions.map((session) => {
          const score = session.score_percent || 0;
          const scoreColor =
            score >= 80
              ? 'bg-emerald-50 text-emerald-700'
              : score >= 60
              ? 'bg-amber-50 text-amber-700'
              : 'bg-rose-50 text-rose-700';

          const submitted = session.submitted_at
            ? new Date(session.submitted_at).toLocaleDateString('ko-KR', {
                month: 'short',
                day: 'numeric',
              })
            : '미제출';

          return (
            <Link
              key={session.id}
              href={`/hi-naesin/drill/${session.id}/review`}
              className="block p-4 hover:bg-cyan-50 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    드릴 세션
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span>{submitted}</span>
                    <span>•</span>
                    <span>지문 {session.passage_id?.slice(0, 8)}...</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${scoreColor}`}>
                    {score}%
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 풋터 */}
      <div className="bg-gray-50 px-4 py-3 border-t text-center">
        <Link
          href="/hi-naesin/stats"
          className="text-xs font-medium text-cyan-600 hover:text-cyan-700 hover:underline"
        >
          약점 분석 보기 →
        </Link>
      </div>
    </div>
  );
}
