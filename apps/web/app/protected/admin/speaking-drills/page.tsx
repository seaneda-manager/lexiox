'use client';

import Link from 'next/link';

export default function AdminSpeakingDrillsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎮 Speaking 훈련 Hub 관리
          </h1>
          <p className="text-gray-600">
            2026 TOEFL Speaking 드릴 및 게임의 콘텐츠, 사용 현황, 학생 데이터를 관리합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* 현황 카드 */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-400">
            <h3 className="font-bold text-blue-600 mb-2">📊 사용 현황</h3>
            <div className="text-3xl font-bold text-blue-700 mb-2">-</div>
            <p className="text-sm text-gray-600">활성 사용자 수</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-400">
            <h3 className="font-bold text-green-600 mb-2">✅ 완료율</h3>
            <div className="text-3xl font-bold text-green-700 mb-2">-</div>
            <p className="text-sm text-gray-600">전체 드릴 완료율</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-400">
            <h3 className="font-bold text-orange-600 mb-2">⭐ 평균 점수</h3>
            <div className="text-3xl font-bold text-orange-700 mb-2">-</div>
            <p className="text-sm text-gray-600">전체 평균 스코어</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 콘텐츠 관리 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-blue-600 mb-4">📝 콘텐츠 관리</h2>
            <ul className="space-y-3">
              <li>
                <button
                  disabled
                  className="text-gray-400 font-semibold cursor-not-allowed"
                >
                  → 드릴 질문 관리 (Coming Soon)
                </button>
                <p className="text-xs text-gray-500 mt-1">드릴의 질문 추가/수정/삭제</p>
              </li>
              <li>
                <button
                  disabled
                  className="text-gray-400 font-semibold cursor-not-allowed"
                >
                  → Game 1 단어 관리 (Coming Soon)
                </button>
                <p className="text-xs text-gray-500 mt-1">Stress Hunt 단어 목록</p>
              </li>
              <li>
                <button
                  disabled
                  className="text-gray-400 font-semibold cursor-not-allowed"
                >
                  → 음성 파일 관리 (Coming Soon)
                </button>
              </li>
            </ul>
          </div>

          {/* 학생 데이터 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-green-600 mb-4">📊 학생 데이터</h2>
            <ul className="space-y-3">
              <li>
                <button
                  disabled
                  className="text-gray-400 font-semibold cursor-not-allowed"
                >
                  → 학생 성과 분석 (Coming Soon)
                </button>
                <p className="text-xs text-gray-500 mt-1">개별 학생의 드릴 결과</p>
              </li>
              <li>
                <button
                  disabled
                  className="text-gray-400 font-semibold cursor-not-allowed"
                >
                  → 음성 메트릭 분석 (Coming Soon)
                </button>
                <p className="text-xs text-gray-500 mt-1">WPM, Pause, Fluency 통계</p>
              </li>
              <li>
                <button
                  disabled
                  className="text-gray-400 font-semibold cursor-not-allowed"
                >
                  → 개인맞춤 추천 (Coming Soon)
                </button>
              </li>
            </ul>
          </div>

          {/* 시스템 설정 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-purple-600 mb-4">⚙️ 시스템 설정</h2>
            <ul className="space-y-3">
              <li>
                <button
                  disabled
                  className="text-gray-400 font-semibold cursor-not-allowed"
                >
                  → 기본 설정 (Coming Soon)
                </button>
                <p className="text-xs text-gray-500 mt-1">점수 기준, 타이머 설정</p>
              </li>
              <li>
                <button
                  disabled
                  className="text-gray-400 font-semibold cursor-not-allowed"
                >
                  → 피드백 템플릿 (Coming Soon)
                </button>
                <p className="text-xs text-gray-500 mt-1">AI 자동 피드백 설정</p>
              </li>
            </ul>
          </div>

          {/* 미리보기 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-pink-600 mb-4">👀 미리보기</h2>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/speaking-2026/drills"
                  className="text-pink-600 hover:text-pink-800 font-semibold"
                >
                  → 드릴 다시보기
                </Link>
                <p className="text-xs text-gray-500 mt-1">학생 경험 확인</p>
              </li>
              <li>
                <Link
                  href="/speaking-2026/games/stress-hunt"
                  className="text-pink-600 hover:text-pink-800 font-semibold"
                >
                  → Game 1 미리보기
                </Link>
                <p className="text-xs text-gray-500 mt-1">Stress Hunt 게임</p>
              </li>
            </ul>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-3">ℹ️ 시스템 현황</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-blue-800">
            <div>
              <span className="font-semibold">✅ Live</span>
              <p className="text-xs">Drill 3,4 + Game 1</p>
            </div>
            <div>
              <span className="font-semibold">🔲 Coming</span>
              <p className="text-xs">Drill 1,2,5</p>
            </div>
            <div>
              <span className="font-semibold">🔲 Coming</span>
              <p className="text-xs">Game 2,3,4</p>
            </div>
            <div>
              <span className="font-semibold">📊 DB</span>
              <p className="text-xs">Supabase 연동</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
