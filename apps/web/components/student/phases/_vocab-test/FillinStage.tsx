'use client';

import { useState, useMemo } from 'react';
import type { VocabWord, FillinAnswer, POS_LABELS } from '@/lib/types/vocab-test';
import { POS_LABELS, checkAnswer } from '@/lib/types/vocab-test';

interface FillinStageProps {
  words: VocabWord[];
  testWordIds: string[];
  onComplete: (answers: FillinAnswer[]) => void;
}

export function FillinStage({ words, testWordIds, onComplete }: FillinStageProps) {
  const testWords = useMemo(() => {
    // Shuffle test words
    return testWordIds
      .map(id => words.find(w => w.id === id))
      .filter(Boolean) as VocabWord[];
  }, [words, testWordIds]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<FillinAnswer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<FillinAnswer>({
    wordId: '',
    spelling: '',
    pos: 'noun',
    meaning: '',
  });

  const currentWord = testWords[currentIndex];
  const isLastQuestion = currentIndex === testWords.length - 1;

  const handleSpellingChange = (value: string) => {
    setCurrentAnswer(prev => ({ ...prev, spelling: value }));
  };

  const handlePosChange = (value: string) => {
    setCurrentAnswer(prev => ({
      ...prev,
      pos: value as any,
    }));
  };

  const handleMeaningChange = (value: string) => {
    setCurrentAnswer(prev => ({ ...prev, meaning: value }));
  };

  const handleNext = () => {
    const answer: FillinAnswer = {
      wordId: currentWord.id,
      spelling: currentAnswer.spelling,
      pos: currentAnswer.pos,
      meaning: currentAnswer.meaning,
    };

    setAnswers(prev => [...prev, answer]);

    if (isLastQuestion) {
      onComplete(answers);
    } else {
      setCurrentIndex(prev => prev + 1);
      setCurrentAnswer({
        wordId: '',
        spelling: '',
        pos: 'noun',
        meaning: '',
      });
    }
  };

  const handleGoBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      const prevAnswer = answers[currentIndex - 1];
      setCurrentAnswer(prevAnswer);
      setAnswers(prev => prev.slice(0, -1));
    }
  };

  const isAnswerComplete =
    currentAnswer.spelling.trim() &&
    currentAnswer.pos &&
    currentAnswer.meaning.trim();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <h2 className="text-lg font-bold text-blue-900 mb-2">🔤 단어 채우기</h2>
        <p className="text-sm text-blue-700">
          각 단어의 <strong>철자</strong>, <strong>품사</strong>, <strong>뜻</strong>을 입력하세요.
        </p>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            진행 상황: {currentIndex + 1} / {testWords.length}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(((currentIndex + 1) / testWords.length) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / testWords.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current Question */}
      {currentWord && (
        <div className="rounded-lg border border-gray-200 p-6 space-y-6">
          {/* Display Word */}
          <div className="rounded-lg bg-gray-50 p-6 text-center">
            <p className="text-xs text-gray-500 mb-2">의미를 알고 있는 단어:</p>
            <p className="text-4xl font-bold text-gray-900">{currentWord.word}</p>
            <p className="text-sm text-gray-600 mt-3">철자, 품사, 한글 뜻을 입력하세요</p>
          </div>

          {/* Input Fields */}
          <div className="space-y-4">
            {/* Spelling */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                철자
              </label>
              <input
                type="text"
                value={currentAnswer.spelling}
                onChange={(e) => handleSpellingChange(e.target.value)}
                placeholder="예: beautiful"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Part of Speech */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                품사
              </label>
              <select
                value={currentAnswer.pos}
                onChange={(e) => handlePosChange(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(POS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Meaning */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                한글 뜻
              </label>
              <input
                type="text"
                value={currentAnswer.meaning}
                onChange={(e) => handleMeaningChange(e.target.value)}
                placeholder="예: 아름다운"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Hint */}
          {currentWord.example && (
            <div className="rounded-lg bg-yellow-50 p-4 border border-yellow-200">
              <p className="text-xs font-medium text-yellow-800 mb-1">💡 예시</p>
              <p className="text-sm text-yellow-700 italic">{currentWord.example}</p>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={handleGoBack}
          disabled={currentIndex === 0}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          ← 이전
        </button>

        <button
          onClick={handleNext}
          disabled={!isAnswerComplete}
          className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {isLastQuestion ? '✅ 완료' : '다음 ▶️'}
        </button>
      </div>
    </div>
  );
}
