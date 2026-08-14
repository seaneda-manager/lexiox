'use client';

import { useState, useMemo } from 'react';
import { ChecklistStage } from './_vocab-test/ChecklistStage';
import { FillinStage } from './_vocab-test/FillinStage';
import { ResultStage } from './_vocab-test/ResultStage';
import type { VocabWord, FillinAnswer } from '@/lib/types/vocab-test';

interface PhaseVocabTestProps {
  studentId: string;
  words: VocabWord[];
  onComplete: (score: number, resultData: any) => void;
}

export function PhaseVocabTest({ studentId, words, onComplete }: PhaseVocabTestProps) {
  const [stage, setStage] = useState<'checklist' | 'fillin' | 'result'>('checklist');
  const [testWordIds, setTestWordIds] = useState<string[]>([]);
  const [answers, setAnswers] = useState<FillinAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Shuffle words for display
  const shuffledWords = useMemo(() => {
    return [...words].sort(() => Math.random() - 0.5);
  }, [words]);

  const handleChecklistContinue = (uncheckedWordIds: string[]) => {
    setTestWordIds(uncheckedWordIds);
    setStage('fillin');
  };

  const handleFillinComplete = (fillinAnswers: FillinAnswer[]) => {
    setAnswers(fillinAnswers);
    setStage('result');
  };

  const handleResultComplete = async () => {
    setIsLoading(true);
    try {
      // Calculate score
      const testWords = testWordIds
        .map(id => words.find(w => w.id === id))
        .filter(Boolean) as VocabWord[];

      const results = answers.map((answer, index) => {
        const correctWord = testWords[index];
        const correct =
          answer.spelling.toLowerCase().trim() === correctWord.word.toLowerCase() &&
          answer.pos === correctWord.pos &&
          answer.meaning.toLowerCase().trim() === correctWord.meaning.toLowerCase();
        return { wordId: correctWord.id, correct };
      });

      const correctCount = results.filter(r => r.correct).length;
      const score = Math.round((correctCount / results.length) * 100);

      // Save result (would call API)
      await onComplete(score, {
        totalWords: testWords.length,
        correctCount,
        results,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stage Indicator */}
      <div className="flex items-center gap-4">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white ${
            stage === 'checklist' || ['fillin', 'result'].includes(stage)
              ? 'bg-emerald-600'
              : 'bg-gray-300'
          }`}
        >
          1
        </div>
        <div className="flex-1 h-1 bg-gray-200" />

        <div
          className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white ${
            stage === 'fillin' || stage === 'result' ? 'bg-emerald-600' : 'bg-gray-300'
          }`}
        >
          2
        </div>
        <div className="flex-1 h-1 bg-gray-200" />

        <div
          className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white ${
            stage === 'result' ? 'bg-emerald-600' : 'bg-gray-300'
          }`}
        >
          3
        </div>
      </div>

      {/* Content */}
      {stage === 'checklist' && (
        <ChecklistStage
          words={shuffledWords}
          onContinue={handleChecklistContinue}
        />
      )}

      {stage === 'fillin' && (
        <FillinStage
          words={words}
          testWordIds={testWordIds}
          onComplete={handleFillinComplete}
        />
      )}

      {stage === 'result' && (
        <ResultStage
          words={words}
          testWordIds={testWordIds}
          answers={answers}
          onComplete={handleResultComplete}
        />
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-700 font-medium">결과 저장 중...</p>
          </div>
        </div>
      )}
    </div>
  );
}
