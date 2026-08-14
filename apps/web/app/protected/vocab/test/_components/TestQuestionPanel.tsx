"use client";

import { useState } from "react";
import type { VocabTestQuestion } from "@/models/vocab/test.types";

export interface TestQuestionPanelProps {
  question: VocabTestQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswerSubmit: (answer: string) => void;
  onSubmitTest: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function TestQuestionPanel({
  question,
  questionNumber,
  totalQuestions,
  onAnswerSubmit,
  onSubmitTest,
  onNext,
  onPrev,
}: TestQuestionPanelProps) {
  const [answer, setAnswer] = useState(question.student_answer || "");

  const isAnswered = question.is_correct !== null;
  const isLast = questionNumber === totalQuestions;
  const isFirst = questionNumber === 1;

  const handleSubmitAnswer = () => {
    if (answer.trim()) {
      onAnswerSubmit(answer);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      {/* 진행률 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">
          문제 {questionNumber} / {totalQuestions}
        </span>
        <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* 문제 제목 */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">
          {question.question_type === "word_to_meaning" && "단어의 뜻을 입력하세요"}
          {question.question_type === "meaning_to_word" && "뜻에 맞는 단어를 입력하세요"}
          {question.question_type === "synonym" && "가장 가까운 의미의 단어를 선택하세요"}
          {question.question_type === "listening" && "들으신 내용의 뜻을 선택하세요"}
        </h2>
      </div>

      {/* 문제 내용 */}
      <div className="bg-blue-50 rounded-lg p-6 space-y-4">
        {(question.question_type === "word_to_meaning" ||
          question.question_type === "meaning_to_word") && (
          <div className="text-center">
            {question.question_type === "word_to_meaning" && (
              <>
                <p className="text-sm text-gray-600">단어</p>
                <p className="text-2xl font-bold text-blue-600">{question.word_text}</p>
              </>
            )}
            {question.question_type === "meaning_to_word" && (
              <>
                <p className="text-sm text-gray-600">뜻</p>
                <p className="text-lg font-semibold text-blue-600">
                  {question.meaning_ko?.[0] || ""}
                </p>
              </>
            )}
          </div>
        )}

        {(question.question_type === "synonym" ||
          question.question_type === "listening") && (
          <>
            {question.question_type === "synonym" && (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">단어</p>
                <p className="text-2xl font-bold text-blue-600">{question.word_text}</p>
              </div>
            )}

            {question.question_type === "listening" && question.audio_url && (
              <div className="text-center">
                <audio controls className="w-full mb-4">
                  <source src={question.audio_url} type="audio/mp3" />
                </audio>
                <p className="text-sm text-gray-600">위 오디오를 들으신 후 뜻을 선택하세요</p>
              </div>
            )}

            {/* 객관식 선택지 */}
            <div className="grid grid-cols-1 gap-3 mt-4">
              {question.options?.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setAnswer(option.id);
                    onAnswerSubmit(option.id);
                  }}
                  className={`p-3 text-left rounded-lg border-2 transition ${
                    answer === option.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  } ${
                    isAnswered && option.is_correct
                      ? "border-green-500 bg-green-50"
                      : ""
                  } ${
                    isAnswered && answer === option.id && !option.is_correct
                      ? "border-red-500 bg-red-50"
                      : ""
                  }`}
                >
                  <div className="font-medium text-gray-900">{option.text}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 주관식 입력 */}
      {(question.question_type === "word_to_meaning" ||
        question.question_type === "meaning_to_word") && (
        <div className="space-y-3">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") handleSubmitAnswer();
            }}
            placeholder="답변을 입력하세요"
            disabled={isAnswered}
            className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
          />

          {isAnswered && (
            <div
              className={`p-3 rounded-lg text-sm font-medium ${
                question.is_correct
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {question.is_correct ? "✓ 정답입니다!" : "✕ 틀렸습니다"}
              {!question.is_correct && question.correct_answer && (
                <div className="mt-1 text-xs">정답: {question.correct_answer}</div>
              )}
            </div>
          )}

          {!isAnswered && (
            <button
              onClick={handleSubmitAnswer}
              disabled={!answer.trim()}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold py-2 rounded-lg transition"
            >
              답변 제출
            </button>
          )}
        </div>
      )}

      {/* 네비게이션 */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={onPrev}
          disabled={isFirst}
          className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-800 font-semibold rounded-lg transition"
        >
          ← 이전
        </button>

        {isLast ? (
          <button
            onClick={onSubmitTest}
            className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition"
          >
            시험 제출
          </button>
        ) : (
          <button
            onClick={onNext}
            className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition"
          >
            다음 →
          </button>
        )}
      </div>
    </div>
  );
}
