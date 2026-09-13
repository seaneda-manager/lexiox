// apps/web/components/typing/TypingStatsBar.tsx
'use client';

import type { TypingMetrics } from '@/lib/typing/types';

type Props = {
  metrics: TypingMetrics;
  strict: boolean;
  onToggleStrict: () => void;
  progress: { current: number; total: number };
};

export default function TypingStatsBar({ metrics, strict, onToggleStrict, progress }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <Stat label="WPM" value={metrics.wpm} accent="text-orange-600" />
      <Stat label="정확도" value={`${metrics.accuracy}%`} accent="text-emerald-600" />
      <Stat label="오타" value={metrics.errorCount} accent="text-red-600" />
      <Stat label="진행" value={`${progress.current}/${progress.total}`} accent="text-gray-700" />
      <button
        onClick={onToggleStrict}
        className={`rounded-lg p-3 text-center font-semibold text-sm transition-all ${
          strict ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        title="Strict 모드: 오타 시 정정 전까지 진행 차단"
      >
        Strict {strict ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-3 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
