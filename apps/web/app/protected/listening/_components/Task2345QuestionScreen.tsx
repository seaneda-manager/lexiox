"use client";

import { useState, useEffect } from "react";
import StudyAudioPlayer from "./StudyAudioPlayer";
import type { ScriptSegment } from "@/models/listening";

interface Choice {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Task2345QuestionScreenProps {
  taskNumber: number;
  taskKind: "conversation" | "announcement" | "academic_talk";
  currentQuestion: number;
  totalQuestions: number;
  question: string;
  choices: Choice[];
  maxTime?: number; // in seconds (default: 40, spec range 35-45)
  onNext: (selectedChoiceIndex: number) => void;
  onTimeUp?: () => void;
  /** test: 문항별 카운트다운·뒤로가기 불가 / study: 타이머 없음·뒤로가기·재청취·스크립트 */
  mode?: "test" | "study";
  /** study에서 돌아왔을 때 이전 답을 복원한다. */
  initialChoiceIndex?: number | null;
  onBack?: () => void;
  audioUrl?: string;
  transcript?: string;
  scriptSegments?: ScriptSegment[];
}

export default function Task2345QuestionScreen({
  taskNumber,
  taskKind,
  currentQuestion,
  totalQuestions,
  question,
  choices,
  maxTime = 40,
  onNext,
  onTimeUp,
  mode = "test",
  initialChoiceIndex = null,
  onBack,
  audioUrl,
  transcript,
  scriptSegments,
}: Task2345QuestionScreenProps) {
  const isStudy = mode === "study";
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(initialChoiceIndex);
  const [timeLeft, setTimeLeft] = useState(maxTime);

  // Timer effect. 부모가 문제마다 고유 key를 넘겨 컴포넌트를 새로 마운트시키므로
  // 여기서는 그냥 maxTime에서부터 새로 시작하면 된다.
  // study 모드는 시간 제약이 없으므로 타이머를 아예 돌리지 않는다.
  useEffect(() => {
    if (isStudy) return;
    if (timeLeft <= 0) {
      onTimeUp?.();
      onNext(selectedChoiceIndex ?? -1);
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [isStudy, timeLeft, selectedChoiceIndex, onNext, onTimeUp]);

  const formatTime = (seconds: number) => {
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  };

  const getTaskTitle = () => {
    switch (taskKind) {
      case "conversation":
        return "Conversation";
      case "announcement":
        return "Announcement";
      case "academic_talk":
        return "Academic Talk";
      default:
        return "Audio";
    }
  };

  const getTaskIcon = () => {
    switch (taskKind) {
      case "conversation":
        return "💬";
      case "announcement":
        return "📢";
      case "academic_talk":
        return "🎓";
      default:
        return "🎧";
    }
  };

  const handleNext = () => {
    if (selectedChoiceIndex !== null) {
      onNext(selectedChoiceIndex);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Header with Timer */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">
              Task {taskNumber} - Question {currentQuestion} of {totalQuestions}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {getTaskIcon()} {getTaskTitle()}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isStudy ? (
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                Study — 시간 제한 없음
              </div>
            ) : (
              <div className="text-center">
                <div className="text-xs text-gray-500">Time Left</div>
                <div className={`text-2xl font-bold font-mono ${
                  timeLeft <= 10 ? "text-red-600" : "text-blue-600"
                }`}>
                  {formatTime(timeLeft)}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - 2 Column Layout */}
      <main className="flex-1 flex items-center justify-center px-8 py-8">
        <div className="w-full max-w-5xl grid grid-cols-3 gap-8">
          {/* Left: task icon — study에서는 다시 듣기 + 스크립트 */}
          <div className="flex justify-center">
            {isStudy && audioUrl ? (
              <StudyAudioPlayer
                audioUrl={audioUrl}
                transcript={transcript}
                scriptSegments={scriptSegments}
              />
            ) : (
              <div className="flex h-56 w-56 items-center justify-center rounded-xl bg-blue-50 text-7xl shadow-lg">
                {getTaskIcon()}
              </div>
            )}
          </div>

          {/* Right: Question and Choices */}
          <div className="col-span-2 flex flex-col justify-center space-y-6">
            {/* Question Box */}
            <div className="bg-white rounded-xl shadow-md p-6 border-2 border-blue-200">
              <p className="text-lg font-semibold text-gray-900 leading-relaxed">
                {question}
              </p>
            </div>

            {/* Choices */}
            <div className="space-y-3">
              {choices.map((choice, index) => (
                <label
                  key={choice.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedChoiceIndex === index
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center mt-1">
                    <input
                      type="radio"
                      name="choice"
                      value={index}
                      checked={selectedChoiceIndex === index}
                      onChange={() => setSelectedChoiceIndex(index)}
                      className="w-5 h-5 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm leading-relaxed ${
                      selectedChoiceIndex === index
                        ? "text-blue-900 font-semibold"
                        : "text-gray-700"
                    }`}>
                      {choice.text}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-8 py-6 flex justify-between gap-4">
        {isStudy && onBack ? (
          <button
            onClick={onBack}
            className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
          >
            Back
          </button>
        ) : (
          <span />
        )}

        <button
          onClick={handleNext}
          disabled={selectedChoiceIndex === null}
          className={`px-8 py-3 font-semibold rounded-lg transition-colors shadow-md ${
            selectedChoiceIndex !== null
              ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          Next
        </button>
      </footer>
    </div>
  );
}
