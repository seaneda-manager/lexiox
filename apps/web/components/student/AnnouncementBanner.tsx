import Link from "next/link";

// 공지 배너 컴포넌트
export default function AnnouncementBanner({
  announcements
}: {
  announcements: Array<{
    id: string;
    type: "academy" | "contest" | "exam" | "system"; // 학원 공지 / 콘테스트 / 시험 / 시스템
    title: string;
    date: string;
    icon: string;
  }>;
}) {
  if (!announcements || announcements.length === 0) {
    return null;
  }

  const latestAnn = announcements[0];

  const typeMap: Record<string, { bg: string; text: string; emoji: string }> = {
    academy: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", emoji: "📢" },
    contest: { bg: "bg-purple-50 border-purple-200", text: "text-purple-700", emoji: "🏆" },
    exam: { bg: "bg-red-50 border-red-200", text: "text-red-700", emoji: "📝" },
    system: { bg: "bg-green-50 border-green-200", text: "text-green-700", emoji: "⚡" },
  };

  const typeInfo = typeMap[latestAnn.type] || typeMap.system;

  return (
    <div className={`rounded-xl border ${typeInfo.bg} p-4`}>
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0">{typeInfo.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold ${typeInfo.text} mb-0.5`}>
            {["academy", "contest", "exam"].includes(latestAnn.type) ? "공지" : "알림"}
          </p>
          <p className="text-sm font-semibold text-neutral-900 truncate">
            {latestAnn.title}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            {new Date(latestAnn.date).toLocaleDateString("ko-KR")}
          </p>
        </div>
        <Link
          href="#"
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white ${
            typeInfo.bg.includes("blue") ? "bg-blue-600 hover:bg-blue-700" :
            typeInfo.bg.includes("purple") ? "bg-purple-600 hover:bg-purple-700" :
            typeInfo.bg.includes("red") ? "bg-red-600 hover:bg-red-700" :
            "bg-green-600 hover:bg-green-700"
          } transition`}
        >
          보기
        </Link>
      </div>

      {/* 추가 공지 카운터 */}
      {announcements.length > 1 && (
        <p className="text-xs text-neutral-500 mt-3 text-center">
          다른 공지 <span className="font-bold">{announcements.length - 1}개</span> 더 있습니다
        </p>
      )}
    </div>
  );
}
