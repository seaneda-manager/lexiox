"use client";

import Link from "next/link";

interface VocabTestCardProps {
  dayNumber: number;
  trackId: string;
  isActive: boolean;
  testScore?: number;
  testDate?: string;
}

export function VocabTestCard({
  dayNumber,
  trackId,
  isActive,
  testScore,
  testDate,
}: VocabTestCardProps) {
  const isTaken = testScore !== undefined;

  return (
    <div
      className={`rounded-2xl border p-6 space-y-4 transition ${
        isTaken
          ? "from-green-50 to-green-100 border-green-200"
          : isActive
            ? "from-red-50 to-red-100 border-red-200"
            : "from-gray-50 to-gray-100 border-gray-200 opacity-50"
      } bg-gradient-to-br`}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">단어 시험</h3>
          <p className="text-sm text-gray-600">Day {dayNumber}</p>
        </div>
        <div className="text-3xl">📝</div>
      </div>

      {/* 상태 표시 */}
      {isTaken ? (
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{testScore}점</p>
            <p className="text-xs text-gray-600 mt-1">{testDate}</p>
          </div>
          <span className="inline-flex w-full items-center justify-center gap-1 text-sm font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">
            ✓ 시험 완료
          </span>

          {/* 깜지 버튼 */}
          <Link
            href={`/vocab/session?set_id=${trackId}&day=${dayNumber}&mode=memorize`}
            className="block w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-2 rounded-lg text-center transition"
          >
            🧠 깜지 복습 →
          </Link>
        </div>
      ) : isActive ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            📚 두 단계 숙제를 모두 완료하면 시험을 볼 수 있습니다
          </p>
          <span className="inline-flex w-full items-center justify-center gap-1 text-sm font-semibold text-red-700 bg-red-100 px-2 py-1 rounded-full">
            ○ 준비 완료
          </span>

          {/* 시험 보기 버튼 */}
          <Link
            href={`/vocab/test?track_id=${trackId}&day=${dayNumber}`}
            className="block w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-2 rounded-lg text-center transition"
          >
            시험 보기 →
          </Link>

          {/* 틀린 것만 보기 옵션 */}
          <Link
            href={`/vocab/test?track_id=${trackId}&day=${dayNumber}&wrong_only=true`}
            className="block w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-2 rounded-lg text-center transition text-sm"
          >
            틀린 것만 풀이 →
          </Link>
        </div>
      ) : (
        <div>
          <span className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
            ◌ 대기 중
          </span>
          <p className="text-xs text-gray-600 mt-2">
            숙제 완료 후 시험을 볼 수 있습니다
          </p>
        </div>
      )}
    </div>
  );
}
