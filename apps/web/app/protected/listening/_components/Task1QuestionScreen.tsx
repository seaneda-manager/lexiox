"use client";

import { useState, useEffect, useRef } from "react";
import StudyAudioPlayer from "./StudyAudioPlayer";
import type { ScriptSegment } from "@/models/listening";

interface Choice {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Task1QuestionScreenProps {
  currentQuestion: number;
  totalQuestions: number;
  audioUrl: string;
  choices: Choice[];
  maxTime?: number; // in seconds (default: 20, spec range 15-30)
  onNext: (selectedChoiceIndex: number) => void;
  onTimeUp?: () => void;
  /** test: 1회 자동재생·카운트다운 / study: 반복 재생·스크립트·뒤로가기 */
  mode?: "test" | "study";
  initialChoiceIndex?: number | null;
  onBack?: () => void;
  transcript?: string;
  scriptSegments?: ScriptSegment[];
}

export default function Task1QuestionScreen({
  currentQuestion,
  totalQuestions,
  audioUrl,
  choices,
  maxTime = 20,
  onNext,
  onTimeUp,
  mode = "test",
  initialChoiceIndex = null,
  onBack,
  transcript,
  scriptSegments,
}: Task1QuestionScreenProps) {
  const isStudy = mode === "study";
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(initialChoiceIndex);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(maxTime);
  const [audioHasPlayed, setAudioHasPlayed] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // 타이머: 오디오가 끝나기 전까지는 카운트다운하지 않는다 (스펙: 재생 중엔 타이머 정지)
  // study 모드는 시간 제약이 없으므로 아예 돌리지 않는다.
  useEffect(() => {
    if (isStudy) return;
    if (!audioHasPlayed) return;

    if (timeLeft <= 0) {
      onTimeUp?.();
      onNext(selectedChoiceIndex ?? -1);
      return;
    }

    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [isStudy, audioHasPlayed, timeLeft, selectedChoiceIndex, onNext, onTimeUp]);

  // Auto-play audio on mount (test 모드 전용 — study는 StudyAudioPlayer가 담당)
  useEffect(() => {
    if (isStudy) return;
    if (audioRef.current && !audioHasPlayed) {
      audioRef.current.play().catch((err) => {
        console.error("Audio playback error:", err);
        setIsAudioPlaying(false);
      });
      setIsAudioPlaying(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStudy]);

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

  // study에서는 언제든 답을 고치고 다시 들을 수 있어야 한다.
  const isChoicesDisabled = isStudy ? false : isAudioPlaying || !audioHasPlayed;

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
              Listen and choose the best response
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
                  audioHasPlayed && timeLeft <= 5 ? "text-red-600" : "text-blue-600"
                }`}>
                  {audioHasPlayed ? formatTime(timeLeft) : "--:--"}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - centered */}
      <main className="flex-1 flex items-center justify-center px-8 py-8">
        <div className="w-full max-w-2xl space-y-8">
          {/* Audio: study는 반복 재생 + 스크립트, test는 상태 표시만 */}
          {isStudy ? (
            <div className="flex justify-center">
              <StudyAudioPlayer
                audioUrl={audioUrl}
                transcript={transcript}
                scriptSegments={scriptSegments}
                autoPlay
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <div className={`flex h-32 w-32 items-center justify-center rounded-full text-5xl transition-all ${
                isAudioPlaying ? "bg-blue-100 animate-pulse" : "bg-gray-100"
              }`}>
                🔊
              </div>
              <div className="mt-4 text-center text-sm text-gray-500">
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
          )}

          {/* Instruction */}
          <p className="text-center text-sm font-medium text-gray-600">
            가장 적절한 응답을 고르세요.
          </p>

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

          {/* Help Text (test 모드 전용) */}
          {!isStudy && isAudioPlaying && (
            <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded border border-amber-200 text-center">
              Listen to the audio. You can select your answer after it finishes playing.
            </div>
          )}

          {!isStudy && !audioHasPlayed && !isAudioPlaying && (
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-200 text-center">
              Audio will play automatically. Please wait and listen carefully.
            </div>
          )}
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

      {/* Hidden Audio (test 모드 전용) */}
      {!isStudy && (
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
      )}
    </div>
  );
}
