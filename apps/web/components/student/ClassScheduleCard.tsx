'use client';

import Link from 'next/link';

const DAY_LABELS = {
  0: '일',
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
  6: '토',
};

const DAY_NAMES = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

type ClassScheduleCardProps = {
  classDays?: string[] | null;
  className?: string;
  schoolName?: string | null;
};

export default function ClassScheduleCard({
  classDays,
  className: classNameProp,
  schoolName,
}: ClassScheduleCardProps) {
  const today = new Date();
  const todayDow = today.getDay();
  const todayLabel = DAY_NAMES[todayDow];

  // 요일 값 정규화 (문자/숫자 모두 지원)
  const parseDay = (d: string): number => {
    const MAP: Record<string, number> = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
      일: 0,
      월: 1,
      화: 2,
      수: 3,
      목: 4,
      금: 5,
      토: 6,
      '0': 0,
      '1': 1,
      '2': 2,
      '3': 3,
      '4': 4,
      '5': 5,
      '6': 6,
    };
    return MAP[d.toLowerCase()] ?? -1;
  };

  const normalizedDays = (classDays ?? [])
    .map((d) => parseDay(d))
    .filter((d) => d >= 0)
    .sort();

  const hasClassToday = normalizedDays.includes(todayDow);

  // 이번주 수업일 계산
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dow = date.getDay();
    if (normalizedDays.includes(dow)) {
      weekDays.push({
        date,
        dow,
        label: DAY_NAMES[dow],
        isToday: date.toDateString() === today.toDateString(),
      });
    }
  }

  if (!classDays || classDays.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-5 py-6 text-center text-sm text-neutral-400">
        <p>등록된 수업 일정이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
      {/* 헤더 */}
      <div className={`px-5 py-4 border-b border-neutral-100 ${
        hasClassToday ? 'bg-gradient-to-r from-amber-50 to-transparent' : 'bg-neutral-50'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              📚 {hasClassToday ? "오늘 수업이 있어요!" : "이번주 수업"}
            </h3>
            {schoolName && (
              <p className="text-xs text-neutral-500 mt-0.5">{schoolName}</p>
            )}
            <p className="text-xs text-neutral-400 mt-1">
              {todayLabel} · {normalizedDays.length}회/주
            </p>
          </div>
          {hasClassToday && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-600">
              ✓
            </div>
          )}
        </div>
      </div>

      {/* 수업 요일 목록 */}
      <div className="divide-y divide-neutral-100">
        {weekDays.length > 0 ? (
          weekDays.map((day) => (
            <div
              key={day.date.toISOString()}
              className={`px-5 py-3 flex items-center justify-between transition ${
                day.isToday ? 'bg-amber-50' : 'hover:bg-neutral-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  day.isToday
                    ? 'bg-amber-500 text-white'
                    : 'bg-neutral-100 text-neutral-600'
                }`}>
                  {DAY_LABELS[day.dow as keyof typeof DAY_LABELS]}
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-800">
                    {day.label}
                    {day.isToday && <span className="ml-2 text-xs text-amber-600 font-semibold">오늘</span>}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {day.date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
              {day.isToday && (
                <span className="text-xs font-semibold text-amber-600">진행 중</span>
              )}
            </div>
          ))
        ) : (
          <div className="px-5 py-4 text-center text-sm text-neutral-400">
            이번주 수업이 없습니다
          </div>
        )}
      </div>

      {/* 바닥 액션 */}
      <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-100 flex gap-2">
        <Link
          href="/student/schedule"
          className="flex-1 text-center text-xs font-semibold text-neutral-600 hover:text-neutral-900 py-1.5 rounded-lg hover:bg-neutral-100 transition"
        >
          수업 일정 보기 →
        </Link>
      </div>
    </div>
  );
}
