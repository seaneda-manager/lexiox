'use client';

import { MIDDLE_DRILL_STAGES, MIDDLE_DRILL_STAGE_LABEL, type MiddleDrillStageId } from '@/models/middle-naesin/drill';

type Props = {
  title: string;
  currentStage: MiddleDrillStageId;
  readAloudEnabled: boolean;
  onToggleReadAloud: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export default function MiddleDrillTopBar({
  title,
  currentStage,
  readAloudEnabled,
  onToggleReadAloud,
  onPrev,
  onNext,
}: Props) {
  const visibleStages = MIDDLE_DRILL_STAGES.filter(
    (s) => !s.optional || readAloudEnabled,
  );
  const currentIndex = visibleStages.findIndex((s) => s.id === currentStage);
  const total = visibleStages.length;

  return (
    <div className="space-y-3 rounded-2xl border bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-[0.18em] text-neutral-400">
            Middle Naesin Drill
          </div>
          <div className="text-xl font-semibold text-neutral-900">{title}</div>
          <div className="text-sm text-neutral-500">
            Stage {currentIndex + 1}/{total} · {MIDDLE_DRILL_STAGE_LABEL[currentStage]}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 소리내어 읽기 toggle */}
          <button
            type="button"
            onClick={onToggleReadAloud}
            className={[
              'rounded-full border px-3 py-1 text-xs font-medium transition',
              readAloudEnabled
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-neutral-200 text-neutral-400 hover:bg-neutral-50',
            ].join(' ')}
          >
            소리내어 읽기 {readAloudEnabled ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={onPrev}
            disabled={currentIndex <= 0}
            className="rounded-xl border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            이전
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={currentIndex >= total - 1}
            className="rounded-xl border bg-neutral-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            다음
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1">
        {visibleStages.map((s, i) => (
          <div
            key={s.id}
            className={[
              'h-1.5 flex-1 rounded-full transition-colors',
              i < currentIndex
                ? 'bg-emerald-400'
                : i === currentIndex
                ? 'bg-emerald-600'
                : 'bg-neutral-100',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}
