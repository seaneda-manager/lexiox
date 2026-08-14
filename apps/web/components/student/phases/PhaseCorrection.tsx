'use client';

import { useState } from 'react';
import type { CorrectionWord } from '@/lib/types/vocab-correction';

interface PhaseCorrectionProps {
  studentId: string;
  wrongWords: Array<{
    wordId: string;
    word: string;
    pos: string;
    meaning: string;
    userAnswer: string;
  }>;
  onComplete: (correctionData: any) => void;
}

export function PhaseCorrection({ studentId, wrongWords, onComplete }: PhaseCorrectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stage, setStage] = useState<'correction' | 'explanation' | 'review'>('correction');
  const [corrections, setCorrections] = useState<Record<string, any>>({});

  const currentWord = wrongWords[currentIndex];
  const isLastWord = currentIndex === wrongWords.length - 1;
  const completedCount = Object.keys(corrections).length;

  const handleCorrection = (correctedMeaning: string) => {
    setCorrections(prev => ({
      ...prev,
      [currentWord.wordId]: {
        ...prev[currentWord.wordId],
        correctedMeaning,
      },
    }));
    setStage('explanation');
  };

  const handleExplanation = (explanation: string, exampleSentence?: string) => {
    setCorrections(prev => ({
      ...prev,
      [currentWord.wordId]: {
        ...prev[currentWord.wordId],
        explanation,
        exampleSentence,
      },
    }));

    if (isLastWord) {
      setStage('review');
    } else {
      setCurrentIndex(prev => prev + 1);
      setStage('correction');
    }
  };

  const handleGoBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setStage('correction');
    }
  };

  const handleFinalComplete = () => {
    onComplete(corrections);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
        <h2 className="text-lg font-bold text-amber-900 mb-2">⚠️ 오답 복습</h2>
        <p className="text-sm text-amber-700">
          틀린 단어들을 정정하고 설명을 작성해 심화학습합니다.
        </p>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            진행: {completedCount} / {wrongWords.length}
          </span>
          <span className="text-sm text-gray-500">
            {currentIndex + 1} / {wrongWords.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-amber-600 h-2 rounded-full transition-all"
            style={{ width: `${((completedCount + 1) / wrongWords.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current Word */}
      {currentWord && (
        <div className="rounded-lg border border-gray-200 p-6 space-y-6">
          {/* Word Display */}
          <div className="rounded-lg bg-gray-50 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-4xl font-bold text-gray-900">{currentWord.word}</p>
                <p className="text-sm text-gray-600 mt-2">
                  [{currentWord.pos}] {currentWord.meaning}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-red-600 font-medium mb-1">❌ 당신의 답</p>
                <p className="text-sm text-red-700 line-through">{currentWord.userAnswer}</p>
              </div>
            </div>
          </div>

          {/* Stage Content */}
          {stage === 'correction' && (
            <CorrectionStage
              currentWord={currentWord}
              onContinue={handleCorrection}
            />
          )}

          {stage === 'explanation' && (
            <ExplanationStage
              currentWord={currentWord}
              onContinue={handleExplanation}
              onBack={handleGoBack}
            />
          )}
        </div>
      )}

      {/* Review Stage */}
      {stage === 'review' && (
        <ReviewStage
          wrongWords={wrongWords}
          corrections={corrections}
          onComplete={handleFinalComplete}
          onBack={handleGoBack}
        />
      )}

      {/* Navigation */}
      {stage !== 'review' && (
        <div className="flex gap-3">
          <button
            onClick={handleGoBack}
            disabled={currentIndex === 0 && stage === 'correction'}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            ← 이전
          </button>
        </div>
      )}
    </div>
  );
}

// Correction Stage Component
function CorrectionStage({
  currentWord,
  onContinue,
}: {
  currentWord: any;
  onContinue: (meaning: string) => void;
}) {
  const [meaning, setMeaning] = useState('');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          정정된 뜻 (한글)
        </label>
        <input
          type="text"
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          placeholder="올바른 뜻을 입력하세요..."
          className="w-full px-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>
      <button
        onClick={() => onContinue(meaning)}
        disabled={!meaning.trim()}
        className="w-full px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50"
      >
        다음: 설명 작성 ▶️
      </button>
    </div>
  );
}

// Explanation Stage Component
function ExplanationStage({
  currentWord,
  onContinue,
  onBack,
}: {
  currentWord: any;
  onContinue: (explanation: string, example?: string) => void;
  onBack: () => void;
}) {
  const [explanation, setExplanation] = useState('');
  const [example, setExample] = useState('');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          설명 (선택사항)
        </label>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="이 단어를 어떻게 이해했는지 설명하세요..."
          rows={4}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          예문 (선택사항)
        </label>
        <textarea
          value={example}
          onChange={(e) => setExample(e.target.value)}
          placeholder="이 단어를 사용한 예문을 작성하세요..."
          rows={3}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
        >
          ← 뜻 수정
        </button>
        <button
          onClick={() => onContinue(explanation, example)}
          className="flex-1 px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700"
        >
          다음 ▶️
        </button>
      </div>
    </div>
  );
}

// Review Stage Component
function ReviewStage({
  wrongWords,
  corrections,
  onComplete,
  onBack,
}: {
  wrongWords: any[];
  corrections: Record<string, any>;
  onComplete: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
        <p className="text-sm font-medium text-emerald-900">
          ✅ 모든 오답 복습이 완료되었습니다!
        </p>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {wrongWords.map((word) => {
          const correction = corrections[word.wordId];
          return (
            <div key={word.wordId} className="rounded-lg border border-gray-200 p-4">
              <p className="font-bold text-gray-900">{word.word}</p>
              <div className="mt-2 text-sm space-y-1">
                <div className="text-gray-600">
                  <span className="text-red-600">❌ 원래 답:</span> {word.userAnswer}
                </div>
                <div className="text-emerald-600">
                  <span className="font-medium">✅ 정정된 뜻:</span>{' '}
                  {correction?.correctedMeaning}
                </div>
                {correction?.explanation && (
                  <div className="text-blue-600 text-xs">
                    <span className="font-medium">📝 설명:</span> {correction.explanation}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
        >
          ← 돌아가기
        </button>
        <button
          onClick={onComplete}
          className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700"
        >
          ✅ 완료 (다음 단계)
        </button>
      </div>
    </div>
  );
}
