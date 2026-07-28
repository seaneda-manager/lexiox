'use client';

import React, { useState, useEffect } from 'react';
import type { BlankWord, BlankFillResult, SentenceWithBlanks } from './utils';
import { isCorrectAnswer } from './utils';

interface BlankFillQuestionProps {
  sentence: SentenceWithBlanks;
  questionNumber: number;
  totalQuestions: number;
  onAnswersSubmit: (results: BlankFillResult[]) => void;
  disabled?: boolean;
}

export default function BlankFillQuestion({
  sentence,
  questionNumber,
  totalQuestions,
  onAnswersSubmit,
  disabled = false,
}: BlankFillQuestionProps) {
  const blankWords = sentence.blankWords;
  const [userInputs, setUserInputs] = useState<Record<string, string>>(
    Object.fromEntries(blankWords.map((w) => [w.id, ""]))
  );
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<BlankFillResult[]>([]);

  const handleInputChange = (wordId: string, value: string) => {
    if (!submitted) {
      setUserInputs({ ...userInputs, [wordId]: value });
    }
  };

  const handleSubmit = () => {
    const newResults: BlankFillResult[] = blankWords.map((bw) => {
      const correct = isCorrectAnswer(userInputs[bw.id], bw.blank);
      return {
        wordId: bw.id,
        word: bw.word,
        userAnswer: userInputs[bw.id],
        correct,
      };
    });
    setResults(newResults);
    setSubmitted(true);
    onAnswersSubmit(newResults);
  };

  const allAnswered = blankWords.every((w) => userInputs[w.id].trim().length > 0);
  const correctCount = results.filter((r) => r.correct).length;

  return (
    <div className="rounded-2xl border bg-white p-6">
      {/* 문제 번호 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-500">
          문장 {questionNumber} / {totalQuestions}
        </div>
        <div className="text-xs text-slate-400">{blankWords.length}개 단어 채우기</div>
      </div>

      {/* 문장 텍스트 (블랭킹 포함) */}
      <div className="mb-6 rounded-lg bg-slate-50 p-4 text-lg leading-relaxed">
        {sentence.parts.map((part, idx) => {
          if (part.blankWord) {
            return (
              <span key={`${part.blankWord.id}-${idx}`} className="inline">
                <span className="font-semibold text-slate-900">
                  {part.blankWord.prefix}
                </span>
                <span className="inline-block w-20 border-b-2 border-blue-400 text-center text-slate-300">
                  ________
                </span>
              </span>
            );
          }
          return (
            <span key={idx} className="text-slate-900">
              {part.text}
            </span>
          );
        })}
      </div>

      {/* 입력 필드들 */}
      <div className="mb-6 space-y-3">
        {blankWords.map((bw, idx) => (
          <div key={bw.id}>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              {idx + 1}. {bw.prefix}________
            </label>
            <input
              type="text"
              value={userInputs[bw.id]}
              onChange={(e) => handleInputChange(bw.id, e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && allAnswered && !submitted) {
                  handleSubmit();
                }
              }}
              disabled={submitted || disabled}
              placeholder="입력..."
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
            />
            {submitted && (
              <div className="mt-1 text-xs">
                {results.find((r) => r.wordId === bw.id)?.correct ? (
                  <span className="text-emerald-600">✅ 정답</span>
                ) : (
                  <span className="text-amber-600">
                    ❌ 오답 (정답: {bw.blank})
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 제출 버튼 */}
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || disabled}
          className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
        >
          확인
        </button>
      )}

      {/* 결과 요약 */}
      {submitted && (
        <div className="rounded-lg bg-blue-50 p-4 text-center">
          <div className="text-2xl font-bold text-blue-900">
            {correctCount} / {blankWords.length}
          </div>
        </div>
      )}
    </div>
  );
}
