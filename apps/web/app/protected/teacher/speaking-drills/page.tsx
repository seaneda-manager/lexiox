'use client';

import Link from 'next/link';

export default function TeacherSpeakingDrillsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎮 Speaking 훈련 관리
          </h1>
          <p className="text-gray-600">
            학생들의 Speaking 드릴 진행 현황을 확인하고 관리합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 학생 진행률 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-amber-600 mb-4">📊 학생 진행률</h2>
            <p className="text-gray-600 mb-4">
              클래스의 모든 학생이 완료한 드릴과 게임 현황을 확인합니다.
            </p>
            <button
              disabled
              className="inline-block bg-gray-300 text-gray-600 font-bold py-2 px-4 rounded cursor-not-allowed"
            >
              학생 현황 보기 (Coming Soon)
            </button>
          </div>

          {/* 드릴 할당 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-orange-600 mb-4">📌 드릴 할당</h2>
            <p className="text-gray-600 mb-4">
              특정 학생이나 클래스에 드릴과 게임을 할당합니다.
            </p>
            <button
              disabled
              className="inline-block bg-gray-300 text-gray-600 font-bold py-2 px-4 rounded cursor-not-allowed"
            >
              드릴 할당 (Coming Soon)
            </button>
          </div>

          {/* 성과 분석 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-rose-600 mb-4">📈 성과 분석</h2>
            <p className="text-gray-600 mb-4">
              WPM, Pause, Fluency 등의 메트릭으로 학생의 진전을 추적합니다.
            </p>
            <button
              disabled
              className="inline-block bg-gray-300 text-gray-600 font-bold py-2 px-4 rounded cursor-not-allowed"
            >
              분석 (Coming Soon)
            </button>
          </div>

          {/* 드릴 미리보기 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-pink-600 mb-4">👀 드릴 미리보기</h2>
            <p className="text-gray-600 mb-4">
              학생들이 하게 될 드릴을 직접 경험해봅니다.
            </p>
            <Link
              href="/speaking-2026/drills"
              className="inline-block bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-4 rounded transition-all"
            >
              드릴 미리보기 →
            </Link>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h3 className="font-bold text-amber-900 mb-2">ℹ️ 드릴 종류</h3>
          <ul className="text-sm text-amber-800 space-y-1">
            <li>✅ <strong>Drill 3:</strong> 10-Second Brainstorming (즉시 응답)</li>
            <li>✅ <strong>Drill 4:</strong> Fluency Marathon (유창성)</li>
            <li>✅ <strong>Game 1:</strong> Stress Hunt (발음)</li>
            <li>🔲 Drill 1,2,5 및 Game 2,3,4: 곧 업데이트됩니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
