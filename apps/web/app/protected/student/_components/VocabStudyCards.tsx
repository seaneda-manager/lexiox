"use client";

import { VocabHomeworkCard } from "./VocabHomeworkCard";
import { VocabTestCard } from "./VocabTestCard";

interface VocabStudyCardsProps {
  dayNumber: number;
  trackId: string;
  stage1Progress: number; // 0~100
  stage1Complete: boolean;
  stage2Progress: number; // 0~100
  stage2Complete: boolean;
  testScore?: number;
  testDate?: string;
}

export function VocabStudyCards({
  dayNumber,
  trackId,
  stage1Progress,
  stage1Complete,
  stage2Progress,
  stage2Complete,
  testScore,
  testDate,
}: VocabStudyCardsProps) {
  // Stage 2는 Stage 1이 완료되어야 활성화
  const stage2Active = stage1Complete;

  // 시험은 두 단계 모두 완료되어야 활성화
  const testActive = stage1Complete && stage2Complete;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 숙제 1 */}
        <VocabHomeworkCard
          stage={1}
          dayNumber={dayNumber}
          trackId={trackId}
          progress={stage1Progress}
          isActive={true}
          isComplete={stage1Complete}
        />

        {/* 숙제 2 */}
        <VocabHomeworkCard
          stage={2}
          dayNumber={dayNumber}
          trackId={trackId}
          progress={stage2Progress}
          isActive={stage2Active}
          isComplete={stage2Complete}
        />
      </div>

      {/* 시험 */}
      <VocabTestCard
        dayNumber={dayNumber}
        trackId={trackId}
        isActive={testActive}
        testScore={testScore}
        testDate={testDate}
      />
    </div>
  );
}
