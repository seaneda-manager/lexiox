import type { CategoryStat } from "@/lib/hi-naesin/weaknessCategories";

function accuracyColor(pct: number): string {
  if (pct < 50) return "bg-rose-500";
  if (pct < 75) return "bg-amber-500";
  return "bg-emerald-500";
}

export default function WeaknessSummary({ stats }: { stats: CategoryStat[] }) {
  if (stats.length === 0) return null;

  return (
    <div className="rounded-lg border bg-white shadow-sm p-4">
      <h3 className="mb-1 text-sm font-semibold text-gray-700">📊 약점 요약</h3>
      <p className="mb-3 text-[11px] text-gray-400">카테고리별 정답률 · 낮은 순</p>
      <div className="space-y-2">
        {stats.map((s) => (
          <div key={s.category} className="flex items-center gap-3">
            <span className="w-32 flex-shrink-0 truncate text-xs text-gray-700">{s.category}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div className={`h-full rounded-full ${accuracyColor(s.accuracyPct)}`} style={{ width: `${s.accuracyPct}%` }} />
            </div>
            <span className="w-16 flex-shrink-0 text-right text-xs font-semibold text-gray-600">
              {s.accuracyPct}%
            </span>
            <span className="w-14 flex-shrink-0 text-right text-[10px] text-gray-400">
              {s.correct}/{s.attempts}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
