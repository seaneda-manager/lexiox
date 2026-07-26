"use client";

import { useState, useEffect, useRef } from "react";

interface Choice {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Task1QuestionScreenProps {
  currentQuestion: number;
  totalQuestions: number;
  audioUrl: string;
  question: string;
  choices: Choice[];
  maxTime?: number; // in seconds (default: 15)
  speakerImageUrl?: string;
  onNext: (selectedChoiceIndex: number) => void;
  onTimeUp?: () => void;
}

export default function Task1QuestionScreen({
  currentQuestion,
  totalQuestions,
  audioUrl,
  question,
  choices,
  maxTime = 15,
  speakerImageUrl = "https://via.placeholder.com/300x300?text=Speaker",
  onNext,
  onTimeUp,
}: Task1QuestionScreenProps) {
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(maxTime);
  const [audioHasPlayed, setAudioHasPlayed] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && audioHasPlayed) {
      // Auto-advance when time is up
      onTimeUp?.();
      onNext(selectedChoiceIndex ?? -1);
    }
    return () => clearTimeout(timer);
  }, [timeLeft, audioHasPlayed, selectedChoiceIndex, onNext, onTimeUp]);

  // Auto-play audio on mount
  useEffect(() => {
    if (audioRef.current && !audioHasPlayed) {
      audioRef.current.play().catch((err) => {
        console.error("Audio playback error:", err);
        setIsAudioPlaying(false);
      });
      setIsAudioPlaying(true);
    }
  }, [audioHasPlayed]);

  const formatTime = (seconds: number) => {
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  };

  const handleAudioEnd = () => {
    setIsAudioPlaying(false);
    setAudioHasPlayed(true);
  };

  const handleChoiceSelect = (index: number) => {
    setSelectedChoiceIndex(index);
  };

  const handleNext = () => {
    if (selectedChoiceIndex !== null) {
      onNext(selectedChoiceIndex);
    }
  };

  const isChoicesDisabled = isAudioPlaying || !audioHasPlayed;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Header with Timer */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">
              Task 1 - Question {currentQuestion} of {totalQuestions}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Choose the best response
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-500">Time Left</div>
              <div className={`text-2xl font-bold font-mono ${
                timeLeft <= 5 ? "text-red-600" : "text-blue-600"
              }`}>
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - 2 Column Layout */}
      <main className="flex-1 flex items-center justify-center px-8 py-8">
        <div className="w-full max-w-5xl grid grid-cols-2 gap-8">
          {/* Left: Speaker Image */}
          <div className="flex flex-col items-center justify-center">
            <div className="rounded-2xl overflow-hidden shadow-lg mb-4">
              <img
                src={speakerImageUrl}
                alt="Speaker"
                className="w-80 h-80 object-cover bg-gray-200"
              />
            </div>
            <div className="text-center text-sm text-gray-500">
              {isAudioPlaying ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  Now playing...
                </span>
              ) : audioHasPlayed ? (
                <span className="text-green-600 font-semibold">✓ Audio played</span>
              ) : (
                <span>Ready to listen</span>
              )}
            </div>
          </div>

          {/* Right: Question and Choices */}
          <div className="flex flex-col justify-center space-y-8">
            {/* Question Box */}
            <div className="bg-white rounded-xl shadow-md p-6 border-2 border-blue-200">
              <p className="text-center text-lg font-semibold text-gray-900">
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
                  } ${isChoicesDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center mt-1">
                    <input
                      type="radio"
                      name="choice"
                      value={index}
                      checked={selectedChoiceIndex === index}
                      onChange={() => handleChoiceSelect(index)}
                      disabled={isChoicesDisabled}
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

            {/* Help Text */}
            {isAudioPlaying && (
              <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
                Listen to the audio. You can select your answer after it finishes playing.
              </div>
            )}

            {!audioHasPlayed && !isAudioPlaying && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-200">
                Audio will play automatically. Please wait and listen carefully.
              </div>
            )}
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

      {/* Hidden Audio */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={handleAudioEnd}
        onError={() => {
          console.error("Audio error");
          setIsAudioPlaying(false);
          setAudioHasPlayed(true);
        }}
      />
    </div>
  );
}
