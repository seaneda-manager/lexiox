'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSpeakingSession } from '../_hooks/useSpeakingSession';

/**
 * Speaking 섹션 완료 페이지
 */
export default function CompletePage() {
  const router = useRouter();
  const { session, resetSession } = useSpeakingSession();

  const handleGoHome = () => {
    resetSession();
    router.push('/home');
  };

  const recordingCount = session?.recordings.size || 0;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">
        {/* 축하 메시지 */}
        <div className="mb-12">
          <div className="text-7xl mb-6">🎉</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Speaking Section Complete!
          </h1>
          <p className="text-xl text-gray-600">
            Thank you for completing all items.
          </p>
        </div>

        {/* 통계 */}
        <div className="bg-gray-50 rounded-lg p-8 mb-12 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Session Summary
          </h2>

          <div className="grid grid-cols-2 gap-6">
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                11
              </div>
              <div className="text-sm text-gray-600">Items Completed</div>
            </div>

            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {recordingCount}
              </div>
              <div className="text-sm text-gray-600">Responses Recorded</div>
            </div>

            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                Task 1 & 2
              </div>
              <div className="text-sm text-gray-600">Both Completed</div>
            </div>

            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <div className="text-3xl font-bold text-orange-600 mb-2">
                Ready
              </div>
              <div className="text-sm text-gray-600">For Review</div>
            </div>
          </div>
        </div>

        {/* 다음 단계 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-12">
          <h3 className="text-lg font-bold text-blue-900 mb-3">
            What's Next?
          </h3>
          <p className="text-blue-800 mb-4">
            Your responses have been recorded and saved. You can now:
          </p>
          <ul className="text-left space-y-2 text-blue-800">
            <li>✓ Review your responses</li>
            <li>✓ View detailed analysis</li>
            <li>✓ Practice specific items</li>
            <li>✓ Track your progress</li>
          </ul>
        </div>

        {/* 버튼 */}
        <div className="space-y-3">
          <Link
            href="/speaking-2026/review"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold text-center transition"
          >
            📊 View Review & Analysis
          </Link>

          <Link
            href="/speaking-2026/drill"
            className="block w-full bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-semibold text-center transition"
          >
            🎮 Practice Drills
          </Link>

          <button
            onClick={handleGoHome}
            className="w-full bg-gray-300 hover:bg-gray-400 text-gray-900 py-3 rounded-lg font-semibold transition"
          >
            🏠 Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}
