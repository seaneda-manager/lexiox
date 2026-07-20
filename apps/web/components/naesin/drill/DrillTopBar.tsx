"use client";

import StageProgressBar from "@/components/naesin/drill/StageProgressBar";
import {
  DRILL_STAGE_LABEL,
  DRILL_STAGE_ORDER,
  type AutosaveStatus,
  type DrillStage,
} from "@/components/naesin/drill/types";

type Props = {
  title: string;
  currentStage: DrillStage;
  autosaveStatus: AutosaveStatus;
  guideOpen?: boolean;
  onPrevStage: () => void;
  onNextStage: () => void;
  onToggleGuide?: () => void;
};

function autosaveLabel(status: AutosaveStatus) {
  switch (status) {
    case "saving":
      return "저장 중...";
    case "saved":
      return "자동저장됨";
    case "error":
      return "저장 오류";
    default:
      return "대기 중";
  }
}

export default function DrillTopBar({
  title,
  currentStage,
  autosaveStatus,
  guideOpen = true,
  onPrevStage,
  onNextStage,
  onToggleGuide,
}: Props) {
  const currentIndex = DRILL_STAGE_ORDER.indexOf(currentStage);

  return (
    <div className="space-y-3 rounded-2xl border bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-[0.18em] text-neutral-400">
            Naesin Drill
          </div>
          <div className="text-xl font-semibold text-neutral-900">{title}</div>
          <div className="text-sm text-neutral-500">
            Stage {currentIndex + 1}/{DRILL_STAGE_ORDER.length} ·{" "}
            {DRILL_STAGE_LABEL[currentStage]}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className={[
              "rounded-full border px-3 py-1 text-xs",
              autosaveStatus === "saved"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : autosaveStatus === "saving"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : autosaveStatus === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-neutral-300 bg-white text-neutral-500",
            ].join(" ")}
          >
            {autosaveLabel(autosaveStatus)}
          </div>

          {onToggleGuide && (
            <button
              type="button"
              onClick={onToggleGuide}
              title={guideOpen ? "가이드 숨기기" : "가이드 보기"}
              className="rounded-xl border px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-50"
            >
              {guideOpen ? "가이드 ✕" : "가이드"}
            </button>
          )}

          <button
            type="button"
            onClick={onPrevStage}
            disabled={currentIndex <= 0}
            className="rounded-xl border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            이전
          </button>

          <button
            type="button"
            onClick={onNextStage}
            disabled={currentIndex >= DRILL_STAGE_ORDER.length - 1}
            className="rounded-xl border bg-neutral-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            다음
          </button>
        </div>
      </div>

      <StageProgressBar currentStage={currentStage} />
    </div>
  );
}
