"use client";

import { useState, useEffect } from "react";

interface Choice {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Task2345QuestionScreenProps {
  taskNumber: 2 | 3 | 4;
  taskKind: "conversation" | "announcement" | "academic_talk";
  currentQuestion: number;
  totalQuestions: number;
  question: string;
  choices: Choice[];
  speakerImageUrl?: string;
  maxTime?: number; // in seconds (default: 45)
  onNext: (selectedChoiceIndex: number) => void;
  onTimeUp?: () => void;
}

export default function Task2345QuestionScreen({
  taskNumber,
  taskKind,
  currentQuestion,
  totalQuestions,
  question,
  choices,
  speakerImageUrl = "https://via.placeholder.com/250x250?text=Speaker",
  maxTime = 45,
  onNext,
  onTimeUp,
}: Task2345QuestionScreenProps) {
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(maxTime);

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Auto-advance when time is up
      onTimeUp?.();
      onNext(selectedChoiceIndex ?? -1);
    }
    return () => clearTimeout(timer);
  }, [timeLeft, selectedChoiceIndex, onNext, onTimeUp]);

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
            <div className="text-center">
              <div className="text-xs text-gray-500">Time Left</div>
              <div className={`text-2xl font-bold font-mono ${
                timeLeft <= 10 ? "text-red-600" : "text-blue-600"
              }`}>
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - 2 Column Layout */}
      <main className="flex-1 flex items-center justify-center px-8 py-8">
        <div className="w-full max-w-5xl grid grid-cols-3 gap-8">
          {/* Left: Speaker Image (Smaller) */}
          <div className="flex justify-center">
            <div className="rounded-xl overflow-hidden shadow-lg">
              <img
                src={speakerImageUrl}
                alt="Speaker"
                className="w-56 h-56 object-cover bg-gray-200"
              />
            </div>
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
      <footer className="bg-white border-t border-gray-200 px-8 py-6 flex justify-end gap-4">
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
