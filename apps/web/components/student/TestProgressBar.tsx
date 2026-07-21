// 시험 준비 퍼센테지 컴포넌트
export default function TestProgressBar({
  sections
}: {
  sections: Array<{
    name: string;
    progress: number; // 0-100
    color: string; // Tailwind color
  }>;
}) {
  if (!sections || sections.length === 0) {
    return null;
  }

  const avgProgress = Math.round(
    sections.reduce((sum, s) => sum + s.progress, 0) / sections.length
  );

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
      {/* 전체 진도 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-neutral-900">시험 준비 진도</h3>
          <span className="text-lg font-bold text-indigo-600">{avgProgress}%</span>
        </div>
        <div className="h-3 w-full rounded-full bg-neutral-100">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all"
            style={{ width: `${avgProgress}%` }}
          />
        </div>
      </div>

      {/* 섹션별 진도 */}
      <div className="grid grid-cols-2 gap-3">
        {sections.map((section) => {
          const colorMap: Record<string, { bg: string; text: string; bar: string }> = {
            sky: { bg: "bg-sky-50", text: "text-sky-700", bar: "bg-sky-400" },
            emerald: { bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-400" },
            amber: { bg: "bg-amber-50", text: "text-amber-700", bar: "bg-amber-400" },
            rose: { bg: "bg-rose-50", text: "text-rose-700", bar: "bg-rose-400" },
          };

          const colors = colorMap[section.color] || colorMap.sky;

          return (
            <div key={section.name} className={`rounded-lg ${colors.bg} p-3`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-neutral-700">{section.name}</p>
                <span className={`text-xs font-bold ${colors.text}`}>{section.progress}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/60">
                <div
                  className={`h-1.5 rounded-full ${colors.bar} transition-all`}
                  style={{ width: `${section.progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
