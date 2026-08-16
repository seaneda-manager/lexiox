"use client";

import { useEffect, useRef, useState } from "react";
import type { VocabTestQuestion } from "@/models/vocab/test.types";
import { hintsAllowed, basePointsFor, MAX_HINT_LEVEL } from "@/lib/vocab/test/scoring";

export interface TestQuestionPanelProps {
  question: VocabTestQuestion;
  questionNumber: number;
  totalQuestions: number;
  sessionPoints: number;
  correctCount: number;
  streak: number;
  hintReveal?: string;
  onAnswerSubmit: (answer: string) => void;
  onUseHint: () => void;
  onSubmitTest: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function TestQuestionPanel({
  question,
  questionNumber,
  totalQuestions,
  sessionPoints,
  correctCount,
  streak,
  hintReveal,
  onAnswerSubmit,
  onUseHint,
  onSubmitTest,
  onNext,
  onPrev,
}: TestQuestionPanelProps) {
  const [answer, setAnswer] = useState(question.student_answer || "");
  const primaryButtonRef = useRef<HTMLButtonElement>(null);

  const isAnswered = question.is_correct !== null;
  const isLast = questionNumber === totalQuestions;
  const isFirst = questionNumber === 1;
  const canHint = hintsAllowed(question.question_type);
  const hintLevel = question.hint_level ?? 0;
  const isSubjective =
    question.question_type === "word_to_meaning" ||
    question.question_type === "meaning_to_word";

  const handleSubmitAnswer = () => {
    if (answer.trim()) {
      onAnswerSubmit(answer);
    }
  };

  // 답변이 채점되면 기본 버튼(다음/시험 제출)에 포커스를 줘서 Enter로 바로 넘어갈 수 있게 함
  useEffect(() => {
    if (isAnswered) {
      primaryButtonRef.current?.focus();
    }
  }, [isAnswered]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      {/* 진행률 + 점수/연속정답 */}
      <div className="space-y-3">
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
        <div className="flex items-center gap-4 text-sm">
          <span className="font-semibold text-blue-700">점수 {sessionPoints}점</span>
          <span className="font-semibold text-gray-700">
            맞은 단어 {correctCount} / {totalQuestions}
          </span>
          {streak >= 2 && (
            <span className="font-semibold text-orange-600 animate-pulse">
              🔥 연속 {streak}
            </span>
          )}
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
                  disabled={isAnswered}
                  className={`p-3 text-left rounded-lg border-2 transition disabled:cursor-not-allowed ${
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

      {/* 힌트 (주관식만) */}
      {!isAnswered && canHint && (
        <div className="space-y-2">
          <button
            onClick={onUseHint}
            disabled={hintLevel >= MAX_HINT_LEVEL}
            className="text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:bg-gray-100 disabled:text-gray-400 border border-amber-200 disabled:border-gray-200 rounded-lg px-3 py-1.5 transition"
          >
            💡 힌트 ({hintLevel}/{MAX_HINT_LEVEL})
            {hintLevel < MAX_HINT_LEVEL && (
              <span className="ml-1 text-xs font-normal">
                — 만점 {basePointsFor(0)}점, 지금 쓰면 {basePointsFor(hintLevel + 1)}점
              </span>
            )}
          </button>
          {hintReveal && (
            <p className="font-mono text-lg tracking-widest text-amber-800">{hintReveal}</p>
          )}
        </div>
      )}

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
            autoComplete="off"
            className="w-full px-4 py-3 border-2 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
          />
        </div>
      )}

      {/* 채점 결과 (주관식 + 객관식 공통) */}
      {isAnswered && (
        <div
          className={`p-3 rounded-lg text-sm font-medium ${
            question.is_correct
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {question.is_correct ? (
            <>
              ✓ 정답! +{question.points_earned ?? 0}점
              {(question.streak_bonus ?? 0) > 0 && (
                <div className="mt-1 text-xs font-normal">
                  기본 {(question.points_earned ?? 0) - (question.streak_bonus ?? 0)}점 · 연속 보너스 +{question.streak_bonus}점
                </div>
              )}
            </>
          ) : (
            <>
              ✕ 오답 (0점)
              {question.question_type === "word_to_meaning" && question.meaning_ko?.length ? (
                <div className="mt-1 text-xs">정답: {question.meaning_ko.join(" / ")}</div>
              ) : (
                question.correct_answer && (
                  <div className="mt-1 text-xs">정답: {question.correct_answer}</div>
                )
              )}
            </>
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

        <button
          ref={primaryButtonRef}
          onClick={
            !isAnswered
              ? handleSubmitAnswer
              : isLast
                ? onSubmitTest
                : onNext
          }
          disabled={!isAnswered && (isSubjective ? !answer.trim() : true)}
          className={`flex-1 px-4 py-2 text-white font-semibold rounded-lg transition disabled:bg-gray-300 ${
            isAnswered
              ? isLast
                ? "bg-green-500 hover:bg-green-600"
                : "bg-blue-500 hover:bg-blue-600"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {!isAnswered ? "답변 제출" : isLast ? "시험 제출" : "다음 →"}
        </button>
      </div>
    </div>
  );
}
