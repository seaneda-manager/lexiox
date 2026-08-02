'use client';

import { useState, useEffect, useCallback } from 'react';
import { ReadingBlankFillGame } from '../../_lib/games/ReadingBlankFillGame';

interface Props {
  userId?: string;
  onComplete?: (score: number) => void;
}

export default function ReadingBlankFillPlay({ userId = 'user-id-placeholder', onComplete = () => {} }: Props) {
  const [game] = useState(() => new ReadingBlankFillGame(userId, 'reading_blank_fill'));
  const [gameStarted, setGameStarted] = useState(false);
  const [currentSentence, setCurrentSentence] = useState(game.getCurrentSentence());
  const [userInputs, setUserInputs] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Record<string, { correct: boolean; answer: string }>>({});
  const [gameComplete, setGameComplete] = useState(false);

  useEffect(() => {
    if (gameStarted) {
      game.start();
    }
  }, [gameStarted, game]);

  useEffect(() => {
    const current = game.getCurrentSentence();
    setCurrentSentence(current);
    if (current) {
      const inputs: Record<string, string> = {};
      current.blankWords.forEach(bw => {
        inputs[bw.id] = '';
      });
      setUserInputs(inputs);
      setSubmitted(false);
      setResults({});
    }
  }, [game, gameComplete]);

  const handleStart = async () => {
    await game.initialize(1);
    setGameStarted(true);
  };

  const handleInputChange = (wordId: string, value: string) => {
    if (!submitted) {
      setUserInputs(prev => ({ ...prev, [wordId]: value }));
    }
  };

  const handleSubmit = async () => {
    if (!currentSentence) return;

    const newResults: Record<string, { correct: boolean; answer: string }> = {};
    let allCorrect = true;

    for (const blankWord of currentSentence.blankWords) {
      const answer = userInputs[blankWord.id] || '';
      const isCorrect = await game.handleAnswer(answer, blankWord.id);
      newResults[blankWord.id] = { correct: isCorrect, answer };
      if (!isCorrect) allCorrect = false;
    }

    setResults(newResults);
    setSubmitted(true);
  };

  const handleNext = async () => {
    const hasNext = game.nextSentence();
    if (hasNext) {
      const nextSentence = game.getCurrentSentence();
      setCurrentSentence(nextSentence);
      if (nextSentence) {
        const inputs: Record<string, string> = {};
        nextSentence.blankWords.forEach(bw => {
          inputs[bw.id] = '';
        });
        setUserInputs(inputs);
        setSubmitted(false);
        setResults({});
      }
    } else {
      await game.completeLevel();
      setGameComplete(true);
      onComplete(game.gameState.score);
    }
  };

  const progress = game.getProgress();
  const allAnswered = currentSentence?.blankWords.every(bw => userInputs[bw.id]?.trim());
  const correctCount = Object.values(results).filter(r => r.correct).length;

  if (!gameStarted) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 text-center">
        <div className="mb-8">
          <h1 className="mb-4 text-5xl">📖</h1>
          <h2 className="mb-2 text-3xl font-bold text-gray-800">Reading Blank Fill</h2>
          <p className="text-lg text-gray-600">
            지문의 빈칸을 채워 단어 이해도를 높혀보세요
          </p>
        </div>

        <div className="rounded-xl bg-blue-50 p-6 text-left">
          <h3 className="mb-3 font-semibold text-gray-800">게임 규칙:</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✓ 지문의 단어 일부가 빈칸으로 표시됩니다</li>
            <li>✓ 빈 부분을 완성해 단어를 채워주세요</li>
            <li>✓ 정답 판정은 대소문자를 구분하지 않습니다</li>
          </ul>
        </div>

        <button
          onClick={handleStart}
          className="w-full rounded-lg bg-indigo-600 px-6 py-3 text-lg font-semibold text-white hover:bg-indigo-700"
        >
          게임 시작
        </button>
      </div>
    );
  }

  if (gameComplete) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="mb-4 text-5xl">🎉</div>
          <h1 className="mb-4 text-3xl font-bold text-emerald-900">학습 완료!</h1>

          <div className="mb-8 space-y-4">
            <div className="rounded-lg bg-white p-4">
              <div className="mb-2 text-sm text-slate-600">정확도</div>
              <div className="text-3xl font-bold text-emerald-600">{game.getAccuracy()}%</div>
            </div>

            <div className="rounded-lg bg-white p-4">
              <div className="mb-2 text-sm text-slate-600">최종 점수</div>
              <div className="text-3xl font-bold text-indigo-600">{game.gameState.score} 포인트</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentSentence) {
    return <div className="text-center py-8">로딩 중...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {/* Progress */}
      <div className="rounded-lg bg-slate-50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-700">
            진행: {progress.current} / {progress.total} 문장
          </div>
          <div className="text-sm font-semibold text-emerald-600">
            정답: {game.gameAnswers.filter(a => a.correct).length} / {game.gameAnswers.length}
          </div>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
      </div>

      {/* Sentence Display */}
      <div className="rounded-lg bg-slate-50 p-4">
        <div className="mb-3 text-sm font-semibold text-slate-500">문장 {progress.current}</div>
        <div className="text-lg leading-relaxed text-slate-900">
          {currentSentence.parts.map((part, idx) => {
            if (part.blankWord) {
              return (
                <span key={`${part.blankWord.id}-${idx}`} className="inline">
                  <span className="font-semibold">{part.blankWord.prefix}</span>
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
      </div>

      {/* Input Fields */}
      <div className="space-y-3">
        {currentSentence.blankWords.map((bw, idx) => (
          <div key={bw.id}>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              {idx + 1}. {bw.prefix}________
            </label>
            <input
              type="text"
              value={userInputs[bw.id] || ''}
              onChange={e => handleInputChange(bw.id, e.target.value)}
              onKeyPress={e => {
                if (e.key === 'Enter' && allAnswered && !submitted) {
                  handleSubmit();
                }
              }}
              disabled={submitted}
              placeholder="입력..."
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
            />
            {submitted && (
              <div className="mt-1 text-xs">
                {results[bw.id]?.correct ? (
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

      {/* Action Buttons */}
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!allAnswered}
          className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
        >
          확인
        </button>
      )}

      {submitted && (
        <button
          onClick={handleNext}
          className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          {progress.current === progress.total ? '완료' : '다음 문장'}
        </button>
      )}
    </div>
  );
}
