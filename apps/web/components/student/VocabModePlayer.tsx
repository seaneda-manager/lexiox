"use client";

import { useState, useEffect } from "react";
import type {
  VocabLearningSession,
  VocabLearningMode,
  VocabWord,
} from "@/lib/types/vocab-learning-mode";
import {
  MODE_LABELS,
  MODE_DESCRIPTIONS,
} from "@/lib/types/vocab-learning-mode";
import {
  isModeComplete,
  calculateModeScore,
  canTransitionToNextMode,
  calculateTotalScore,
  getProgressPercentage,
} from "@/lib/utils/vocab-mode-transition";

interface VocabModePlayerProps {
  dayId: string;
  trackId: string;
  assignmentId: string;
  words: VocabWord[];
  onDayComplete?: (session: VocabLearningSession) => void;
}

export default function VocabModePlayer({
  dayId,
  trackId,
  assignmentId,
  words,
  onDayComplete,
}: VocabModePlayerProps) {
  const [session, setSession] = useState<VocabLearningSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 초기화
  useEffect(() => {
    const initSession: VocabLearningSession = {
      sessionId: `vocab-${Date.now()}`,
      studentId: "", // 서버에서 설정됨
      dayId,
      trackId,
      assignmentId,
      currentMode: 1,
      allWords: words,
      startedAt: new Date().toISOString(),
      totalScore: 0,
      timeSpentSeconds: 0,
    };
    setSession(initSession);
  }, [dayId, words, trackId, assignmentId]);

  // Mode 전환
  const handleModeComplete = async () => {
    if (!session) return;

    setLoading(true);
    setError(null);

    try {
      const transition = canTransitionToNextMode(session.currentMode, session);

      if (!transition.ok || !transition.nextMode) {
        setError(transition.message || "Mode 전환에 실패했습니다");
        if (!transition.nextMode && transition.canAdvance) {
          // 모든 Mode 완료
          if (onDayComplete) {
            onDayComplete(session);
          }
        }
        return;
      }

      // 다음 Mode로 전환
      setSession((prev) =>
        prev
          ? {
              ...prev,
              currentMode: transition.nextMode!,
            }
          : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return <div className="text-center p-4">로딩 중...</div>;
  }

  const progress = getProgressPercentage(session);
  const totalScore = calculateTotalScore(session);
  const currentModeScore = calculateModeScore(session.currentMode, session);
  const isCurrentModeComplete = isModeComplete(session.currentMode, session);

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-3xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Vocab Learning Day
          </h1>
          <p className="text-gray-600 mt-2">
            {words.length}개 단어 · Total Score: {totalScore}/100
          </p>
        </div>

        {/* Mode 진행 표시 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-4 gap-4">
            {([1, 2, 3, 4] as VocabLearningMode[]).map((mode) => (
              <div
                key={mode}
                className={`p-3 rounded-lg text-center ${
                  session.currentMode === mode
                    ? "bg-blue-600 text-white scale-105"
                    : progress[mode] === 100
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                }`}
              >
                <div className="font-bold text-sm">Mode {mode}</div>
                <div className="text-xs mt-1">
                  {progress[mode] === 100 ? "✓" : "○"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 현재 Mode */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {MODE_LABELS[session.currentMode]}
            </h2>
            <p className="text-gray-600 mt-2">
              {MODE_DESCRIPTIONS[session.currentMode]}
            </p>
          </div>

          {/* Mode별 UI 플레이스홀더 */}
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            {session.currentMode === 1 && (
              <div>
                <p className="text-gray-600 mb-4">
                  다음 {words.length}개 단어를 검토하세요.
                </p>
                <p className="text-sm text-gray-500">
                  Mode 1 UI 구현 예정
                </p>
              </div>
            )}
            {session.currentMode === 2 && (
              <div>
                <p className="text-gray-600 mb-4">철자와 뜻을 입력하세요.</p>
                <p className="text-sm text-gray-500">
                  Mode 2 UI 구현 예정
                </p>
              </div>
            )}
            {session.currentMode === 3 && (
              <div>
                <p className="text-gray-600 mb-4">동의어를 포함해 입력하세요.</p>
                <p className="text-sm text-gray-500">
                  Mode 3 UI 구현 예정
                </p>
              </div>
            )}
            {session.currentMode === 4 && (
              <div>
                <p className="text-gray-600 mb-4">영영뜻과 예문을 작성하세요.</p>
                <p className="text-sm text-gray-500">
                  Mode 4 UI 구현 예정
                </p>
              </div>
            )}
          </div>

          {/* Mode 점수 및 완료 상태 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Mode {session.currentMode} 점수</p>
                <p className="text-2xl font-bold text-blue-600">
                  {currentModeScore}/100
                </p>
              </div>
              <div>
                {isCurrentModeComplete ? (
                  <span className="text-green-600 font-bold">✓ 완료</span>
                ) : (
                  <span className="text-orange-600 font-bold">진행 중</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
            {error}
          </div>
        )}

        {/* 버튼 */}
        <div className="flex gap-4">
          <button
            onClick={handleModeComplete}
            disabled={loading || !isCurrentModeComplete}
            className={`flex-1 py-3 rounded-lg font-bold transition ${
              isCurrentModeComplete
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {loading ? "처리 중..." : "다음 단계"}
          </button>
          <button className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
            일시중지
          </button>
        </div>
      </div>
    </div>
  );
}
