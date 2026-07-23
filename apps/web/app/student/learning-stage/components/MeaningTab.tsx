'use client';

import type { Meaning } from '@/types/learning-stage';
import { useState } from 'react';

interface Props {
  meanings: Meaning[];
  relatedWords: string[];
  definition: string;
  onReportBroken: () => void;
  onContinue: () => Promise<any>;
  disabled: boolean;
}

export default function MeaningTab({
  meanings,
  relatedWords,
  definition,
  onReportBroken,
  onContinue,
  disabled,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    try {
      await onContinue();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600 font-semibold mb-4">STEP 2: 뜻 학습</p>

      {/* 뜻 카드 */}
      <div className="grid grid-cols-2 gap-4">
        {meanings.map((meaning) => (
          <div
            key={meaning.id}
            className="bg-gray-100 border-l-4 border-orange-400 rounded-lg p-4"
          >
            <p className="text-xs font-semibold text-gray-600 mb-2">뜻 {meaning.id}</p>
            <p className="font-bold text-orange-600 text-sm mb-2">{meaning.pos}</p>
            <p className="text-sm text-gray-800 font-semibold mb-2">{meaning.text}</p>
            {meaning.context && (
              <p className="text-xs text-gray-500 italic">{meaning.context}</p>
            )}
            <p className="text-xs text-gray-600 mt-2">{meaning.textEn}</p>
          </div>
        ))}
      </div>

      {/* Related Words */}
      {relatedWords.length > 0 && (
        <div className="bg-gray-100 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-600 mb-3">RELATED WORDS</p>
          <div className="flex flex-wrap gap-2">
            {relatedWords.map((word) => (
              <span
                key={word}
                className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full hover:bg-yellow-200 cursor-pointer transition"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Definition */}
      {definition && (
        <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-4">
          <p className="text-xs font-semibold text-blue-700 mb-2">ENGLISH DEFINITION</p>
          <p className="text-sm text-blue-900 italic">"{definition}"</p>
        </div>
      )}

      {/* Report Broken */}
      <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4 text-center">
        <button
          onClick={onReportBroken}
          className="text-red-700 font-semibold text-sm hover:text-red-900 transition"
        >
          ⚠️ Report Broken Content
        </button>
      </div>

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        disabled={disabled || loading}
        className="w-full bg-teal-500 text-white rounded-lg py-3 font-semibold hover:bg-teal-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
      >
        {loading ? '진행 중...' : '다음 단계: Quiz 풀기 →'}
      </button>
    </div>
  );
}
