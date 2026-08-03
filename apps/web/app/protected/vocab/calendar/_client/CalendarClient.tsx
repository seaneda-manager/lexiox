"use client";

import React, { useEffect, useState } from "react";
import {
  getStudentCalendarAction,
  CourseCalendar,
  courseTypeColors,
  courseTypeLabels,
} from "../actions";

type CalendarDay = {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  assignments: Array<{
    track_title: string;
    day_index: number;
    status: string;
  }>;
};

export default function CalendarClient() {
  const [courses, setCourses] = useState<CourseCalendar[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await getStudentCalendarAction();
      if (res.ok) {
        setCourses(res.courses);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="p-6 text-center">로딩 중...</div>;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 해당 월의 첫 날과 마지막 날
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  // 캘린더 그리드 (6주 × 7일)
  const daysInCalendar: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const dateStr = date.toISOString().split("T")[0];
    const assignments = courses
      .flatMap((c) =>
        c.assignments
          .filter((a) => a.available_at === dateStr)
          .map((a) => ({
            track_title: c.track_title,
            day_index: a.day_index,
            status: a.status,
          }))
      );

    daysInCalendar.push({
      date: dateStr,
      dayOfWeek: date.getDay(),
      assignments,
    });
  }

  // 월 네비게이션
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const monthName = new Date(year, month).toLocaleString("ko-KR", {
    month: "long",
    year: "numeric",
  });

  const getStatusBgColor = (status: string) => {
    if (status === "COMPLETED") return "bg-green-200 border-green-400";
    if (status === "STARTED") return "bg-yellow-200 border-yellow-400";
    return "bg-blue-200 border-blue-400";
  };

  const getDateColor = (date: string, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return "bg-gray-50 text-gray-400";

    const today = new Date().toISOString().split("T")[0];
    if (date === today) return "bg-purple-50";
    if (date < today) return "bg-white";
    return "bg-white";
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-lg">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">학습 달력</h1>
            <div className="space-x-2">
              <button
                onClick={handlePrevMonth}
                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded text-sm font-bold"
              >
                ← 이전
              </button>
              <button
                onClick={handleToday}
                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded text-sm font-bold"
              >
                오늘
              </button>
              <button
                onClick={handleNextMonth}
                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded text-sm font-bold"
              >
                다음 →
              </button>
            </div>
          </div>
          <h2 className="text-2xl font-bold">{monthName}</h2>
        </div>

        {/* Course Type Legend */}
        <div className="p-4 border-b bg-gray-50">
          <p className="text-sm font-bold mb-2">과정별 색상</p>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(courseTypeLabels).map(([type, label]) => (
              <div key={type} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border ${courseTypeColors[type]}`}></div>
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>

          <p className="text-sm font-bold mt-4 mb-2">과제 상태</p>
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-200 border border-blue-400 rounded"></div>
              <span className="text-sm">미완료</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-200 border border-yellow-400 rounded"></div>
              <span className="text-sm">진행중</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-200 border border-green-400 rounded"></div>
              <span className="text-sm">완료</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
              <span className="text-sm">오늘</span>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
              <div
                key={day}
                className="text-center font-bold text-gray-600 py-2 border-b"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2 auto-rows-max">
            {daysInCalendar.map((day, idx) => {
              const isCurrentMonth = new Date(day.date).getMonth() === month;
              return (
                <div
                  key={idx}
                  className={`min-h-24 p-2 border rounded-lg ${getDateColor(
                    day.date,
                    isCurrentMonth
                  )}`}
                >
                  <div className="font-bold mb-1 text-sm">
                    {new Date(day.date).getDate()}
                  </div>
                  <div className="space-y-1">
                    {day.assignments.map((assign, i) => (
                      <div
                        key={i}
                        className={`text-xs p-1 rounded border ${getStatusBgColor(
                          assign.status
                        )} ${courseTypeColors[assign.course_type] || ""}`}
                        title={`${courseTypeLabels[assign.course_type] || "과정"} - ${assign.course_title} - Day ${assign.day_index}`}
                      >
                        <div className="font-bold truncate text-xs">
                          {courseTypeLabels[assign.course_type]?.substring(0, 3) || "과"}
                          {assign.course_title.substring(0, 5)}
                        </div>
                        {assign.day_index && <div className="text-xs">Day {assign.day_index}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Course Summary */}
        {courses.length > 0 && (
          <div className="border-t p-6 bg-gray-50">
            <h3 className="text-xl font-bold mb-4">등록된 코스</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => {
                const completed = course.assignments.filter(
                  (a) => a.completed_at
                ).length;
                const progress = Math.round(
                  (completed / course.assignments.length) * 100
                );

                // 마지막 할당의 available_at을 찾아서 종료일 추정
                let courseEndDate = new Date(course.start_date);
                if (course.assignments.length > 0) {
                  const lastAssign = course.assignments[course.assignments.length - 1];
                  courseEndDate = new Date(lastAssign.available_at);
                }

                // 과정 타입별 경계 색상
                const borderColorMap: Record<string, string> = {
                  vocab: "border-blue-600",
                  speaking: "border-red-600",
                  listening: "border-purple-600",
                  reading: "border-green-600",
                  writing: "border-yellow-600",
                  grammar: "border-orange-600",
                };

                return (
                  <div
                    key={course.course_id}
                    className={`bg-white rounded-lg shadow p-4 border-l-4 ${borderColorMap[course.course_type] || "border-blue-600"}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-lg">{course.course_title}</h4>
                      <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 font-bold">
                        {courseTypeLabels[course.course_type] || "과정"}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      <p>시작: {course.start_date}</p>
                      <p>
                        종료 예상:
                        {courseEndDate.toISOString().split("T")[0]}
                      </p>
                    </div>
                    <div className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>진행도</span>
                        <span className="font-bold">
                          {completed}/{course.assignments.length}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className="text-right text-xs text-gray-600 mt-1">
                        {progress}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
