import { createClient } from '@supabase/supabase-js';
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import type { DailyTaskWithProblems } from "@/lib/types/problem-bank";

type TaskStatus = "assigned" | "in_progress" | "completed" | "overdue";

type StatusConfig = {
  label: string;
  bg: string;
  text: string;
  icon: string;
};

const STATUS_CONFIG: Record<TaskStatus, StatusConfig> = {
  assigned: { label: "시작하기", bg: "bg-blue-50", text: "text-blue-700", icon: "📋" },
  in_progress: { label: "진행 중", bg: "bg-amber-50", text: "text-amber-700", icon: "⏳" },
  completed: { label: "완료", bg: "bg-emerald-50", text: "text-emerald-700", icon: "✅" },
  overdue: { label: "기한 만료", bg: "bg-rose-50", text: "text-rose-700", icon: "⏰" },
};

const TASK_TYPE_LABEL: Record<string, string> = {
  light: "기초 (4문제)",
  medium_1: "중급 유형1 (3문제)",
  medium_2: "중급 유형2 (2문제)",
  medium_3: "중급 유형3 (2문제)",
  medium_4: "중급 유형4 (2문제)",
};

export default async function DailyTasksCard() {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
          <p className="text-sm text-gray-600">🔐 로그인이 필요합니다</p>
        </div>
      );
    }

    // 현재 학생의 Daily Tests 조회
    const { data: tasks, error } = await supabase
      .from('daily_tests')
      .select('*')
      .eq('student_id', user.id)
      .order('due_date', { ascending: true });

    if (error || !tasks) {
      return (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-700">⚠️ Daily Tests 조회 실패</p>
        </div>
      );
    }

    if (tasks.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
          <p className="text-sm text-gray-600">📚 아직 Daily Test가 없습니다</p>
          <p className="text-xs text-gray-500 mt-1">선생님이 할당하면 여기에 나타납니다</p>
        </div>
      );
    }

    // Tests를 status별로 정렬
    const sorted = [...tasks].sort((a, b) => {
      const statusOrder: Record<TaskStatus, number> = {
        assigned: 0,
        in_progress: 1,
        completed: 2,
        overdue: 3,
      };
      return statusOrder[(a.status as TaskStatus) || 'assigned'] - statusOrder[(b.status as TaskStatus) || 'assigned'];
    });

    return (
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-blue-25 px-4 py-3 border-b">
          <h3 className="text-sm font-semibold text-blue-900">📚 Daily Tests</h3>
          <p className="text-xs text-blue-700 mt-1">{tasks.length}개의 과제</p>
        </div>

        <div className="divide-y">
          {sorted.map((task: any) => {
            const status = (task.status as TaskStatus) || 'assigned';
            const config = STATUS_CONFIG[status];
            const problemCount =
              (task.complete_words_ids?.length ?? 0) +
              (task.daily_life_ids?.length ?? 0) +
              (task.academic_passage_ids?.length ?? 0);

            const dueDate = task.due_date
              ? new Date(task.due_date).toLocaleDateString("ko-KR", {
                  month: "short",
                  day: "numeric",
                })
              : "기한 없음";

            return (
              <Link
                key={task.id}
                href={`/student/daily-tests/${task.id}`}
                className="block p-4 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
                        {config.icon} {config.label}
                      </span>
                      <span className="text-xs text-gray-500">{dueDate}</span>
                    </div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                      {TASK_TYPE_LABEL[task.task_type] || task.task_type}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>📝 {problemCount}문제</span>
                      <span>•</span>
                      <span>{task.difficulty === "easy" ? "쉬움" : task.difficulty === "core" ? "중간" : "어려움"}</span>
                    </div>
                  </div>

                  {status === "assigned" && (
                    <div className="text-right">
                      <span className="px-3 py-1 rounded bg-blue-600 text-white text-xs font-medium">
                        시작 →
                      </span>
                    </div>
                  )}

                  {status === "in_progress" && (
                    <div className="text-right">
                      <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 w-1/2"></div>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">진행 중</p>
                    </div>
                  )}

                  {status === "completed" && (
                    <div className="text-right">
                      <p className="text-xs font-medium text-emerald-600">✓ 완료</p>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  } catch (err) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
        <p className="text-sm text-rose-700">⚠️ 오류 발생</p>
      </div>
    );
  }
}
