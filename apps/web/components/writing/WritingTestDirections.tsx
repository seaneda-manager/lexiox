'use client';

import type { WWritingTest2026 } from '@/models/writing';

interface WritingTestDirectionsProps {
  test: WWritingTest2026;
  mode: 'study' | 'test';
  onStart?: () => void;
}

export default function WritingTestDirections({
  test,
  mode,
  onStart,
}: WritingTestDirectionsProps) {
  if (mode === 'study') return null; // Study 모드에서는 지시사항 표시 안 함

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Writing Test</h1>
        <p className="text-lg text-gray-600">{test.meta.label ?? 'Writing Practice Test'}</p>
      </div>

      {/* 지시사항 카드 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">📋 Test Instructions</h2>
          <p className="text-sm text-gray-600">Read these instructions carefully before starting the test.</p>
        </div>

        <div className="border-t pt-4 space-y-4">
          {/* Task 1 */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold">1</span>
              <span className="font-semibold text-gray-900">Build a Sentence (6 minutes)</span>
            </div>
            <p className="text-sm text-gray-600 ml-8">
              Arrange word chunks to complete sentences. You cannot go back to this task once you move forward.
            </p>
          </div>

          {/* Task 2 */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">2</span>
              <span className="font-semibold text-gray-900">Write an Email (7 minutes)</span>
            </div>
            <p className="text-sm text-gray-600 ml-8">
              Write a formal email based on the given situation. Time expires automatically when 7 minutes are up.
            </p>
          </div>

          {/* Task 3 */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold">3</span>
              <span className="font-semibold text-gray-900">Academic Discussion (10 minutes)</span>
            </div>
            <p className="text-sm text-gray-600 ml-8">
              Respond to a discussion prompt. You can finish early by clicking Finish Test, or the timer will end the test automatically.
            </p>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
            <p className="text-sm font-semibold text-amber-900">⚠️ Important</p>
            <ul className="text-xs text-amber-800 space-y-1 ml-4 list-disc">
              <li>Total time: 23 minutes</li>
              <li>You cannot go back to previous tasks</li>
              <li>Spelling and grammar checkers are disabled</li>
              <li>Copy and paste from external sources is not allowed</li>
              <li>If you leave the test, all data will be lost and you must start over</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 시작 버튼 */}
      <div className="flex gap-3 justify-center">
        <button
          onClick={onStart}
          className="px-8 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition"
        >
          Start Test
        </button>
      </div>

      {/* 하단 안내 */}
      <div className="text-center text-xs text-gray-500">
        <p>Click "Start Test" when you are ready. The timer will begin counting down immediately.</p>
      </div>
    </div>
  );
}
