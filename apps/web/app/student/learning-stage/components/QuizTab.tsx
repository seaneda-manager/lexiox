'use client';

import { useState } from 'react';
import type { QuizChoice } from '@/types/learning-stage';

interface Props {
  synonyms: string[];
  example: { en: string; ko: string };
  choices: QuizChoice[];
  onSubmit: (choiceId: number) => Promise<any>;
  disabled: boolean;
}

export default function QuizTab({
  synonyms,
  example,
  choices,
  onSubmit,
  disabled,
}: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [result, setResult] = useState<{ correct: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (selectedId === null) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await onSubmit(selectedId);

      if (response.success && response.result) {
        setResult({
          correct: response.result.correct,
          message: response.result.feedback,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600 font-semibold mb-4">STEP 3: 이해도 확인</p>

      {/* 지시문 */}
      <div className="bg-teal-50 border-2 border-teal-400 rounded-lg p-4 text-center">
        <p className="text-teal-700 font-semibold">맞는 뜻을 고르세요</p>
      </div>

      {/* 동의어 */}
      {synonyms.length > 0 && (
        <div className="bg-gray-100 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-600 mb-3">동의어/유의어</p>
          <div className="flex flex-wrap gap-2">
            {synonyms.map((word) => (
              <span
                key={word}
                className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 예문 */}
      {example && (
        <div className="bg-gray-100 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-600 mb-3">예문</p>
          <p className="text-sm text-gray-800 mb-2">{example.en}</p>
          <p className="text-sm text-gray-600">{example.ko}</p>
        </div>
      )}

      {/* 선택지 */}
      <div className="space-y-3">
        {choices.map((choice) => (
          <button
            key={choice.id}
            onClick={() => {
              if (!result) setSelectedId(choice.id);
            }}
            disabled={!!result || disabled || loading}
            className={`w-full text-left border-2 rounded-lg p-4 font-semibold transition ${
              selectedId === choice.id
                ? 'border-teal-500 bg-teal-50'
                : 'border-gray-300 bg-white hover:border-teal-300'
            } ${
              result && choice.is_correct
                ? 'border-green-500 bg-green-100'
                : result && selectedId === choice.id && !choice.is_correct
                ? 'border-red-500 bg-red-100'
                : ''
            } disabled:cursor-not-allowed`}
          >
            {choice.text}
            {result && choice.is_correct && ' ✓'}
            {result && selectedId === choice.id && !choice.is_correct && ' ✗'}
          </button>
        ))}
      </div>

      {/* 결과 */}
      {result && (
        <div
          className={`rounded-lg p-4 text-center font-semibold ${
            result.correct
              ? 'bg-green-100 text-green-700 border-2 border-green-300'
              : 'bg-red-100 text-red-700 border-2 border-red-300'
          }`}
        >
          {result.message}
        </div>
      )}

      {/* 제출 버튼 */}
      {!result && (
        <button
          onClick={handleSubmit}
          disabled={selectedId === null || disabled || loading}
          className="w-full bg-teal-500 text-white rounded-lg py-3 font-semibold hover:bg-teal-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          {loading ? '확인 중...' : '정답 확인'}
        </button>
      )}

      {/* 다음 단계 버튼 */}
      {result && result.correct && (
        <button
          onClick={() => window.location.href = '/student/learning-stage/progress'}
          className="w-full bg-teal-500 text-white rounded-lg py-3 font-semibold hover:bg-teal-600 transition"
        >
          다음 단어로 →
        </button>
      )}
    </div>
  );
}
