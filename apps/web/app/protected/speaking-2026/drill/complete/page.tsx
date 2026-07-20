'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Drill 완료 페이지
 */
export default function DrillCompletePage() {
  const router = useRouter();

  // 더미 통계
  const stats = {
    totalAttempts: 21,
    correct: 18,
    rounds: 3,
    bestStreak: 5,
    successRate: 86,
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">
        {/* 축하 */}
        <div className="mb-12">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Drill Complete!
          </h1>
          <p className="text-gray-600">
            Great job! You've completed the drill session.
          </p>
        </div>

        {/* 통계 */}
        <div className="bg-gray-50 rounded-lg p-8 mb-12 grid grid-cols-2 gap-6 border border-gray-200">
          <div className="bg-white rounded-lg p-4">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {stats.successRate}%
            </div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </div>

          <div className="bg-white rounded-lg p-4">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {stats.correct}/{stats.totalAttempts}
            </div>
            <div className="text-sm text-gray-600">Correct</div>
          </div>

          <div className="bg-white rounded-lg p-4">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              🔥 {stats.bestStreak}
            </div>
            <div className="text-sm text-gray-600">Best Streak</div>
          </div>

          <div className="bg-white rounded-lg p-4">
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {stats.rounds}
            </div>
            <div className="text-sm text-gray-600">Rounds</div>
          </div>
        </div>

        {/* 피드백 */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-12">
          <h3 className="font-bold text-green-900 mb-2">✓ Performance</h3>
          <p className="text-green-800 text-sm">
            Your accuracy improved from 75% (Round 1) to 92% (Round 3). Keep
            practicing to master this task!
          </p>
        </div>

        {/* 행동 버튼 */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/speaking-2026/review')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition"
          >
            📊 Review Your Responses
          </button>

          <button
            onClick={() => router.push('/speaking-2026/drill')}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-bold transition"
          >
            🎮 Another Drill
          </button>

          <button
            onClick={() => router.push('/home')}
            className="w-full bg-gray-300 hover:bg-gray-400 text-gray-900 py-3 rounded-lg font-bold transition"
          >
            🏠 Go to Home
          </button>
        </div>

        {/* 팁 */}
        <div className="mt-12 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800 font-semibold">
            💡 Tip: Practice this drill again tomorrow for spaced repetition!
          </p>
        </div>
      </div>
    </div>
  );
}
