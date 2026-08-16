"use client";

import Link from "next/link";
import type { TestSubmitResponse, VocabTestQuestion } from "@/models/vocab/test.types";

export interface TestResultsScreenProps {
  results: TestSubmitResponse;
  questions: VocabTestQuestion[];
  onRetry: () => void;
  onHome: () => void;
}

const questionTypeLabel: Record<string, string> = {
  word_to_meaning: "단어→뜻",
  meaning_to_word: "뜻→단어",
  synonym: "동의어",
  listening: "듣기",
};

function readableAnswer(q: VocabTestQuestion, raw: string | null): string {
  if (!raw) return "(답변 없음)";
  return q.options?.find((o) => o.id === raw)?.text ?? raw;
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
      <div className={`${getScoreBg(results.score)} rounded-xl p-8 max-w-md w-full`}>
        <p className="text-gray-600 text-sm mb-4 text-center">시험 완료</p>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500 mb-1">점수</p>
            <div className={`text-3xl font-bold ${getScoreColor(results.score)}`}>
              {results.total_points}점
            </div>
            <p className="text-xs text-gray-500 mt-1">{results.max_points}점 만점</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">맞은 단어 수</p>
            <div className="text-3xl font-bold text-gray-800">
              {results.correct_count} / {results.total_count}
            </div>
            <p className="text-xs text-gray-500 mt-1">정답률 {results.score}%</p>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-4 text-center">
          최고 연속 🔥{results.best_streak} · 힌트 {results.hints_used}회 · 소요 시간{" "}
          {Math.floor(results.duration_seconds / 60)}분 {results.duration_seconds % 60}초
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
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        ({questionTypeLabel[q.question_type] || q.question_type})
                      </span>
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      내 답: {readableAnswer(q, q.student_answer)}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-green-600">
                  정답: {readableAnswer(q, q.correct_answer)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex flex-col gap-3 w-full max-w-md">
        <div className="flex gap-4">
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
        <Link
          href="/vocab/scoreboard"
          className="w-full text-center px-6 py-3 bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold rounded-lg transition"
        >
          🏆 랭킹 보기
        </Link>
      </div>
    </div>
  );
}
