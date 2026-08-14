"use client";

import Link from "next/link";

interface VocabHomeworkCardProps {
  stage: 1 | 2;
  dayNumber: number;
  trackId: string;
  progress: number; // 0~100
  isActive: boolean;
  isComplete: boolean;
}

export function VocabHomeworkCard({
  stage,
  dayNumber,
  trackId,
  progress,
  isActive,
  isComplete,
}: VocabHomeworkCardProps) {
  const stageInfo = {
    1: {
      title: "단어 숙제 1",
      desc: "PreScreen ~ Speed",
      icon: "📖",
      color: "from-blue-50 to-blue-100 border-blue-200",
      button: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
    },
    2: {
      title: "단어 숙제 2",
      desc: "Stage 2 ~ 깜지",
      icon: "📚",
      color: "from-purple-50 to-purple-100 border-purple-200",
      button: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
    },
  };

  const info = stageInfo[stage];

  return (
    <div
      className={`rounded-2xl border p-6 space-y-4 transition ${info.color} ${
        !isActive && !isComplete ? "opacity-50" : ""
      }`}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{info.title}</h3>
          <p className="text-sm text-gray-600">Day {dayNumber}</p>
        </div>
        <div className="text-3xl">{info.icon}</div>
      </div>

      {/* 진행도 */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-medium text-gray-700">
          <span>{info.desc}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 bg-white rounded-full overflow-hidden border">
          <div
            className={`h-full ${
              stage === 1
                ? "bg-gradient-to-r from-blue-400 to-blue-500"
                : "bg-gradient-to-r from-purple-400 to-purple-500"
            } transition-all`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 상태 배지 */}
      <div className="flex items-center gap-2">
        {isComplete ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">
            ✓ 완료
          </span>
        ) : isActive ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
            ○ 진행 중
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
            ◌ 대기 중
          </span>
        )}
      </div>

      {/* 버튼 */}
      {isActive && !isComplete && (
        <Link
          href={`/vocab/session?set_id=${trackId}&stage=${stage}`}
          className={`block w-full ${info.button} text-white font-semibold py-2 rounded-lg text-center transition`}
        >
          학습하기 →
        </Link>
      )}

      {isComplete && (
        <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 text-center font-medium">
          ✓ 이 단계를 완료했습니다
        </div>
      )}

      {!isActive && !isComplete && (
        <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 text-center font-medium">
          ◌ 이전 단계 완료 후 시작
        </div>
      )}
    </div>
  );
}
