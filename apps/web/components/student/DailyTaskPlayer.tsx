"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DailyTaskWithProblems } from "@/lib/types/problem-bank";

const TASK_TYPE_LABEL: Record<string, string> = {
  light: "기초 (4문제)",
  medium_1: "중급 유형1 (3문제)",
  medium_2: "중급 유형2 (2문제)",
  medium_3: "중급 유형3 (2문제)",
  medium_4: "중급 유형4 (2문제)",
};

type DailyTaskPlayerProps = {
  task: DailyTaskWithProblems;
};

export default function DailyTaskPlayer({ task }: DailyTaskPlayerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 모든 문제를 순서대로 배열에 담기
  // 지문 유형별로 구분되어 저장됨:
  // - complete_words: blanks 배열 (채우기형)
  // - daily_life/academic_passage: questions 배열 (객관식)
  const allProblems = [
    ...(task.complete_words ?? []),
    ...(task.daily_life ?? []),
    ...(task.academic_passage ?? []),
  ];

  const currentProblem = allProblems[currentIndex];
  const totalProblems = allProblems.length;
  const progress = ((currentIndex + 1) / totalProblems) * 100;

  const handleSelectAnswer = (problemId: string, answerId: string) => {
    setAnswers(prev => ({
      ...prev,
      [problemId]: answerId,
    }));
  };

  const handleNext = () => {
    if (currentIndex < totalProblems - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/daily-task/${task.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "제출에 실패했습니다.");
      }
      router.push(`/student/daily-tests/${task.id}/review`);
    } catch (err: any) {
      setSubmitError(err?.message ?? "제출 중 오류가 발생했습니다.");
      setSubmitting(false);
    }
  };

  if (!currentProblem) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">문제를 불러올 수 없습니다</p>
          <Link href="/student" className="text-blue-600 hover:underline mt-4 inline-block">
            돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {TASK_TYPE_LABEL[task.task_type]}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                문제 {currentIndex + 1} / {totalProblems}
              </p>
            </div>
            <Link
              href="/student"
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ✕
            </Link>
          </div>

          {/* 진행률 바 */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 문제 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {currentProblem.type === "complete_words" && "📝 빈칸 채우기"}
              {currentProblem.type === "daily_life" && "💬 일상 이해"}
              {currentProblem.type === "academic_passage" && "📚 지문 읽기"}
            </h2>

            {/* 지문 표시 (모든 문제 유형) */}
            {(currentProblem as any).passageHtml ? (
              <div
                className="text-gray-700 leading-relaxed space-y-3 [&_strong]:font-semibold [&_b]:font-semibold [&_em]:italic"
                dangerouslySetInnerHTML={{ __html: (currentProblem as any).passageHtml }}
              />
            ) : (
              currentProblem.passage && (
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {currentProblem.passage}
                </div>
              )
            )}
          </div>

          {/* 객관식 문제 - Daily Life / Academic Passage */}
          {currentProblem.type !== "complete_words" && (currentProblem as any).questions && (
            <div className="space-y-4 border-t pt-6">
              {(currentProblem as any).questions.map((q: any, idx: number) => (
                <div key={q.id} className="space-y-2">
                  <p className="font-medium text-gray-900">
                    Q{idx + 1}. {q.stem}
                  </p>
                  <div className="space-y-2">
                    {q.choices && q.choices.map((choice: any) => (
                      <label
                        key={choice.id}
                        className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors"
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={choice.id}
                          checked={answers[q.id] === choice.id}
                          onChange={() =>
                            handleSelectAnswer(q.id, choice.id)
                          }
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="ml-3 text-gray-700">
                          {choice.text}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 빈칸 문제 - Complete Words */}
          {currentProblem.type === "complete_words" && (currentProblem as any).blanks && (
            <div className="border-t pt-6">
              <p className="text-sm text-gray-600 mb-4">
                아래의 빈칸에 맞는 단어를 입력하세요:
              </p>
              <div className="space-y-3">
                {(currentProblem as any).blanks.map((blank: any) => {
                  const key = `cw__${currentProblem.id}__${blank.id}`;
                  return (
                    <div key={blank.id} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700 min-w-24">
                        Blank {blank.order}:
                      </span>
                      <input
                        type="text"
                        placeholder="답변 입력"
                        value={answers[key] || ""}
                        onChange={(e) => handleSelectAnswer(key, e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 네비게이션 */}
        <div className="flex flex-col gap-2">
          {submitError && (
            <p className="text-sm text-red-600 text-right">{submitError}</p>
          )}
          <div className="flex gap-3 justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← 이전
            </button>

            <div className="flex gap-2">
              {currentIndex === totalProblems - 1 && (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50"
                >
                  {submitting ? "제출 중..." : "제출하기 ✓"}
                </button>
              )}
              {currentIndex < totalProblems - 1 && (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  다음 →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
