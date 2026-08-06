'use client';

import { useState } from 'react';

type TaskType = 'light' | 'medium_1' | 'medium_2' | 'medium_3' | 'medium_4';
type Difficulty = 'easy' | 'core' | 'hard';

interface DailyTask {
  id: string;
  task_type: TaskType;
  difficulty: Difficulty;
  status: 'assigned' | 'in_progress' | 'completed' | 'overdue';
  student_id?: string;
  class_id?: string;
  created_at: string;
  due_date?: string;
}

interface Stats {
  total: number;
  assigned: number;
  in_progress: number;
  completed: number;
  overdue: number;
}

const TASK_TYPE_LABEL: Record<TaskType, string> = {
  light: '기초 (4문제)',
  medium_1: '중급 유형1 (3문제)',
  medium_2: '중급 유형2 (2문제)',
  medium_3: '중급 유형3 (2문제)',
  medium_4: '중급 유형4 (2문제)',
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: '쉬움',
  core: '중간',
  hard: '어려움',
};

export default function DailyTaskManagerClient({ stats, recentTasks }: { stats: Stats; recentTasks: DailyTask[] }) {
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [formData, setFormData] = useState({
    taskType: 'light' as TaskType,
    difficulty: 'core' as Difficulty,
    assignTo: 'student' as 'student' | 'class',
    studentId: '',
    classId: '',
    dueDate: '',
    numPassages: 2,  // 지문 개수 (default: 2)
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (formData.assignTo === 'student' && !formData.studentId) {
        throw new Error('학생을 선택해주세요');
      }
      if (formData.assignTo === 'class' && !formData.classId) {
        throw new Error('클래스를 선택해주세요');
      }

      const res = await fetch('/api/admin/daily-tests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType: formData.taskType,
          difficulty: formData.difficulty,
          numPassages: formData.numPassages,
          studentId: formData.assignTo === 'student' ? formData.studentId.trim() : undefined,
          classId: formData.assignTo === 'class' ? formData.classId.trim() : undefined,
          dueDate: formData.dueDate || undefined,
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Failed to create task');

      setMessage({ type: 'success', text: `✅ Daily Test가 생성되었습니다 (ID: ${data.payload?.id?.slice(0, 8)}...)` });
      setFormData({
        taskType: 'light',
        difficulty: 'core',
        assignTo: 'student',
        studentId: '',
        classId: '',
        dueDate: '',
      });

      // 페이지 새로고침 (실제로는 리스트를 새로 로드해야 함)
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      setMessage({ type: 'error', text: `❌ ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/daily-tests/${taskId}/delete`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Failed to delete task');

      // 배포 상태에 따라 다른 메시지 표시
      setMessage({
        type: 'success',
        text: data.message || 'Daily Test가 처리되었습니다'
      });
      setDeleteConfirm(null);
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      setMessage({ type: 'error', text: `❌ ${e.message}` });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 탭 */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('create')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'create'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          ➕ 새 과제 생성
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'list'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          📋 최근 과제 ({recentTasks.length})
        </button>
      </div>

      {/* 새 과제 생성 */}
      {activeTab === 'create' && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 과제 유형 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">📝 과제 유형</label>
              <select
                value={formData.taskType}
                onChange={(e) => setFormData({ ...formData, taskType: e.target.value as TaskType })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(TASK_TYPE_LABEL).map(([type, label]) => (
                  <option key={type} value={type}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">문제 수와 조합 유형을 선택합니다</p>
            </div>

            {/* 난이도 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">⭐ 난이도</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(DIFFICULTY_LABEL).map(([diff, label]) => (
                    <option key={diff} value={diff}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 지문 개수 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📄 지문 개수</label>
                <select
                  value={formData.numPassages}
                  onChange={(e) => setFormData({ ...formData, numPassages: parseInt(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1개 (최소)</option>
                  <option value={2}>2개 (기본)</option>
                  <option value={3}>3개</option>
                  <option value={4}>4개</option>
                  <option value={5}>5개 (최대)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">지문당 문제: CW(10) DL(3~4) AP(5)</p>
              </div>
            </div>

            {/* 할당 대상 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🎯 할당 대상</label>
                <select
                  value={formData.assignTo}
                  onChange={(e) => setFormData({ ...formData, assignTo: e.target.value as 'student' | 'class' })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="student">학생 (개인)</option>
                  <option value="class">클래스 (전체)</option>
                </select>
              </div>

              {formData.assignTo === 'student' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">학생 ID</label>
                  <input
                    type="text"
                    placeholder="학생 UUID 입력"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">클래스 ID</label>
                  <input
                    type="text"
                    placeholder="클래스 UUID 입력"
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* 기한 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">📅 기한 (선택사항)</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 메시지 */}
            {message && (
              <div
                className={`rounded-lg p-4 text-sm ${
                  message.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {message.text}
              </div>
            )}

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '생성 중…' : '➕ Daily Test 생성'}
            </button>
          </form>
        </div>
      )}

      {/* 최근 과제 목록 */}
      {activeTab === 'list' && (
        <div className="rounded-lg border bg-white shadow-sm">
          {recentTasks.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-gray-600">아직 생성된 Daily Test가 없습니다</p>
              <p className="text-xs text-gray-500 mt-1">위의 "새 과제 생성" 탭에서 만들어보세요</p>
            </div>
          ) : (
            <div className="divide-y">
              {recentTasks.map((task) => (
                <div key={task.id}>
                  {deleteConfirm === task.id ? (
                    <div className="px-6 py-4 bg-rose-50 border-b">
                      <p className="text-sm font-medium text-gray-900 mb-2">
                        이 Daily Test를 삭제하시겠습니까?
                      </p>
                      <p className="text-xs text-gray-600 mb-3">
                        {task.status === 'assigned'
                          ? '📋 배포 전: 완전히 삭제됩니다'
                          : '⚠️ 배포됨: 기록은 유지되고 보관 처리됩니다'}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(task.id)}
                          disabled={deleting}
                          className="px-3 py-1.5 text-sm bg-rose-600 text-white rounded hover:bg-rose-700 disabled:opacity-50"
                        >
                          {deleting ? '처리 중...' : '삭제'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          disabled={deleting}
                          className="px-3 py-1.5 text-sm bg-gray-200 text-gray-900 rounded hover:bg-gray-300 disabled:opacity-50"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-6 py-4 hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-900">
                              {TASK_TYPE_LABEL[task.task_type]}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                task.status === 'assigned'
                                  ? 'bg-blue-100 text-blue-800'
                                  : task.status === 'in_progress'
                                  ? 'bg-amber-100 text-amber-800'
                                  : task.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {task.status === 'assigned'
                                ? '📋 할당됨'
                                : task.status === 'in_progress'
                                ? '⏳ 진행 중'
                                : task.status === 'completed'
                                ? '✅ 완료'
                                : '⏰ 만료'}
                            </span>
                            <span className="text-xs text-gray-500">
                              난이도: {DIFFICULTY_LABEL[task.difficulty]}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            {task.student_id && <p>학생: {task.student_id.slice(0, 8)}...</p>}
                            {task.class_id && <p>클래스: {task.class_id.slice(0, 8)}...</p>}
                            {task.due_date && (
                              <p>기한: {new Date(task.due_date).toLocaleDateString('ko-KR')}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <p className="text-xs text-gray-500">{new Date(task.created_at).toLocaleDateString('ko-KR')}</p>
                          <button
                            onClick={() => setDeleteConfirm(task.id)}
                            className="px-3 py-1 text-xs bg-rose-100 text-rose-700 rounded hover:bg-rose-200 transition"
                          >
                            🗑 삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 정보 */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-xs text-blue-700">
          💡 <strong>Daily Tests</strong>는 Problem Bank의 문제들을 조합해 만든 일일 학습 과제입니다.
        </p>
        <ul className="text-xs text-blue-600 mt-2 space-y-1 ml-5 list-disc">
          <li>학생별 또는 클래스 전체에 할당 가능</li>
          <li>문제 타입과 난이도를 자유롭게 조합</li>
          <li>학생 홈 화면의 사이드바에 표시됨</li>
          <li>Progress tracking과 자동 채점 지원</li>
        </ul>
      </div>
    </div>
  );
}
