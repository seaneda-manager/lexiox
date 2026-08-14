'use client';

import type { VocabWord, FillinAnswer, FillinResult } from '@/lib/types/vocab-test';
import { POS_LABELS, checkAnswer, calculateScore } from '@/lib/types/vocab-test';

interface ResultStageProps {
  words: VocabWord[];
  testWordIds: string[];
  answers: FillinAnswer[];
  onComplete: () => void;
}

export function ResultStage({
  words,
  testWordIds,
  answers,
  onComplete,
}: ResultStageProps) {
  const testWords = testWordIds
    .map(id => words.find(w => w.id === id))
    .filter(Boolean) as VocabWord[];

  const results: FillinResult[] = answers.map((answer, index) => {
    const correctWord = testWords[index];
    return checkAnswer(answer, correctWord);
  });

  const score = calculateScore(results);
  const correctCount = results.filter(r => r.correct).length;
  const incorrectCount = results.filter(r => !r.correct).length;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'bg-blue-50 border-blue-200';
    if (score >= 40) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-6">
      {/* Score */}
      <div className={`rounded-lg border p-8 text-center ${getScoreBg(score)}`}>
        <p className="text-sm text-gray-600 mb-2">테스트 결과</p>
        <p className={`text-6xl font-bold ${getScoreColor(score)}`}>{score}점</p>
        <p className="text-gray-600 mt-2">
          {correctCount}개 정답 / {incorrectCount}개 오답
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">총 문제</p>
          <p className="text-2xl font-bold text-gray-900">{testWords.length}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="text-xs text-emerald-600 mb-1">정답</p>
          <p className="text-2xl font-bold text-emerald-700">{correctCount}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-xs text-red-600 mb-1">오답</p>
          <p className="text-2xl font-bold text-red-700">{incorrectCount}</p>
        </div>
      </div>

      {/* Results List */}
      {incorrectCount > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-gray-900">⚠️ 틀린 답변 복습</h3>
          {results
            .filter(r => !r.correct)
            .map((result, index) => (
              <div key={result.wordId} className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="mb-2">
                  <p className="font-bold text-gray-900">{index + 1}. {result.spelling.expected}</p>
                  <p className="text-xs text-gray-600">
                    ({POS_LABELS[result.pos.expected]}) {result.meaning.expected}
                  </p>
                </div>

                <div className="space-y-1 text-sm">
                  {!result.spelling.correct && (
                    <div className="text-red-600">
                      ✗ 철자: <span className="line-through">{result.spelling.got}</span> →{' '}
                      <span className="font-semibold">{result.spelling.expected}</span>
                    </div>
                  )}
                  {!result.pos.correct && (
                    <div className="text-red-600">
                      ✗ 품사: <span className="line-through">{POS_LABELS[result.pos.got]}</span> →{' '}
                      <span className="font-semibold">{POS_LABELS[result.pos.expected]}</span>
                    </div>
                  )}
                  {!result.meaning.correct && (
                    <div className="text-red-600">
                      ✗ 뜻: <span className="line-through">{result.meaning.got}</span> →{' '}
                      <span className="font-semibold">{result.meaning.expected}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {correctCount > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="font-bold text-emerald-900">✅ {correctCount}개 완벽하게 맞혔습니다!</p>
          <p className="text-sm text-emerald-700 mt-2">다음 Phase에서 이 단어들을 설명 연습으로 심화학습합니다.</p>
        </div>
      )}

      {/* Complete Button */}
      <button
        onClick={onComplete}
        className="w-full px-4 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
      >
        ✅ 완료 (다음 단계로)
      </button>
    </div>
  );
}
