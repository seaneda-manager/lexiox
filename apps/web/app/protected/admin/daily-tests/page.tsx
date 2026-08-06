import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import DailyTaskManagerClient from './_client/DailyTaskManagerClient';

interface Student {
  id: string;
  name: string;
  email: string;
}

export default async function DailyTaskPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  try {
    // 전체 Daily Test 통계 (soft delete 필터 적용)
    const { data: allTasks, count } = await supabase
      .from('daily_tests')
      .select('*', { count: 'exact' })
      .is('deleted_at', null) // 삭제되지 않은 것만
      .order('created_at', { ascending: false })
      .limit(20);

    // 학생 목록 조회 (Admin API 사용)
    let studentList: Student[] = [];
    try {
      const { data: { users }, error } = await supabase.auth.admin.listUsers();

      if (!error && users) {
        studentList = users
          .filter(u => !u.user_metadata?.role || u.user_metadata?.role === 'student')
          .map(u => ({
            id: u.id,
            name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Unknown',
            email: u.email || '',
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
    }

    // 상태별 집계
    const stats = {
      total: count ?? 0,
      assigned: allTasks?.filter((t) => t.status === 'assigned').length ?? 0,
      in_progress: allTasks?.filter((t) => t.status === 'in_progress').length ?? 0,
      completed: allTasks?.filter((t) => t.status === 'completed').length ?? 0,
      overdue: allTasks?.filter((t) => t.status === 'overdue').length ?? 0,
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📚 Daily Tests 관리</h1>
            <p className="text-sm text-gray-600 mt-1">학생을 위한 일일 학습 과제 생성 및 할당</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">전체 과제</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <span className="text-3xl">📊</span>
            </div>
          </div>

          <div className="rounded-lg border bg-blue-50 p-4 shadow-sm border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-700">할당됨</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{stats.assigned}</p>
              </div>
              <span className="text-3xl">📋</span>
            </div>
          </div>

          <div className="rounded-lg border bg-amber-50 p-4 shadow-sm border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-700">진행 중</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">{stats.in_progress}</p>
              </div>
              <span className="text-3xl">⏳</span>
            </div>
          </div>

          <div className="rounded-lg border bg-emerald-50 p-4 shadow-sm border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-700">완료</p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">{stats.completed}</p>
              </div>
              <span className="text-3xl">✅</span>
            </div>
          </div>

          <div className="rounded-lg border bg-rose-50 p-4 shadow-sm border-rose-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-rose-700">기한 만료</p>
                <p className="text-2xl font-bold text-rose-900 mt-1">{stats.overdue}</p>
              </div>
              <span className="text-3xl">⏰</span>
            </div>
          </div>
        </div>

        {/* Client Component */}
        <DailyTaskManagerClient
          stats={stats}
          recentTasks={allTasks ?? []}
          students={studentList}
        />
      </div>
    );
  } catch (error) {
    console.error('Daily Task page error:', error);
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6">
        <p className="text-sm text-rose-700">⚠️ 데이터 로드 실패</p>
        <p className="text-xs text-rose-600 mt-2">{error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }
}
