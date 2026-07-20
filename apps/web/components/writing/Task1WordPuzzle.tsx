'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * Task 1: Build a Sentence (Word Puzzle Engine)
 *
 * M2 구현:
 * ✅ Scrambled 단어 토큰 렌더링 (무작위 순서)
 * ✅ 클릭으로 Answer Area에 순서대로 배치
 * ✅ 배치된 단어 제거 (클릭 또는 backspace)
 * ✅ 정답 문자열과 일치도 검증
 */

interface Task1WordPuzzleProps {
  prompt: string;
  correctAnswer: string;
  wordTokens: string[]; // 단어 조각 배열 (예: ["He", "decided", "to", "postpone", "the", "test", ...])
  onAnswerChange: (userAnswer: string, tokens: string[]) => void;
  onCorrect: (isCorrect: boolean) => void;
  timeLimit?: number; // 초 단위
}

export default function Task1WordPuzzle({
  prompt,
  correctAnswer,
  wordTokens,
  onAnswerChange,
  onCorrect,
  timeLimit = 45,
}: Task1WordPuzzleProps) {
  const [scrambledTokens, setScrambledTokens] = useState<string[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  // 1️⃣ 마운트 시 단어 셔플
  useEffect(() => {
    if (wordTokens.length > 0) {
      const shuffled = [...wordTokens].sort(() => Math.random() - 0.5);
      setScrambledTokens(shuffled);
    }
  }, [wordTokens]);

  // 2️⃣ 사용자의 답변 구성
  const userAnswer = selectedTokens.join(' ');

  // 3️⃣ 클릭 시 토큰 추가
  const handleTokenClick = useCallback((token: string) => {
    if (isAnswered) return;
    if (selectedTokens.includes(token)) return; // 이미 선택된 단어는 다시 클릭 불가

    setSelectedTokens((prev) => [...prev, token]);
  }, [isAnswered, selectedTokens]);

  // 4️⃣ 배치된 토큰 클릭 시 제거 (Undo)
  const handleRemoveToken = useCallback((index: number) => {
    if (isAnswered) return;
    setSelectedTokens((prev) => prev.filter((_, i) => i !== index));
  }, [isAnswered]);

  // 5️⃣ 정답 검증
  const validateAnswer = useCallback(() => {
    const isCorrect = userAnswer.trim() === correctAnswer.trim();
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setIsAnswered(true);
    onCorrect(isCorrect);
  }, [userAnswer, correctAnswer, onCorrect]);

  // 6️⃣ Clear (모든 선택 취소)
  const handleClear = useCallback(() => {
    if (isAnswered) return;
    setSelectedTokens([]);
  }, [isAnswered]);

  // 7️⃣ Answer Area 업데이트 콜백
  useEffect(() => {
    onAnswerChange(userAnswer, selectedTokens);
  }, [userAnswer, selectedTokens]);

  return (
    <div className="space-y-4 rounded-lg border border-indigo-200 bg-indigo-50 p-6">
      {/* 프롬프트 섹션 */}
      <div className="space-y-2 bg-white rounded-lg p-4 border border-indigo-100">
        <p className="text-xs font-semibold text-gray-500 uppercase">Speaker A:</p>
        <p className="text-sm leading-relaxed text-gray-900">"{prompt}"</p>
      </div>

      {/* Answer Area */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-600">Your Answer:</p>
        <div className="min-h-16 rounded-lg border-2 border-dashed border-indigo-300 bg-white p-4 space-y-2">
          {selectedTokens.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Tap words below to build your sentence...</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedTokens.map((token, idx) => (
                <button
                  key={`${token}-${idx}`}
                  onClick={() => handleRemoveToken(idx)}
                  disabled={isAnswered}
                  className={`px-3 py-1 rounded-lg font-semibold text-sm transition ${
                    isAnswered
                      ? 'bg-indigo-100 text-indigo-700 cursor-default'
                      : 'bg-indigo-500 text-white hover:bg-indigo-600 cursor-pointer'
                  }`}
                  title="Click to remove"
                >
                  {token}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-600">
            {selectedTokens.length}/{wordTokens.length} words selected
          </p>
        </div>
      </div>

      {/* Word Tokens */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-600">Word Tokens:</p>
        <div className="flex flex-wrap gap-2 rounded-lg border border-indigo-200 bg-white p-4 min-h-12">
          {scrambledTokens.map((token, idx) => {
            const isSelected = selectedTokens.includes(token);
            return (
              <button
                key={`token-${idx}-${token}`}
                onClick={() => handleTokenClick(token)}
                disabled={isAnswered || isSelected}
                className={`px-3 py-1.5 rounded-lg font-medium text-sm transition ${
                  isSelected
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                    : isAnswered
                      ? 'bg-gray-100 text-gray-500 cursor-default'
                      : 'bg-gray-200 text-gray-900 hover:bg-indigo-300 hover:text-indigo-900 cursor-pointer'
                }`}
              >
                {token}
              </button>
            );
          })}
        </div>
      </div>

      {/* 피드백 및 버튼 */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex-1 space-y-1">
          {feedback && (
            <div className={`text-sm font-semibold ${
              feedback === 'correct' ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {feedback === 'correct' ? '✓ Correct!' : '✗ Incorrect. Try again.'}
            </div>
          )}
          {!isAnswered && userAnswer && (
            <p className="text-xs text-gray-600">
              Your answer: <span className="font-mono">{userAnswer}</span>
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {!isAnswered && (
            <>
              <button
                onClick={handleClear}
                disabled={selectedTokens.length === 0}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear
              </button>
              <button
                onClick={validateAnswer}
                disabled={selectedTokens.length === 0}
                className="px-4 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Check Answer
              </button>
            </>
          )}
          {isAnswered && feedback === 'incorrect' && (
            <button
              onClick={() => {
                setFeedback(null);
                setIsAnswered(false);
                setScrambledTokens([...wordTokens].sort(() => Math.random() - 0.5));
                setSelectedTokens([]);
              }}
              className="px-4 py-1.5 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-700"
            >
              Try Again
            </button>
          )}
        </div>
      </div>

      {/* 정답 표시 (피드백 후) */}
      {feedback === 'incorrect' && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 space-y-1">
          <p className="text-xs font-semibold text-rose-700">Correct Answer:</p>
          <p className="text-sm font-mono text-rose-900">{correctAnswer}</p>
        </div>
      )}
    </div>
  );
}
