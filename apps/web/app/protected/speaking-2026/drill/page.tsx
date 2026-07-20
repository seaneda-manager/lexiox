'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Drill 모듈 메인 페이지
 * - 취약점 기반 아이템 선택
 * - 반복 훈련 설정
 */
export default function DrillPage() {
  const router = useRouter();
  const [selectedTask, setSelectedTask] = useState<1 | 2 | null>(null);
  const [repeatCount, setRepeatCount] = useState(5);
  const [filterByError, setFilterByError] = useState(false);

  const handleStartDrill = () => {
    if (!selectedTask) return;
    // TODO: 실제로는 선택한 설정으로 드릴 세션 시작
    router.push('/speaking-2026/drill/practice');
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-3xl mx-auto">
        {/* 헤더 */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Drill</h1>
          <p className="text-gray-600">
            Focus on specific tasks and practice repeatedly to improve weak areas.
          </p>
        </div>

        {/* 설정 */}
        <div className="bg-gray-50 rounded-lg p-8 space-y-8">
          {/* Task 선택 */}
          <div>
            <label className="block text-lg font-bold text-gray-900 mb-4">
              Select Task
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setSelectedTask(1)}
                className={`p-6 rounded-lg border-2 transition ${
                  selectedTask === 1
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <div className="text-2xl mb-2">🔁</div>
                <div className="font-bold text-gray-900">Task 1</div>
                <div className="text-sm text-gray-600">Listen & Repeat (7 items)</div>
              </button>

              <button
                onClick={() => setSelectedTask(2)}
                className={`p-6 rounded-lg border-2 transition ${
                  selectedTask === 2
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <div className="text-2xl mb-2">🎤</div>
                <div className="font-bold text-gray-900">Task 2</div>
                <div className="text-sm text-gray-600">Interview (4 items)</div>
              </button>
            </div>
          </div>

          {/* 반복 횟수 */}
          <div>
            <label className="block text-lg font-bold text-gray-900 mb-4">
              Repeat Count
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="20"
                value={repeatCount}
                onChange={(e) => setRepeatCount(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-2xl font-bold text-blue-600 min-w-fit">
                {repeatCount}x
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Total items to practice: {selectedTask === 1 ? 7 : 4} ×{' '}
              {repeatCount} = {(selectedTask === 1 ? 7 : 4) * repeatCount}
            </p>
          </div>

          {/* 필터 옵션 */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filterByError}
                onChange={(e) => setFilterByError(e.target.checked)}
                className="w-5 h-5"
              />
              <span className="text-gray-900 font-semibold">
                Show only items with errors
              </span>
            </label>
            <p className="text-sm text-gray-600 mt-2">
              {filterByError
                ? 'Practice only items where you made mistakes.'
                : 'Practice all items regardless of previous performance.'}
            </p>
          </div>

          {/* 통계 */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-3">Your Stats</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">7/7</div>
                <div className="text-xs text-gray-600">Task 1 Done</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">4/4</div>
                <div className="text-xs text-gray-600">Task 2 Done</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">3</div>
                <div className="text-xs text-gray-600">Total Errors</div>
              </div>
            </div>
          </div>

          {/* Start 버튼 */}
          <button
            onClick={handleStartDrill}
            disabled={!selectedTask}
            className={`w-full py-4 rounded-lg font-bold text-lg transition ${
              selectedTask
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-600 cursor-not-allowed'
            }`}
          >
            🎮 Start Drill
          </button>
        </div>

        {/* 안내 */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="font-bold text-blue-900 mb-3">💡 Tips</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>
              • Focus on one task at a time for better results
            </li>
            <li>
              • Repeat count determines how many times you'll see each item
            </li>
            <li>
              • Use error filter to target weak areas
            </li>
            <li>
              • Review your performance after each drill session
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
