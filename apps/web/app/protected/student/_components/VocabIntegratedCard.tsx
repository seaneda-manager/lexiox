"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface VocabIntegratedCardProps {
  trackId: string;
  dayNumber: number;
  studentId: string;
  academyStudentId: string;
  vocabTodayCount?: number;
  vocaPlanCount?: number;
}

interface LearningStatus {
  prescreen_done: boolean;
  learning_stage_done: boolean;
  speed_done: boolean;
  memorization_done: boolean;
  can_take_test: boolean;
}

export function VocabIntegratedCard({
  trackId,
  dayNumber,
  studentId,
  academyStudentId,
  vocabTodayCount = 0,
  vocaPlanCount = 0,
}: VocabIntegratedCardProps) {
  const [learningStatus, setLearningStatus] = useState<LearningStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 학습 완료 상태 확인 로직
    // TODO: API 호출로 학습 상태 확인
    setLearningStatus({
      prescreen_done: true,
      learning_stage_done: true,
      speed_done: true,
      memorization_done: true,
      can_take_test: true,
    });
    setLoading(false);
  }, [trackId, dayNumber, studentId]);

  const completionSteps = [
    { label: "PreScreen", done: learningStatus?.prescreen_done ?? false },
    { label: "학습", done: learningStatus?.learning_stage_done ?? false },
    { label: "Speed", done: learningStatus?.speed_done ?? false },
    { label: "깜지", done: learningStatus?.memorization_done ?? false },
  ];

  const completedCount = completionSteps.filter((s) => s.done).length;
  const completionPercent = (completedCount / completionSteps.length) * 100;

  return (
    <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6 space-y-4">
      {/* 제목 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-blue-900">단어 학습</h3>
          <p className="text-sm text-blue-700">Day {dayNumber}</p>
        </div>
        <div className="text-3xl">📚</div>
      </div>

      {/* 진행도 */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-medium text-blue-800">
          <span>학습 완료도</span>
          <span>{Math.round(completionPercent)}%</span>
        </div>
        <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {/* 단계별 진행 상황 */}
      <div className="grid grid-cols-4 gap-2">
        {completionSteps.map((step) => (
          <div key={step.label} className="text-center">
            <div
              className={`h-8 rounded-lg flex items-center justify-center text-xs font-bold mb-1 transition ${
                step.done
                  ? "bg-green-500 text-white"
                  : "bg-blue-200 text-blue-800"
              }`}
            >
              {step.done ? "✓" : "○"}
            </div>
            <p className="text-xs text-blue-800">{step.label}</p>
          </div>
        ))}
      </div>

      {/* 액션 버튼 */}
      <div className="pt-2 space-y-2">
        {!learningStatus?.can_take_test ? (
          <div className="p-3 bg-amber-100 border border-amber-300 rounded-lg text-sm text-amber-900">
            ⚠️ 학습을 먼저 완료해주세요
          </div>
        ) : (
          <>
            {/* 시험 보기 버튼 */}
            <Link
              href={`/vocab/test?track_id=${trackId}&day=${dayNumber}`}
              className="block w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2 rounded-lg text-center transition"
            >
              📝 시험 보기
            </Link>

            {/* 깜지 카드 */}
            <Link
              href={`/vocab/session?set_id=${trackId}&day=${dayNumber}&mode=memorize`}
              className="block w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-2 rounded-lg text-center transition"
            >
              🧠 깜지 카드
            </Link>
          </>
        )}
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-300">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{vocabTodayCount}</p>
          <p className="text-xs text-blue-700">오늘 단어</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{vocaPlanCount}</p>
          <p className="text-xs text-blue-700">전체 계획</p>
        </div>
      </div>
    </div>
  );
}
