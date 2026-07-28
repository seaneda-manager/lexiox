'use client';

import React, { useState, useMemo } from 'react';
import type { BlankFillResult, SentenceWithBlanks } from './utils';
import { createPassageWithBlanks } from './utils';
import BlankFillQuestion from './BlankFillQuestion';

interface BlankFillGameRunnerProps {
  passage: string; // 지문
  onComplete: (results: BlankFillResult[], wrongWords: string[]) => void;
  wordsPerSentence?: number; // 문장당 빈칭 단어 수 (기본 2)
}

export default function BlankFillGameRunner({
  passage,
  onComplete,
  wordsPerSentence = 2,
}: BlankFillGameRunnerProps) {
  const sentences = useMemo(() => {
    return createPassageWithBlanks(passage, wordsPerSentence);
  }, [passage, wordsPerSentence]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<BlankFillResult[]>([]);
  const [gameComplete, setGameComplete] = useState(false);

  const handleAnswerSubmit = (sentenceResults: BlankFillResult[]) => {
    const newResults = [...results, ...sentenceResults];
    setResults(newResults);

    // 다음 문장으로
    if (currentIndex < sentences.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 게임 완료
      setGameComplete(true);
      const wrongWords = newResults
        .filter((r) => !r.correct)
        .map((r) => r.word);
      onComplete(newResults, wrongWords);
    }
  };

  if (sentences.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-center">
        <div className="text-slate-600">
          문장을 추출할 수 없습니다. 더 긴 지문을 사용하세요.
        </div>
      </div>
    );
  }

  const currentSentence = sentences[currentIndex];
  const correctCount = results.filter((r) => r.correct).length;
  const totalCount = results.length;
  const accuracy =
    totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* 진행률 */}
      <div className="rounded-lg bg-slate-50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-700">
            진행: {currentIndex + 1} / {sentences.length} 문장
          </div>
          <div className="text-sm font-semibold text-emerald-600">
            정답: {correctCount}/{totalCount}
          </div>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${((currentIndex + 1) / sentences.length) * 100}%` }}
          />
        </div>
      </div>

      {/* 문제 */}
      {!gameComplete && (
        <BlankFillQuestion
          sentence={currentSentence}
          questionNumber={currentIndex + 1}
          totalQuestions={sentences.length}
          onAnswersSubmit={handleAnswerSubmit}
        />
      )}

      {/* 완료 화면 */}
      {gameComplete && (
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="mb-4 text-4xl">🎉</div>
          <div className="mb-4 text-2xl font-bold text-emerald-900">
            지문 학습 완료!
          </div>
          <div className="mb-6 space-y-2">
            <div className="text-lg">
              <span className="font-bold text-emerald-600">{correctCount}</span> /{' '}
              <span>{totalCount}</span> 정답
            </div>
            <div className="text-2xl font-bold text-emerald-600">
              정답률: {accuracy}%
            </div>
          </div>

          {results.filter((r) => !r.correct).length > 0 && (
            <div className="rounded-lg bg-white p-4 text-left">
              <div className="mb-3 font-semibold text-slate-900">
                틀린 단어 ({results.filter((r) => !r.correct).length}개)
              </div>
              <div className="space-y-2">
                {results
                  .filter((r) => !r.correct)
                  .map((r) => (
                    <div
                      key={r.wordId}
                      className="text-sm text-slate-600"
                    >
                      <span className="font-mono font-semibold">{r.word}</span>
                      {' '}(입력: <span className="text-amber-600">{r.userAnswer || '공백'}</span>)
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
