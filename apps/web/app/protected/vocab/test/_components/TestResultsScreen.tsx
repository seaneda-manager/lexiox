"use client";

import type { TestSubmitResponse, VocabTestQuestion } from "@/models/vocab/test.types";

export interface TestResultsScreenProps {
  results: TestSubmitResponse;
  questions: VocabTestQuestion[];
  onRetry: () => void;
  onHome: () => void;
}

export default function TestResultsScreen({
  results,
  questions,
  onRetry,
  onHome,
}: TestResultsScreenProps) {
  const wrongQuestions = questions.filter((q) => q.is_correct === false);

  const getScoreColor = (score: number) => {
    if (score === 100) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score === 100) return "bg-green-100";
    if (score >= 80) return "bg-blue-100";
    if (score >= 60) return "bg-yellow-100";
    return "bg-red-100";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      {/* 성적 표시 */}
      <div className={`${getScoreBg(results.score)} rounded-xl p-12 text-center max-w-md w-full`}>
        <p className="text-gray-600 text-sm mb-2">시험 완료</p>
        <div className={`text-5xl font-bold ${getScoreColor(results.score)} mb-2`}>
          {results.score}점
        </div>
        <p className="text-gray-600">
          {results.correct_count} / {results.total_count} 정답
        </p>
        <p className="text-sm text-gray-500 mt-2">
          소요 시간: {Math.floor(results.duration_seconds / 60)}분 {results.duration_seconds % 60}초
        </p>
      </div>

      {/* 오답 목록 */}
      {wrongQuestions.length > 0 && (
        <div className="w-full max-w-2xl space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            틀린 문제 ({wrongQuestions.length}개)
          </h3>
          <div className="space-y-3">
            {wrongQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="bg-red-50 border border-red-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">
                      {idx + 1}. {q.word_text}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      내 답: {q.student_answer}
                    </p>
                  </div>
                </div>
                {q.correct_answer && (
                  <p className="text-sm text-green-600">
                    정답: {q.correct_answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-4 w-full max-w-md">
        <button
          onClick={onHome}
          className="flex-1 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition"
        >
          홈으로
        </button>
        <button
          onClick={onRetry}
          className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition"
        >
          다시 풀기
        </button>
      </div>
    </div>
  );
}
