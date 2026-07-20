"use client";

import React, { useState, useRef, useEffect } from "react";

type TextFlashcardProps = {
  wordId: string;
  word: string;
  pos: string;
  meanings: string[];
  onComplete: (points: number) => void;
};

export function TextFlashcard({
  wordId,
  word,
  pos,
  meanings,
  onComplete,
}: TextFlashcardProps) {
  const [stage, setStage] = useState<"intro" | "attempt" | "complete">("intro");
  const [attempts, setAttempts] = useState<string[]>([]);
  const [currentAttempt, setCurrentAttempt] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const meainingDisplay = meanings.slice(0, 2).join(", ");

  const handleStartClick = () => {
    setStage("attempt");
    setAttempts([]);
    setCurrentAttempt("");
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "v" || e.key === "x")) {
      e.preventDefault();
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSubmitAttempt = () => {
    const normalized = currentAttempt.trim().toLowerCase();
    const correct = normalized === word.toLowerCase();

    const newAttempts = [...attempts, currentAttempt];
    setAttempts(newAttempts);

    if (correct) {
      setIsCorrect(true);
      const points = 5 - Math.max(0, newAttempts.length - 1);
      onComplete(points);
      setStage("complete");
    } else {
      if (newAttempts.length >= 3) {
        setStage("complete");
        onComplete(0);
      } else {
        setCurrentAttempt("");
      }
    }
  };

  const renderInputLabel = () => {
    if (attempts.length === 0) return "입력 1/3 (정답 표시)";
    if (attempts.length === 1) return "입력 2/3 (첫 글자만 표시)";
    return "입력 3/3 (완전 암기)";
  };

  const renderHint = () => {
    if (attempts.length === 0) return word;
    if (attempts.length === 1) return word[0] + "*".repeat(word.length - 1);
    return "";
  };

  if (stage === "intro") {
    return (
      <div className="rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <div className="inline-block px-3 py-1 bg-slate-100 text-sm font-semibold text-slate-700 rounded">
            [{pos}]
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{word}</p>
          <p className="mt-1 text-slate-600">{meainingDisplay}</p>
        </div>

        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 단어를 3번 정확하게 입력하세요. (Copy/Paste 불가)
          </p>
        </div>

        <button
          onClick={handleStartClick}
          className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-3 text-white font-semibold transition"
        >
          ▶️ 시작하기
        </button>
      </div>
    );
  }

  if (stage === "complete") {
    return (
      <div className="rounded-2xl border-2 border-emerald-300 bg-white p-6 shadow-sm">
        <div className="mb-4">
          {isCorrect ? (
            <div className="text-center">
              <p className="text-4xl mb-2">🎉</p>
              <p className="text-xl font-bold text-emerald-700">완벽합니다!</p>
              <p className="text-sm text-slate-600 mt-2">
                {attempts.length}회 시도 후 정답
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-4xl mb-2">❌</p>
              <p className="text-xl font-bold text-red-700">3회 시도 완료</p>
              <p className="text-sm text-slate-600 mt-2">
                정답: <span className="font-semibold">{word}</span>
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleStartClick}
          className="w-full rounded-lg bg-slate-600 hover:bg-slate-700 px-4 py-3 text-white font-semibold transition"
        >
          🔄 다시 하기
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-blue-300 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-600">{renderInputLabel()}</p>
          <p className="text-lg font-bold text-slate-900 mt-1">{word}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">시도 {attempts.length + 1}/3</p>
          <div className="flex gap-1 mt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < attempts.length ? "bg-blue-600" : "bg-slate-300"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-600 mb-2">
          단어 입력 ({renderHint()})
        </label>
        <textarea
          ref={textareaRef}
          value={currentAttempt}
          onChange={(e) => setCurrentAttempt(e.target.value)}
          onContextMenu={handleContextMenu}
          onKeyDown={handleKeyDown}
          onDragStart={handleDragStart}
          placeholder="단어를 입력하세요..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          rows={2}
        />
        <p className="text-xs text-slate-500 mt-1">
          우클릭, Ctrl+C/V, 드래그 모두 차단됨
        </p>
      </div>

      {attempts.length > 0 && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
          <p className="text-xs font-semibold text-slate-600 mb-2">이전 시도:</p>
          <div className="space-y-1">
            {attempts.map((attempt, idx) => (
              <p key={idx} className="text-sm text-slate-600">
                시도 {idx + 1}: <span className="font-medium">{attempt || "(비어있음)"}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleSubmitAttempt}
        disabled={!currentAttempt.trim()}
        className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 px-4 py-3 text-white font-semibold transition"
      >
        ✓ 확인
      </button>
    </div>
  );
}
