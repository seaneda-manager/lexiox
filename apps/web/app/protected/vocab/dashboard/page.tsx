"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

type CourseStats = {
  courseId: string;
  courseName: string;
  totalDays: number;
  completedDays: number;
  totalAttempts: number;
  totalWeakWords: Set<string>;
};

type WeakWord = {
  wordId: string;
  text: string;
  failureCount: number;
  stages: string[];
};

type StageStats = {
  stage: "know" | "spelling" | "speed";
  totalAttempts: number;
  totalWrong: number;
  successRate: number;
};

type WeeklyData = {
  date: string;
  attempts: number;
};

type HourlyPattern = {
  hour: number;
  attempts: number;
};

type StudentGoal = {
  id: string;
  courseId: string;
  courseName: string;
  targetDay: number;
  deadline: string;
  status: string;
  currentDay: number;
};

export default function VocabDashboard() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [courseStats, setCourseStats] = useState<CourseStats[]>([]);
  const [weakWords, setWeakWords] = useState<WeakWord[]>([]);
  const [totalStats, setTotalStats] = useState({ attempts: 0, weakWords: 0 });
  const [stageStats, setStageStats] = useState<StageStats[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [hourlyPattern, setHourlyPattern] = useState<HourlyPattern[]>([]);
  const [goals, setGoals] = useState<StudentGoal[]>([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [targetDay, setTargetDay] = useState(10);
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  useEffect(() => {
    (async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user?.id) {
          setLoading(false);
          return;
        }

        // 학생 ID 조회
        const { data: studentData } = await supabase
          .from("academy_students")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!studentData?.id) {
          setLoading(false);
          return;
        }

        const studentId = studentData.id;

        // 1. 할당된 모든 코스 조회
        const { data: courseData } = await supabase
          .from("vocab_courses")
          .select("id, title, track_id, course_sets");

        if (!courseData) {
          setLoading(false);
          return;
        }

        // 전체 학습 시도 조회 (분석용)
        const { data: allAttempts } = await supabase
          .from("vocab_learning_attempts")
          .select("set_id, wrong_word_ids, stage, attempted_at")
          .eq("student_id", studentId);

        // 2. 각 코스별 통계 계산
        const stats: CourseStats[] = [];
        const allWeakWordMap = new Map<string, WeakWord>();
        const stageMap = new Map<string, { total: number; wrong: number }>();

        for (const course of courseData) {
          const courseSets = Array.isArray(course.course_sets) ? course.course_sets : [];
          const completedSets = new Set<string>();
          let attemptCount = 0;
          const courseWeakWords = new Set<string>();

          // 학습 시도 조회
          const { data: attempts } = await supabase
            .from("vocab_learning_attempts")
            .select("set_id, wrong_word_ids, stage")
            .eq("student_id", studentId)
            .in("set_id", courseSets.length > 0 ? courseSets : ["00000000-0000-0000-0000-000000000000"]);

          if (attempts) {
            for (const attempt of attempts) {
              completedSets.add(attempt.set_id);
              attemptCount++;

              // 약한 단어 수집
              const wrongIds = Array.isArray(attempt.wrong_word_ids) ? attempt.wrong_word_ids : [];
              wrongIds.forEach((wid) => {
                courseWeakWords.add(wid);
                const existing = allWeakWordMap.get(wid) || {
                  wordId: wid,
                  text: "",
                  failureCount: 0,
                  stages: [],
                };
                existing.failureCount++;
                if (!existing.stages.includes(attempt.stage)) {
                  existing.stages.push(attempt.stage);
                }
                allWeakWordMap.set(wid, existing);
              });
            }
          }

          stats.push({
            courseId: course.id,
            courseName: course.title || "Unknown Course",
            totalDays: courseSets.length,
            completedDays: completedSets.size,
            totalAttempts: attemptCount,
            totalWeakWords: courseWeakWords,
          });
        }

        // 3. 스테이지별 통계
        const stages: StageStats[] = [];
        if (allAttempts) {
          for (const stage of ["know", "spelling", "speed"] as const) {
            const stageAttempts = allAttempts.filter((a) => a.stage === stage);
            const totalAttempts = stageAttempts.length;
            const totalWrong = stageAttempts.reduce((sum, a) => {
              const wrongIds = Array.isArray(a.wrong_word_ids) ? a.wrong_word_ids : [];
              return sum + wrongIds.length;
            }, 0);

            if (totalAttempts > 0) {
              stages.push({
                stage,
                totalAttempts,
                totalWrong,
                successRate: Math.round(((totalAttempts - (totalWrong / totalAttempts)) / totalAttempts) * 100),
              });
            }
          }
        }

        // 4. 주별 데이터 (최근 7일)
        const weeklyMap = new Map<string, number>();
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split("T")[0];
          weeklyMap.set(dateStr, 0);
        }

        if (allAttempts) {
          for (const attempt of allAttempts) {
            const dateStr = new Date(attempt.attempted_at).toISOString().split("T")[0];
            if (weeklyMap.has(dateStr)) {
              weeklyMap.set(dateStr, (weeklyMap.get(dateStr) || 0) + 1);
            }
          }
        }

        const weekly = Array.from(weeklyMap.entries())
          .map(([date, attempts]) => ({ date, attempts }));

        // 5. 시간대별 패턴
        const hourlyMap = new Map<number, number>();
        for (let h = 0; h < 24; h++) hourlyMap.set(h, 0);

        if (allAttempts) {
          for (const attempt of allAttempts) {
            const hour = new Date(attempt.attempted_at).getHours();
            hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
          }
        }

        const hourly = Array.from(hourlyMap.entries())
          .map(([hour, attempts]) => ({ hour, attempts }));

        // 6. 단어 정보 채우기
        const weakWordsArray = Array.from(allWeakWordMap.values())
          .sort((a, b) => b.failureCount - a.failureCount)
          .slice(0, 20);

        const wordIds = weakWordsArray.map((w) => w.wordId);
        if (wordIds.length > 0) {
          const { data: words } = await supabase
            .from("words")
            .select("id, text")
            .in("id", wordIds);

          if (words) {
            const wordMap = new Map(words.map((w) => [w.id, w.text]));
            weakWordsArray.forEach((w) => {
              w.text = wordMap.get(w.wordId) || "[Unknown]";
            });
          }
        }

        setCourseStats(stats);
        setWeakWords(weakWordsArray);
        setStageStats(stages);
        setWeeklyData(weekly);
        setHourlyPattern(hourly);
        setTotalStats({
          attempts: stats.reduce((sum, s) => sum + s.totalAttempts, 0),
          weakWords: allWeakWordMap.size,
        });
      } catch (e) {
        console.warn("Error loading dashboard:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  // 목표 조회
  useEffect(() => {
    if (!loading && courseStats.length > 0) {
      (async () => {
        try {
          const { data: user } = await supabase.auth.getUser();
          if (!user?.id) return;

          const { data: studentData } = await supabase
            .from("academy_students")
            .select("id")
            .eq("user_id", user.id)
            .single();

          if (!studentData?.id) return;

          const { data: goalsData } = await supabase
            .from("vocab_student_goals")
            .select("*")
            .eq("student_id", studentData.id)
            .eq("status", "active");

          if (goalsData) {
            const goalsWithInfo = goalsData.map((goal) => {
              const course = courseStats.find((c) => c.courseId === goal.course_id);
              return {
                id: goal.id,
                courseId: goal.course_id,
                courseName: course?.courseName || "Unknown",
                targetDay: goal.target_day,
                deadline: goal.deadline,
                status: goal.status,
                currentDay: course?.completedDays || 0,
              };
            });
            setGoals(goalsWithInfo);
          }
        } catch (e) {
          console.warn("Error loading goals:", e);
        }
      })();
    }
  }, [loading, courseStats, supabase]);

  // 목표 저장
  const saveGoal = async () => {
    if (!selectedCourse || !targetDay || !deadline) return;

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.id) return;

      const { data: studentData } = await supabase
        .from("academy_students")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!studentData?.id) return;

      await supabase.from("vocab_student_goals").insert({
        student_id: studentData.id,
        course_id: selectedCourse,
        target_day: targetDay,
        deadline,
        status: "active",
      });

      setShowGoalForm(false);
      setSelectedCourse("");
      setTargetDay(10);
      setDeadline(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);

      // 목표 다시 로드
      const { data: goalsData } = await supabase
        .from("vocab_student_goals")
        .select("*")
        .eq("student_id", studentData.id)
        .eq("status", "active");

      if (goalsData) {
        const goalsWithInfo = goalsData.map((goal) => {
          const course = courseStats.find((c) => c.courseId === goal.course_id);
          return {
            id: goal.id,
            courseId: goal.course_id,
            courseName: course?.courseName || "Unknown",
            targetDay: goal.target_day,
            deadline: goal.deadline,
            status: goal.status,
            currentDay: course?.completedDays || 0,
          };
        });
        setGoals(goalsWithInfo);
      }
    } catch (e) {
      console.warn("Error saving goal:", e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="text-center text-slate-600">Loading dashboard...</div>
      </div>
    );
  }

  // 차트 렌더링 헬퍼
  const renderBar = (value: number, max: number, width: number = 300) => {
    const percent = max > 0 ? (value / max) * 100 : 0;
    const barWidth = (percent / 100) * width;
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="h-2 rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
        <div className="text-sm font-semibold text-slate-700 w-12 text-right">{Math.round(percent)}%</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">학습 대시보드</h1>
          <p className="mt-2 text-slate-600">당신의 학습 진도와 약점을 한눈에 확인하세요</p>
        </div>

        {/* Overview Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow">
            <div className="text-sm font-semibold text-slate-600">총 학습 시도</div>
            <div className="mt-2 text-3xl font-bold text-emerald-600">{totalStats.attempts}</div>
          </div>
          <div className="rounded-xl bg-white p-6 shadow">
            <div className="text-sm font-semibold text-slate-600">약한 단어</div>
            <div className="mt-2 text-3xl font-bold text-amber-600">{totalStats.weakWords}</div>
          </div>
          <div className="rounded-xl bg-white p-6 shadow">
            <div className="text-sm font-semibold text-slate-600">학습 코스</div>
            <div className="mt-2 text-3xl font-bold text-blue-600">{courseStats.length}</div>
          </div>
        </div>

        {/* Goals Section */}
        <div className="mb-8 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 p-6 shadow">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">학습 목표</h2>
            <button
              onClick={() => setShowGoalForm(!showGoalForm)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              {showGoalForm ? "✕ 닫기" : "+ 목표 추가"}
            </button>
          </div>

          {showGoalForm && (
            <div className="mb-6 space-y-4 rounded-lg bg-white p-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">코스 선택</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">-- 코스 선택 --</option>
                  {courseStats.map((course) => (
                    <option key={course.courseId} value={course.courseId}>
                      {course.courseName} (현재: Day {course.completedDays})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700">목표 Day</label>
                  <input
                    type="number"
                    min="1"
                    value={targetDay}
                    onChange={(e) => setTargetDay(Math.max(1, parseInt(e.target.value) || 1))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">기한</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <button
                onClick={saveGoal}
                disabled={!selectedCourse}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50"
              >
                목표 저장
              </button>
            </div>
          )}

          {goals.length > 0 ? (
            <div className="space-y-3">
              {goals.map((goal) => {
                const progress = goal.targetDay > 0 ? (goal.currentDay / goal.targetDay) * 100 : 0;
                const daysLeft = Math.max(0, Math.floor((new Date(goal.deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
                const isAchieved = goal.currentDay >= goal.targetDay;

                return (
                  <div key={goal.id} className="space-y-2 rounded-lg bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-900">{goal.courseName}</div>
                      <div className="text-sm font-semibold text-slate-600">
                        {goal.currentDay} / {goal.targetDay} Days
                      </div>
                    </div>
                    <div className="h-3 rounded-full bg-slate-200">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          isAchieved ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-indigo-400 to-purple-500"
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-slate-600">
                      {isAchieved ? (
                        <span className="text-emerald-600 font-semibold">✅ 목표 달성!</span>
                      ) : (
                        <span>{daysLeft}일 남음</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg bg-white p-4 text-center text-slate-600">
              목표를 설정하고 학습을 추적하세요
            </div>
          )}
        </div>

        {/* Course Progress */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow">
          <h2 className="mb-6 text-xl font-bold text-slate-900">코스별 진도</h2>
          <div className="space-y-4">
            {courseStats.map((course) => {
              const progress = course.totalDays > 0 ? (course.completedDays / course.totalDays) * 100 : 0;
              return (
                <div key={course.courseId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-900">{course.courseName}</div>
                    <div className="text-sm text-slate-600">
                      {course.completedDays} / {course.totalDays} Days
                    </div>
                  </div>
                  <div className="h-3 rounded-full bg-slate-200">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500">
                    {course.totalAttempts} attempts • {course.totalWeakWords.size} weak words
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Skill Success Rate */}
        {stageStats.length > 0 && (
          <div className="mb-8 rounded-xl bg-white p-6 shadow">
            <h2 className="mb-6 text-xl font-bold text-slate-900">스킬별 성공률</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {stageStats.map((stat) => {
                const stageLabel = {
                  know: "단어 인식 (Prescreen)",
                  spelling: "철자 맞추기 (Spelling)",
                  speed: "속도 테스트 (Speed)",
                }[stat.stage];

                const stageColor = {
                  know: "emerald",
                  spelling: "amber",
                  speed: "blue",
                }[stat.stage];

                return (
                  <div key={stat.stage} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-900">{stageLabel}</div>
                      <div className={`text-2xl font-bold text-${stageColor}-600`}>{stat.successRate}%</div>
                    </div>
                    <svg width="100%" height="120" viewBox="0 0 200 120" className="mx-auto">
                      {/* 원형 진도 게이지 */}
                      <circle
                        cx="100" cy="60" r="40"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                      />
                      <circle
                        cx="100" cy="60" r="40"
                        fill="none"
                        stroke={
                          stageColor === "emerald"
                            ? "#10b981"
                            : stageColor === "amber"
                              ? "#f59e0b"
                              : "#3b82f6"
                        }
                        strokeWidth="8"
                        strokeDasharray={`${(stat.successRate / 100) * 251.2} 251.2`}
                        strokeDashoffset="0"
                        strokeLinecap="round"
                        transform="rotate(-90 100 60)"
                      />
                      <text
                        x="100"
                        y="65"
                        textAnchor="middle"
                        fontSize="14"
                        fontWeight="bold"
                        fill="#1f2937"
                      >
                        {stat.totalAttempts}회
                      </text>
                    </svg>
                    <div className="text-xs text-slate-600 text-center">
                      정답: {stat.totalAttempts - Math.round(stat.totalWrong / stat.totalAttempts)} |{" "}
                      오답: {Math.round(stat.totalWrong / stat.totalAttempts)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Weekly Activity */}
        {weeklyData.some((d) => d.attempts > 0) && (
          <div className="mb-8 rounded-xl bg-white p-6 shadow">
            <h2 className="mb-6 text-xl font-bold text-slate-900">주간 학습 활동</h2>
            <div className="flex h-64 items-end gap-3">
              {weeklyData.map((day, idx) => {
                const maxAttempts = Math.max(...weeklyData.map((d) => d.attempts), 1);
                const height = (day.attempts / maxAttempts) * 100;
                const date = new Date(day.date);
                const dayName = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];

                return (
                  <div key={day.date} className="flex flex-1 flex-col items-center justify-end">
                    <div className="flex w-full flex-col items-center">
                      <div className="mb-2 h-40 w-full rounded-t-lg bg-gradient-to-b from-blue-400 to-emerald-400" style={{ height: `${height * 160}px` }} />
                      <div className="text-xs font-semibold text-slate-700">{dayName}</div>
                      <div className="text-xs text-slate-500">{date.getDate()}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 text-xs text-slate-600 text-center">
              최근 7일 학습 활동
            </div>
          </div>
        )}

        {/* Hourly Pattern */}
        {hourlyPattern.some((h) => h.attempts > 0) && (
          <div className="mb-8 rounded-xl bg-white p-6 shadow">
            <h2 className="mb-6 text-xl font-bold text-slate-900">시간대별 학습 패턴</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {hourlyPattern.map((hour) => {
                const maxAttempts = Math.max(...hourlyPattern.map((h) => h.attempts), 1);
                const percent = (hour.attempts / maxAttempts) * 100;

                return (
                  <div key={hour.hour} className="flex items-center gap-4">
                    <div className="w-16 text-sm font-semibold text-slate-700">
                      {String(hour.hour).padStart(2, "0")}:00
                    </div>
                    <div className="flex-1">
                      <div className="h-6 rounded-full bg-slate-200">
                        <div
                          className="h-6 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-12 text-right text-xs font-semibold text-slate-700">{hour.attempts}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Weak Words */}
        {weakWords.length > 0 ? (
          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-6 text-xl font-bold text-slate-900">자주 틀리는 단어 (상위 20)</h2>
            <div className="space-y-3">
              {weakWords.map((word, idx) => (
                <div
                  key={word.wordId}
                  className="flex items-center justify-between rounded-lg bg-slate-50 p-4 hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-600">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{word.text}</div>
                      <div className="text-xs text-slate-600">
                        {word.stages.join(", ")} • 실패 {word.failureCount}회
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-red-600">{word.failureCount}x</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-emerald-50 p-6 text-center text-emerald-700">
            축하합니다! 약한 단어가 없습니다. 계속 학습해주세요! ✅
          </div>
        )}
      </div>
    </div>
  );
}
