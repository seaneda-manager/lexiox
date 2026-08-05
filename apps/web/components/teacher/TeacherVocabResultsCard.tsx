import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';

type StudentVocabPlan = {
  studentId: string;
  studentName: string;
  trackTitle: string;
  cursorDayIndex: number;
  totalDays: number;
  startDate: string;
  progressPercent: number;
};

export default async function TeacherVocabResultsCard() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // 현재 선생님이 배정한 모든 학생 조회
  const { data: assignments } = await supabase
    .from('hi_naesin_assignments')
    .select('student_id')
    .eq('assigned_by', user.id);

  if (!assignments || assignments.length === 0) {
    return null;
  }

  const studentIds = [...new Set(assignments.map(a => a.student_id))];

  // 각 학생의 어휘 계획 조회
  const { data: vocabPlans } = await supabase
    .from('student_vocab_plans')
    .select('id, student_id, track_id, cursor_day_index, start_date, is_active')
    .in('student_id', studentIds)
    .eq('is_enabled', true);

  if (!vocabPlans || vocabPlans.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
        <p className="text-sm text-gray-600">📚 어휘 학습 계획이 없습니다</p>
      </div>
    );
  }

  // 트랙 정보 조회
  const trackIds = [...new Set(vocabPlans.map(p => p.track_id))];
  const { data: tracks } = await supabase
    .from('vocab_tracks')
    .select('id, title, total_days')
    .in('id', trackIds);

  const trackMap = new Map(
    (tracks ?? []).map((t: any) => [
      t.id,
      { title: t.title || '어휘', totalDays: t.total_days || 60 }
    ])
  );

  // 학생 이름 조회
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', studentIds);

  const profileMap = new Map(
    (profiles ?? []).map((p: any) => [p.id, p.full_name || '이름없음'])
  );

  // 결과 변환
  const results: StudentVocabPlan[] = vocabPlans.map((plan: any) => {
    const trackInfo = trackMap.get(plan.track_id) || { title: '어휘', totalDays: 60 };
    const progressPercent = Math.round(
      (plan.cursor_day_index / trackInfo.totalDays) * 100
    );

    return {
      studentId: plan.student_id,
      studentName: profileMap.get(plan.student_id) || '이름없음',
      trackTitle: trackInfo.title,
      cursorDayIndex: plan.cursor_day_index,
      totalDays: trackInfo.totalDays,
      startDate: plan.start_date,
      progressPercent: Math.min(progressPercent, 100),
    };
  });

  // 진행도 순으로 정렬 (완료된 것 먼저)
  const sorted = results.sort((a, b) => b.progressPercent - a.progressPercent);

  const completed = sorted.filter(r => r.progressPercent >= 100);
  const inProgress = sorted.filter(r => r.progressPercent > 0 && r.progressPercent < 100);
  const notStarted = sorted.filter(r => r.progressPercent === 0);

  return (
    <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-violet-50 to-purple-25 px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-violet-900">📚 Lexiox Voca</h3>
            <p className="text-xs text-violet-700 mt-1">
              학생 {studentIds.length}명 • 완료 {completed.length}명
            </p>
          </div>
          <Link
            href={`/teacher/reports/students`}
            className="text-xs font-medium text-violet-600 hover:text-violet-700 hover:underline"
          >
            상세보기 →
          </Link>
        </div>
      </div>

      {/* 진행 중인 학생 */}
      {inProgress.length > 0 && (
        <div className="divide-y">
          {inProgress.slice(0, 6).map((result) => (
            <div key={result.studentId} className="p-3 hover:bg-violet-50 transition-colors">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {result.studentName}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {result.trackTitle}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-violet-700">
                    {result.progressPercent}%
                  </p>
                  <p className="text-xs text-gray-500">
                    Day {result.cursorDayIndex}/{result.totalDays}
                  </p>
                </div>
              </div>

              {/* 진행률 바 */}
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 transition-all"
                  style={{ width: `${result.progressPercent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 완료된 학생 */}
      {completed.length > 0 && (
        <div className={`${inProgress.length > 0 ? 'border-t' : ''} bg-emerald-50/50`}>
          <div className="px-4 py-2 border-b">
            <p className="text-xs font-medium text-emerald-700">✅ 완료 ({completed.length}명)</p>
          </div>
          <div className="divide-y">
            {completed.slice(0, 3).map((result) => (
              <div key={result.studentId} className="flex items-center justify-between gap-3 p-3 hover:bg-emerald-50 transition-colors">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{result.studentName}</p>
                  <p className="text-xs text-gray-500">{result.trackTitle}</p>
                </div>
                <p className="text-xs font-semibold text-emerald-600">완료</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 미시작 학생 */}
      {notStarted.length > 0 && (
        <div className={`${inProgress.length > 0 || completed.length > 0 ? 'border-t' : ''} bg-gray-50/50`}>
          <div className="px-4 py-2 border-b">
            <p className="text-xs font-medium text-gray-600">미시작 ({notStarted.length}명)</p>
          </div>
          <div className="space-y-1 px-4 py-2">
            {notStarted.slice(0, 2).map((result) => (
              <p key={result.studentId} className="text-xs text-gray-500">
                • {result.studentName}
              </p>
            ))}
            {notStarted.length > 2 && (
              <p className="text-xs text-gray-400">• 외 {notStarted.length - 2}명</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
