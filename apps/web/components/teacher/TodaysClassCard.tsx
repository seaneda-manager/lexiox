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

type Student = {
  id: string;
  name: string;
  grade?: string;
  school?: string;
};

type TodaysClass = {
  id: string;
  time: string; // "3:00 PM" 형식
  name: string; // "고2 영어반" 등
  students: Student[];
};

type TodaysClassCardProps = {
  classes?: TodaysClass[];
};

export default function TodaysClassCard({ classes = [] }: TodaysClassCardProps) {
  const today = new Date();
  const todayDow = today.getDay();
  const todayLabel = DAY_NAMES[todayDow];
  const dayLabel = DAY_LABELS[todayDow as keyof typeof DAY_LABELS];

  // 오늘의 수업 필터링 (데이터가 있다면)
  const todayClasses = classes.filter((c) => c.students && c.students.length > 0);

  if (!todayClasses || todayClasses.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-neutral-200 bg-white px-5 py-6 text-center">
        <div className="text-sm text-neutral-400">
          <p className="mb-1">🗓️ 오늘 예정된 수업이 없습니다</p>
          <p className="text-xs text-neutral-300">
            {todayLabel} - 수업 일정을 설정하시면 여기에 표시됩니다
          </p>
        </div>
      </section>
    );
  }

  const totalStudents = todayClasses.reduce((sum, c) => sum + (c.students?.length || 0), 0);

  return (
    <section className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-sky-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white">
              {dayLabel}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">📚 오늘의 수업</h3>
              <p className="text-xs text-neutral-500 mt-0.5">{todayLabel}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-sky-700">{todayClasses.length}개 반</p>
            <p className="text-xs text-sky-600">{totalStudents}명 학생</p>
          </div>
        </div>
      </div>

      {/* 수업 목록 */}
      <div className="divide-y divide-sky-100">
        {todayClasses.map((classItem) => (
          <div key={classItem.id} className="p-4 hover:bg-sky-50/50 transition">
            {/* 수업 정보 */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-neutral-800">{classItem.name}</p>
                <p className="text-xs text-neutral-500 mt-0.5">⏰ {classItem.time}</p>
              </div>
              <Link
                href={`/teacher/classes/${classItem.id}`}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 px-3 py-1.5 rounded-lg hover:bg-sky-100 transition"
              >
                관리 →
              </Link>
            </div>

            {/* 학생 목록 */}
            {classItem.students && classItem.students.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-neutral-500 px-1">
                  학생 {classItem.students.length}명
                </p>
                <div className="grid gap-1.5">
                  {classItem.students.map((student) => (
                    <Link
                      key={student.id}
                      href={`/teacher/students/${student.id}`}
                      className="flex items-center justify-between rounded-lg bg-white border border-sky-100 px-3 py-2 hover:border-sky-300 hover:shadow-sm transition text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-neutral-700 truncate">
                          {student.name}
                        </p>
                        {(student.grade || student.school) && (
                          <p className="text-xs text-neutral-400 truncate">
                            {[student.school, student.grade].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 ml-2 text-sky-600">
                        <span className="text-xs font-semibold">→</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-400 px-1">배정된 학생이 없습니다</p>
            )}
          </div>
        ))}
      </div>

      {/* 바닥 액션 */}
      <div className="px-5 py-3 bg-sky-50/50 border-t border-sky-100 flex gap-2 text-xs">
        <Link
          href="/teacher/classes"
          className="flex-1 text-center font-semibold text-sky-600 hover:text-sky-700 py-1.5 rounded-lg hover:bg-sky-100 transition"
        >
          모든 반 관리 →
        </Link>
      </div>
    </section>
  );
}
