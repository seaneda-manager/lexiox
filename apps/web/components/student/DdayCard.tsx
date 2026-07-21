// D-day 카드 컴포넌트
export default function DdayCard({
  nextExamDate,
  examTitle
}: {
  nextExamDate: string | null;
  examTitle: string;
}) {
  if (!nextExamDate) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-6 text-center">
        <p className="text-sm text-neutral-400">다음 시험 일정이 없습니다</p>
      </div>
    );
  }

  const exam = new Date(nextExamDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exam.setHours(0, 0, 0, 0);

  const daysLeft = Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isUrgent = daysLeft <= 14;

  return (
    <div className={[
      "rounded-2xl border p-5 bg-gradient-to-br",
      isUrgent
        ? "border-rose-200 from-rose-50 to-white"
        : "border-sky-200 from-sky-50 to-white"
    ].join(" ")}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-xs font-semibold mb-1 ${isUrgent ? "text-rose-600" : "text-sky-600"}`}>
            {examTitle}
          </p>
          <p className={`text-3xl font-bold ${isUrgent ? "text-rose-700" : "text-sky-700"}`}>
            D-{daysLeft}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-500">시험 예정일</p>
          <p className="text-sm font-semibold text-neutral-900">
            {exam.toLocaleDateString("ko-KR", {
              month: "short",
              day: "numeric"
            })}
          </p>
        </div>
      </div>

      {/* 진행 바 */}
      <div className="mt-4 space-y-1">
        <div className="h-2 w-full rounded-full bg-white/60">
          <div
            className={`h-2 rounded-full transition-all ${isUrgent ? "bg-rose-400" : "bg-sky-400"}`}
            style={{ width: `${Math.max(5, Math.min(95, (1 - daysLeft / 60) * 100))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
