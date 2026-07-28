'use client';

import React, { useState } from 'react';
import BlankFillGameRunner from './BlankFillGameRunner';
import type { BlankFillResult } from './utils';
import { TextFlashcard } from '@/app/protected/vocab/homework/text-flashcard';

const SAMPLE_PASSAGE = `The evolution of technology has fundamentally transformed how we communicate,
work, and learn. The internet, which emerged from military and academic research in the 1970s,
has become an indispensable tool for billions of people worldwide. Social media platforms have
revolutionized personal connections, enabling individuals to share experiences instantaneously
across continents. Nevertheless, this digital transformation has also introduced unprecedented
challenges regarding privacy, security, and mental health. Despite these concerns, the momentum
of technological advancement shows no signs of slowing, with artificial intelligence and
quantum computing promising revolutionary changes in the coming decades.`;

export default function BlankFillGamePage() {
  const [stage, setStage] = useState<'game' | 'flashcard' | 'complete'>('game');
  const [results, setResults] = useState<BlankFillResult[]>([]);
  const [wrongWords, setWrongWords] = useState<string[]>([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);

  const handleGameComplete = (gameResults: BlankFillResult[], wrong: string[]) => {
    setResults(gameResults);
    setWrongWords(wrong);
    console.log('게임 완료:', { gameResults, wrong });

    if (wrong.length > 0) {
      setStage('flashcard');
      setCurrentFlashcardIndex(0);
    } else {
      setStage('complete');
    }
  };

  const handleFlashcardComplete = (points: number) => {
    setTotalPoints(prev => prev + points);

    if (currentFlashcardIndex < wrongWords.length - 1) {
      setCurrentFlashcardIndex(prev => prev + 1);
    } else {
      setStage('complete');
    }
  };

  const handleReturnToGame = () => {
    setStage('game');
    setResults([]);
    setWrongWords([]);
    setCurrentFlashcardIndex(0);
    setTotalPoints(0);
  };

  // 게임 화면
  if (stage === 'game') {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reading - 단어 채우기 게임</h1>
          <p className="mt-2 text-slate-600">
            지문에서 단어의 일부가 빈칸으로 표시됩니다. 빈 부분을 완성하세요.
          </p>
        </div>

        <div className="rounded-2xl border bg-slate-50 p-6">
          <h2 className="mb-4 font-semibold text-slate-900">지문</h2>
          <p className="leading-relaxed text-slate-700">
            {SAMPLE_PASSAGE}
          </p>
        </div>

        <BlankFillGameRunner
          passage={SAMPLE_PASSAGE}
          onComplete={handleGameComplete}
        />
      </div>
    );
  }

  // 깜지 화면
  if (stage === 'flashcard' && wrongWords.length > 0) {
    const currentWord = wrongWords[currentFlashcardIndex];

    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">오답 복습 - 깜지</h1>
          <p className="mt-2 text-slate-600">
            틀린 단어들을 복습합니다. 정확하게 입력하면 포인트를 얻습니다!
          </p>
        </div>

        <div className="rounded-lg bg-slate-100 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-700">
              진행: {currentFlashcardIndex + 1} / {wrongWords.length}
            </div>
            <div className="text-sm font-semibold text-emerald-600">
              누적 포인트: {totalPoints}
            </div>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{
                width: `${((currentFlashcardIndex + 1) / wrongWords.length) * 100}%`,
              }}
            />
          </div>
        </div>

        <TextFlashcard
          wordId={currentWord}
          word={currentWord}
          pos="명사"
          meanings={[currentWord]}
          onComplete={handleFlashcardComplete}
        />
      </div>
    );
  }

  // 완료 화면
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mb-4 text-5xl">🎉</div>
        <h1 className="mb-4 text-3xl font-bold text-emerald-900">학습 완료!</h1>

        <div className="mb-8 space-y-4">
          <div className="rounded-lg bg-white p-4">
            <div className="mb-2 text-sm text-slate-600">지문 학습</div>
            <div className="text-2xl font-bold text-slate-900">
              {results.filter(r => r.correct).length} / {results.length} 정답
            </div>
            <div className="mt-1 text-sm text-slate-500">
              정답률: {Math.round((results.filter(r => r.correct).length / results.length) * 100)}%
            </div>
          </div>

          {wrongWords.length > 0 && (
            <div className="rounded-lg bg-white p-4">
              <div className="mb-2 text-sm text-slate-600">깜지 복습</div>
              <div className="text-2xl font-bold text-slate-900">{totalPoints} 포인트</div>
              <div className="mt-1 text-sm text-slate-500">
                {wrongWords.length}개 단어 복습 완료
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleReturnToGame}
          className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
        >
          다시 시작
        </button>
      </div>
    </div>
  );
}
