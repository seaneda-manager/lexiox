"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { loadVocabHubAction } from "./actions";
import { Lock, ChevronRight, BookOpen } from "lucide-react";

type WeakWordStats = {
  totalWrong: number;
  byPOS: Record<string, number>;
};

type Day = {
  dayIndex: number;
  setId: string;
  wordCount: number;
  completedAt: string | null;
  availableAt: string;
  isCompleted: boolean;
  isAvailable: boolean;
  isLocked: boolean;
  weakWordStats?: WeakWordStats;
};

type Course = {
  courseId: string;
  courseName: string;
  program: "toefl" | "lexiox" | "naesin";
  totalDays: number;
  completedDays: number;
  currentDayIndex: number;
  days: Day[];
  weakWordStats?: {
    totalWrong: number;
    byPOS: Record<string, number>;
  };
};

type CumulativeStats = {
  totalWordsLearned: number;
  wordsByPOS: Record<string, number>;
};

export default function VocabHubPage() {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [program, setProgram] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cumulativeStats, setCumulativeStats] = useState<CumulativeStats | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await loadVocabHubAction();
        if (result.ok) {
          setCourses(result.courses);
          setProgram(result.program);
          if (result.cumulativeStats) {
            setCumulativeStats(result.cumulativeStats);
          }
        } else {
          setError(result.error || "Failed to load vocab hub");
        }
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const groupedCourses = useMemo(() => {
    const groups: Record<string, Course[]> = {
      lexiox: [],
      toefl: [],
      naesin: [],
    };
    courses.forEach((c) => {
      groups[c.program]?.push(c);
    });
    return groups;
  }, [courses]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center text-slate-600">단어 학습 허브 로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-center text-red-800">
            오류 발생: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        {/* 헤더 */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900">📚 단어 학습</h1>
          <p className="mt-2 text-slate-600">Assigned VOCA books (할당 단어집)</p>
        </div>

        {/* 누적 학습 통계 섹션 */}
        {cumulativeStats && (
          <section className="mb-12">
            <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-6 mb-6">
              <h2 className="text-2xl font-bold text-slate-900">📊 누적 학습 통계</h2>
              <p className="mt-1 text-slate-600">완료된 Day의 학습 통계입니다</p>
            </div>

            <div className="rounded-2xl border-2 border-purple-300 bg-white p-8 shadow-sm">
              {cumulativeStats.totalWordsLearned > 0 ? (
                <div>
                  <div className="mb-8 text-center">
                    <p className="text-sm font-semibold text-slate-600">총 학습한 단어</p>
                    <p className="text-6xl font-bold text-purple-600 mt-2">{cumulativeStats.totalWordsLearned}</p>
                    <p className="text-sm text-slate-500 mt-1">개</p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-600 mb-6">📈 품사별 분포</p>
                    <div className="space-y-4">
                      {(() => {
                        const posLabels: Record<string, { label: string; color: string }> = {
                          noun: { label: "명사", color: "bg-blue-500" },
                          verb: { label: "동사", color: "bg-emerald-500" },
                          adj: { label: "형용사", color: "bg-amber-500" },
                          adv: { label: "부사", color: "bg-rose-500" },
                          prep: { label: "전치사", color: "bg-indigo-500" },
                          conj: { label: "접속사", color: "bg-cyan-500" },
                          idiom: { label: "관용구", color: "bg-pink-500" },
                          expression: { label: "숙어", color: "bg-orange-500" },
                          unknown: { label: "기타", color: "bg-slate-400" },
                        };

                        const sorted = Object.entries(cumulativeStats.wordsByPOS)
                          .sort(([, a], [, b]) => b - a);

                        const maxCount = Math.max(...sorted.map(([, count]) => count), 1);

                        return sorted.map(([pos, count]) => {
                          const info = posLabels[pos] || { label: pos, color: "bg-slate-400" };
                          const percentage = (count / cumulativeStats.totalWordsLearned) * 100;
                          const barWidth = (count / maxCount) * 100;

                          return (
                            <div key={pos}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-slate-700 w-16">{info.label}</span>
                                <span className="text-sm font-bold text-slate-900">{count}개</span>
                                <span className="text-xs text-slate-500 w-12 text-right">{percentage.toFixed(1)}%</span>
                              </div>
                              <div className="h-8 rounded-lg bg-slate-100 overflow-hidden">
                                <div
                                  className={`h-full ${info.color} transition-all flex items-center justify-end pr-3`}
                                  style={{ width: `${barWidth}%` }}
                                >
                                  {barWidth > 10 && (
                                    <span className="text-xs font-bold text-white">{count}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500">아직 완료한 Day가 없습니다</p>
                  <p className="text-xs text-slate-400 mt-2">Day를 완료하면 통계가 표시됩니다</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 게임 모드 */}
        {courses.length > 0 && (
          <section className="mb-12">
            <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 mb-6">
              <h2 className="text-2xl font-bold text-slate-900">🎮 게임 모드</h2>
              <p className="mt-1 text-slate-600">게임으로 즐겁게 단어를 학습하세요</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Link
                href="/vocab/synonym-game"
                className="rounded-xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-purple-100 p-6 hover:shadow-lg transition-all hover:border-purple-400"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">동의어 게임</h3>
                    <p className="text-sm text-slate-600 mt-1">같은 의미의 단어를 찾으세요</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-purple-600" />
                </div>
              </Link>
            </div>
          </section>
        )}

        {/* 할당된 단어집 */}
        {courses.length > 0 && (
          <section className="mb-12">
            <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100 p-6 mb-6">
              <h2 className="text-2xl font-bold text-slate-900">📚 Assigned VOCA books</h2>
              <p className="mt-1 text-slate-600">할당된 단어집을 선택하여 학습하세요</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <CourseCard key={course.courseId} course={course} color="amber" />
              ))}
            </div>
          </section>
        )}

        {courses.length === 0 && (
          <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
            <BookOpen className="mx-auto h-16 w-16 text-slate-300 mb-4" />
            <p className="text-slate-600 text-lg">할당된 단어 커리가 없습니다</p>
            <p className="mt-2 text-slate-500">선생님께 단어 커리를 요청해주세요</p>
          </div>
        )}

        {/* 오늘의 문장 섹션 */}
        {courses.length > 0 && (
          <section className="mt-16">
            <div className="rounded-2xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100 p-6 mb-6">
              <h2 className="text-2xl font-bold text-slate-900">✍️ 오늘의 문장</h2>
              <p className="mt-1 text-slate-600">학습한 단어를 포함한 어려운 문장을 해석해보세요</p>
            </div>

            <SentenceGameWidget />
          </section>
        )}
      </div>
    </main>
  );
}

/* ═════════════════════════════════════════════════════════════════ */
/* 오늘의 문장 게임 Component */
/* ═════════════════════════════════════════════════════════════════ */

type SentenceQuestion = {
  id: string;
  sentence: string;
  translation: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
};

const SAMPLE_SENTENCES: SentenceQuestion[] = [
  {
    id: "1",
    sentence: "The vast expanse of the universe continues to extend our understanding of its complexity.",
    translation: "우주의 광대한 범위는 우리의 이해를 계속 확장시킨다.",
    difficulty: "hard",
    tags: ["philosophy", "science"],
  },
  {
    id: "2",
    sentence: "Despite the adversity faced by the pioneers, their resilience ultimately facilitated progress.",
    translation: "선구자들이 직면한 역경에도 불구하고, 그들의 회복력은 궁극적으로 진보를 촉진했다.",
    difficulty: "hard",
    tags: ["history", "motivation"],
  },
  {
    id: "3",
    sentence: "The inherent contradiction in his argument undermined the credibility of his entire thesis.",
    translation: "그의 논증에 내재된 모순은 그의 전체 논문의 신뢰성을 훼손했다.",
    difficulty: "medium",
    tags: ["logic", "writing"],
  },
];

function SentenceGameWidget() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [completed, setCompleted] = useState(0);

  const question = SAMPLE_SENTENCES[currentIdx % SAMPLE_SENTENCES.length];

  const handleNext = () => {
    setCurrentIdx((prev) => prev + 1);
    setUserInput("");
    setRevealed(false);
    setCompleted((prev) => prev + 1);
  };

  const handleReveal = () => {
    setRevealed(true);
  };

  return (
    <div className="rounded-2xl border-2 border-rose-300 bg-white p-8 shadow-sm">
      {/* 진행도 */}
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-600">
          문장 {currentIdx + 1} / {SAMPLE_SENTENCES.length}
        </span>
        <span className="inline-block px-3 py-1 rounded-full text-sm font-bold bg-rose-100 text-rose-700">
          포인트 +{completed * 5}
        </span>
      </div>

      {/* 어려운 문장 표시 */}
      <div className="mb-6 space-y-4">
        <div className="text-xl font-bold text-slate-900 leading-relaxed">
          {question.sentence}
        </div>
        <div className="flex flex-wrap gap-2">
          {question.tags.map((tag) => (
            <span key={tag} className="px-2 py-1 bg-slate-100 text-xs font-semibold text-slate-700 rounded">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* 해석 입력 */}
      <div className="mb-4">
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="문장의 해석을 입력하세요..."
          disabled={revealed}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-900 placeholder-slate-500 focus:border-rose-500 focus:outline-none disabled:bg-slate-50"
          rows={3}
        />
      </div>

      {/* 정답 표시 */}
      {revealed && (
        <div className="mb-6 rounded-lg bg-emerald-50 border border-emerald-200 p-4">
          <div className="text-sm font-semibold text-emerald-700 mb-2">📝 정답 해석</div>
          <div className="text-slate-900 leading-relaxed">{question.translation}</div>
        </div>
      )}

      {/* 버튼들 */}
      <div className="flex gap-3">
        <button
          onClick={handleReveal}
          disabled={revealed}
          className="flex-1 rounded-lg bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 px-4 py-3 text-white font-semibold transition"
        >
          {revealed ? "✓ 확인됨" : "정답 보기"}
        </button>
        <button
          onClick={handleNext}
          disabled={!revealed}
          className="flex-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 px-4 py-3 text-white font-semibold transition"
        >
          {currentIdx < SAMPLE_SENTENCES.length - 1 ? "다음 문장 ▶" : "완료 ✅"}
        </button>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════ */
/* Section Component */
/* ═════════════════════════════════════════════════════════════════ */

type SectionProps = {
  title: string;
  subtitle: string;
  color: "violet" | "blue" | "emerald";
  courses: Course[];
};

const colorMap = {
  violet: "from-violet-50 to-violet-100 border-violet-200",
  blue: "from-blue-50 to-blue-100 border-blue-200",
  emerald: "from-emerald-50 to-emerald-100 border-emerald-200",
};

const colorAccent = {
  violet: "text-violet-700 bg-violet-100",
  blue: "text-blue-700 bg-blue-100",
  emerald: "text-emerald-700 bg-emerald-100",
};

function Section({ title, subtitle, color, courses }: SectionProps) {
  return (
    <section className="mb-12">
      <div className={`rounded-2xl border-2 bg-gradient-to-br ${colorMap[color]} p-6 mb-6`}>
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-slate-600">{subtitle}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <CourseCard key={course.courseId} course={course} color={color} />
        ))}
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════════ */
/* Course Card Component */
/* ═════════════════════════════════════════════════════════════════ */

type CourseCardProps = {
  course: Course;
  color: "violet" | "blue" | "emerald";
};

function CourseCard({ course, color }: CourseCardProps) {
  const [selectedDay, setSelectedDay] = useState<Day | null>(
    course.days.find((d) => d.isAvailable && !d.isCompleted) || course.days[0] || null
  );

  const completionPercent =
    course.totalDays > 0 ? (course.completedDays / course.totalDays) * 100 : 0;

  const borderColor = {
    violet: "border-violet-300",
    blue: "border-blue-300",
    emerald: "border-emerald-300",
  };

  const buttonColor = {
    violet: "bg-violet-600 hover:bg-violet-700",
    blue: "bg-blue-600 hover:bg-blue-700",
    emerald: "bg-emerald-600 hover:bg-emerald-700",
  };

  const progressColor = {
    violet: "bg-gradient-to-r from-violet-400 to-violet-600",
    blue: "bg-gradient-to-r from-blue-400 to-blue-600",
    emerald: "bg-gradient-to-r from-emerald-400 to-emerald-600",
  };

  return (
    <div className={`rounded-2xl border-2 ${borderColor} bg-white p-6 shadow-sm hover:shadow-md transition`}>
      {/* 진도 바 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">진도</span>
          <span className="text-sm font-bold text-slate-600">
            {course.completedDays} / {course.totalDays} Days
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-200">
          <div
            className={`h-2 rounded-full transition-all ${progressColor[color]}`}
            style={{ width: `${Math.min(completionPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* 코스명 */}
      <h3 className="text-lg font-bold text-slate-900 mb-4">{course.courseName}</h3>

      {/* Day 드롭다운 */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-600 mb-2">학습할 Day 선택</label>
        <select
          value={selectedDay?.dayIndex ?? ""}
          onChange={(e) => {
            const dayIdx = parseInt(e.target.value);
            const day = course.days.find((d) => d.dayIndex === dayIdx);
            setSelectedDay(day || null);
          }}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 bg-white hover:border-slate-400 focus:border-slate-500 focus:outline-none"
        >
          {course.days.map((day) => (
            <option key={day.dayIndex} value={day.dayIndex}>
              {day.isCompleted && "✓ "}
              Day {day.dayIndex}
              {day.isLocked && " (잠금)"}
              {!day.isCompleted && !day.isAvailable && " (준비중)"}
            </option>
          ))}
        </select>
      </div>

      {/* 선택된 Day 정보 */}
      {selectedDay && (
        <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm space-y-2">
          <div className="text-slate-700 font-medium">
            📝 Day {selectedDay.dayIndex} · {selectedDay.wordCount}개 단어
          </div>

          {/* 오답 통계 */}
          {selectedDay.weakWordStats && selectedDay.weakWordStats.totalWrong > 0 && (
            <div className="text-slate-600 text-xs">
              <div className="font-medium">틀린 단어: {selectedDay.weakWordStats.totalWrong}개</div>
              <div className="mt-1 flex flex-wrap gap-2">
                {Object.entries(selectedDay.weakWordStats.byPOS)
                  .sort(([, a], [, b]) => b - a)
                  .map(([pos, count]) => {
                    const posLabel = {
                      noun: "명사",
                      verb: "동사",
                      adj: "형용사",
                      adv: "부사",
                      prep: "전치사",
                      conj: "접속사",
                      unknown: "기타",
                    }[pos] || pos;
                    const pct = Math.round((count / selectedDay.weakWordStats!.totalWrong) * 100);
                    return (
                      <span key={pos} className="inline-block px-2 py-1 bg-white rounded border border-slate-300">
                        {posLabel} {pct}%
                      </span>
                    );
                  })}
              </div>
            </div>
          )}

          {selectedDay.isCompleted && (
            <div className="text-emerald-700 font-semibold">✅ 완료됨</div>
          )}
        </div>
      )}

      {/* 시작 버튼 */}
      <button
        disabled={!selectedDay || selectedDay.isLocked}
        onClick={() => {
          if (selectedDay && !selectedDay.isLocked) {
            window.location.href = `/vocab/session?setId=${selectedDay.setId}&dayIndex=${selectedDay.dayIndex}`;
          }
        }}
        className={`w-full rounded-lg px-4 py-3 text-white font-semibold transition ${
          selectedDay?.isLocked || !selectedDay
            ? "bg-slate-300 cursor-not-allowed text-slate-600"
            : `${buttonColor[color]}`
        }`}
      >
        {!selectedDay
          ? "Day 선택 필요"
          : selectedDay.isLocked
            ? "🔒 이전 Day를 완료하세요"
            : selectedDay.isCompleted
              ? "🔄 복습하기"
              : "▶️ 학습 시작"}
      </button>
    </div>
  );
}
