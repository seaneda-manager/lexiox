import { getServerSupabase } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

type TaskStatus = 'assigned' | 'in_progress' | 'completed' | 'overdue';

type StatusConfig = {
  label: string;
  bg: string;
  text: string;
  icon: string;
};

const STATUS_CONFIG: Record<TaskStatus, StatusConfig> = {
  assigned: { label: '시작하기', bg: 'bg-blue-50', text: 'text-blue-700', icon: '📋' },
  in_progress: { label: '진행 중', bg: 'bg-amber-50', text: 'text-amber-700', icon: '⏳' },
  completed: { label: '완료', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: '✅' },
  overdue: { label: '기한 만료', bg: 'bg-rose-50', text: 'text-rose-700', icon: '⏰' },
};

const TASK_TYPE_LABEL: Record<string, string> = {
  light: '기초 (4문제)',
  medium_1: '중급 유형1 (3문제)',
  medium_2: '중급 유형2 (2문제)',
  medium_3: '중급 유형3 (2문제)',
  medium_4: '중급 유형4 (2문제)',
};

export default async function DailyTestsPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: tasks, error } = await supabase
    .from('daily_tests')
    .select('*')
    .eq('student_id', user.id)
    .order('due_date', { ascending: true });

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-center">
            <p className="text-rose-700">⚠️ Daily Tests 조회 실패</p>
            <p className="text-sm text-rose-600 mt-2">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  const sorted = [...(tasks || [])].sort((a, b) => {
    const statusOrder: Record<TaskStatus, number> = {
      assigned: 0,
      in_progress: 1,
      completed: 2,
      overdue: 3,
    };
    return statusOrder[(a.status as TaskStatus) || 'assigned'] - statusOrder[(b.status as TaskStatus) || 'assigned'];
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📚 Daily Tests</h1>
          <p className="text-gray-600">할당된 Daily Test 과제들을 확인하고 풀어보세요</p>
        </div>

        {/* 컨텐츠 */}
        {!tasks || tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <p className="text-lg text-gray-600 mb-2">📚 아직 Daily Test가 없습니다</p>
            <p className="text-sm text-gray-500">선생님이 할당하면 여기에 나타납니다</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {sorted.map((task: any) => {
              const status = (task.status as TaskStatus) || 'assigned';
              const config = STATUS_CONFIG[status];
              const problemCount =
                (task.complete_words_ids?.length ?? 0) +
                (task.daily_life_ids?.length ?? 0) +
                (task.academic_passage_ids?.length ?? 0);

              const dueDate = task.due_date
                ? new Date(task.due_date).toLocaleDateString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                  })
                : '기한 없음';

              return (
                <Link
                  key={task.id}
                  href={`/student/daily-tests/${task.id}`}
                  className="group block rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition-all hover:border-blue-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
                          {config.icon} {config.label}
                        </span>
                        <span className="text-xs text-gray-500">{dueDate}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition">
                        {TASK_TYPE_LABEL[task.task_type] || task.task_type}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        <span>📝 {problemCount}문제</span>
                        <span>•</span>
                        <span>
                          난이도:{' '}
                          {task.difficulty === 'easy'
                            ? '쉬움'
                            : task.difficulty === 'core'
                            ? '중간'
                            : '어려움'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {status === 'assigned' && (
                        <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
                          시작하기 →
                        </button>
                      )}
                      {status === 'in_progress' && (
                        <div className="text-right">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 w-1/2"></div>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">진행 중</p>
                        </div>
                      )}
                      {status === 'completed' && (
                        <p className="text-sm font-medium text-emerald-600">✓ 완료</p>
                      )}
                      {status === 'overdue' && (
                        <p className="text-sm font-medium text-rose-600">기한 만료</p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* 정보 박스 */}
        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-700">
            💡 <strong>Daily Tests</strong>는 선생님이 할당하는 일일 학습 과제입니다. 각 과제는 다양한 문제 유형과 난이도로 구성되어 있습니다.
          </p>
          <ul className="text-xs text-blue-600 mt-3 space-y-1 ml-5 list-disc">
            <li>정해진 기한까지 과제를 완료하세요</li>
            <li>진행 상황은 자동으로 추적됩니다</li>
            <li>완료 후 답안 검토 및 피드백을 받을 수 있습니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
