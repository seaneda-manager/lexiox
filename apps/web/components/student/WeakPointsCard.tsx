import Link from "next/link";

// 약점 카드 컴포넌트
export default function WeakPointsCard({
  weakPoints
}: {
  weakPoints: Array<{
    category: string; // "발음", "스펠링", "뜻 암기" 등
    issue: string;
    type: "skill" | "content"; // 스킬 약점 or 콘텐츠 약점
  }>;
}) {
  if (!weakPoints || weakPoints.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-sm font-semibold text-emerald-700">완벽합니다! 🎉</p>
        <p className="text-xs text-emerald-600 mt-1">약점이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-orange-200 bg-white p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-neutral-900">다시 확인할 것 📌</h3>
        <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
          {weakPoints.length}개
        </span>
      </div>

      <div className="space-y-2">
        {weakPoints.slice(0, 3).map((wp, idx) => (
          <div key={idx} className="rounded-lg bg-orange-50 p-3 border border-orange-100">
            <div className="flex items-start gap-2">
              <span className="text-lg font-bold text-orange-600 shrink-0">
                {idx === 0 ? "🔴" : idx === 1 ? "🟠" : "🟡"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-neutral-700 truncate">{wp.category}</p>
                <p className="text-xs text-neutral-600 mt-0.5 line-clamp-2">{wp.issue}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA 버튼 */}
      <div className="pt-2">
        <Link
          href="/vocab/drill"
          className="inline-flex items-center gap-2 rounded-lg bg-orange-600 text-white px-3 py-2 text-xs font-semibold hover:bg-orange-700 transition"
        >
          약점 드릴 시작 →
        </Link>
      </div>
    </div>
  );
}
