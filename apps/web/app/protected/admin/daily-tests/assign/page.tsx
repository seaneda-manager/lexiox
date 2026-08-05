'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

type TaskType = 'light' | 'medium_1' | 'medium_2' | 'medium_3' | 'medium_4';
type Difficulty = 'easy' | 'core' | 'hard';

export default function AssignDailyTestsPage() {
  const [taskType, setTaskType] = useState<TaskType>('light');
  const [difficulty, setDifficulty] = useState<Difficulty>('core');
  const [studentName, setStudentName] = useState('');
  const [className, setClassName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/daily-tests/generate-by-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType,
          difficulty,
          studentName: studentName || undefined,
          className: className || undefined,
          dueDate: dueDate || undefined,
        }),
      });

      const result = await response.json();

      if (result.ok) {
        setMessage({
          type: 'success',
          text: result.message || 'Daily Test assigned successfully!',
        });
        setStudentName('');
        setClassName('');
        setDueDate('');
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to assign Daily Test',
        });
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.message || 'An error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  const TASK_TYPES: Record<TaskType, string> = {
    light: '기초 (4문제)',
    medium_1: '중급 유형1 (3문제)',
    medium_2: '중급 유형2 (2문제)',
    medium_3: '중급 유형3 (2문제)',
    medium_4: '중급 유형4 (2문제)',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <Link
            href="/admin/daily-tests"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
            돌아가기
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Daily Tests 할당</h1>
          <p className="text-gray-600">학생 또는 클래스에 Daily Tests를 할당합니다.</p>
        </div>

        {/* 메시지 */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          {/* 문제 유형 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              문제 유형 *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(TASK_TYPES) as [TaskType, string][]).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTaskType(type)}
                  className={`p-3 rounded-lg border-2 text-left transition ${
                    taskType === type
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                  }`}
                >
                  <div className="font-medium text-sm">{label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 난이도 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              난이도 *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['easy', 'core', 'hard'] as Difficulty[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={`p-3 rounded-lg border-2 text-center transition ${
                    difficulty === level
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                  }`}
                >
                  <div className="font-medium text-sm">
                    {level === 'easy' && '쉬움'}
                    {level === 'core' && '보통'}
                    {level === 'hard' && '어려움'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 학생/클래스 선택 */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="studentName" className="block text-sm font-semibold text-gray-700 mb-2">
                학생 이름
              </label>
              <input
                id="studentName"
                type="text"
                placeholder="예: 김철수"
                value={studentName}
                onChange={(e) => {
                  setStudentName(e.target.value);
                  if (className) setClassName('');
                }}
                disabled={!!className}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">학생 이름의 일부만 입력해도 검색됩니다</p>
            </div>

            <div>
              <label htmlFor="className" className="block text-sm font-semibold text-gray-700 mb-2">
                또는 클래스 이름
              </label>
              <input
                id="className"
                type="text"
                placeholder="예: 1반"
                value={className}
                onChange={(e) => {
                  setClassName(e.target.value);
                  if (studentName) setStudentName('');
                }}
                disabled={!!studentName}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">클래스 이름의 일부만 입력해도 검색됩니다</p>
            </div>
          </div>

          {/* 마감 기한 */}
          <div>
            <label htmlFor="dueDate" className="block text-sm font-semibold text-gray-700 mb-2">
              마감 기한 (선택)
            </label>
            <input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 제출 버튼 */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || (!studentName && !className)}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {loading ? '처리 중...' : 'Daily Test 할당'}
            </button>
            <Link
              href="/admin/daily-tests"
              className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
            >
              취소
            </Link>
          </div>
        </form>

        {/* 도움말 */}
        <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">💡 사용 방법</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 학생 이름 또는 클래스 이름 중 하나를 입력합니다</li>
            <li>• 정확한 이름이 아니어도 부분 검색됩니다</li>
            <li>• 여러 명이 검색되면 정확한 이름을 입력해주세요</li>
            <li>• 마감 기한은 선택사항입니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
