"use client";

import {
  DRILL_STAGE_LABEL,
  DRILL_STAGE_ORDER,
  type DrillStage,
} from "@/components/naesin/drill/types";

type Props = {
  currentStage: DrillStage;
};

export default function StageProgressBar({ currentStage }: Props) {
  const currentIndex = DRILL_STAGE_ORDER.indexOf(currentStage);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {DRILL_STAGE_ORDER.map((stage, idx) => {
        const isCurrent = stage === currentStage;
        const isDone = idx < currentIndex;

        return (
          <div key={stage} className="flex items-center gap-2">
            <div
              className={[
                "rounded-full border px-3 py-1 text-xs",
                isCurrent
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : isDone
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-neutral-300 bg-white text-neutral-500",
              ].join(" ")}
            >
              {idx + 1}. {DRILL_STAGE_LABEL[stage]}
            </div>

            {idx < DRILL_STAGE_ORDER.length - 1 ? (
              <div className="h-px w-3 bg-neutral-300" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
