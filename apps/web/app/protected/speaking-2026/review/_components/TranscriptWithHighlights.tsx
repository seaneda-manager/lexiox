'use client';

import React, { useState } from 'react';

interface ErrorHighlight {
  wordIndex: number;
  word: string;
  errorType: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
}

interface TranscriptWithHighlightsProps {
  itemId: string;
}

/**
 * STT 스크립트 with Error Highlights
 * - HIGH: 빨간색 (#FFCDD2)
 * - MEDIUM: 노란색 (#FFF9C4)
 * - LOW: 파란색
 * - 마우스 오버: 툴팁
 */
export function TranscriptWithHighlights({
  itemId,
}: TranscriptWithHighlightsProps) {
  const [hoveredWordIndex, setHoveredWordIndex] = useState<number | null>(null);

  // 더미 데이터: 실제로는 백엔드에서 받아옴
  const mockTranscript: ErrorHighlight[] = [
    { wordIndex: 0, word: 'The', errorType: 'none', severity: 'HIGH', explanation: '' },
    { wordIndex: 1, word: 'enviroment', errorType: 'pronunciation', severity: 'HIGH', explanation: 'Pronunciation error: should be "environment"' },
    { wordIndex: 2, word: 'is', errorType: 'none', severity: 'HIGH', explanation: '' },
    { wordIndex: 3, word: 'very', errorType: 'fluency', severity: 'MEDIUM', explanation: 'Fluency issue: long pause before this word' },
    { wordIndex: 4, word: 'important', errorType: 'none', severity: 'HIGH', explanation: '' },
    { wordIndex: 5, word: 'for', errorType: 'none', severity: 'HIGH', explanation: '' },
    { wordIndex: 6, word: 'our', errorType: 'silence', severity: 'LOW', explanation: 'Minor silence detected' },
    { wordIndex: 7, word: 'future', errorType: 'none', severity: 'HIGH', explanation: '' },
  ];

  const getHighlightColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-200 text-red-900';
      case 'MEDIUM':
        return 'bg-yellow-200 text-yellow-900';
      case 'LOW':
        return 'bg-blue-200 text-blue-900';
      default:
        return 'bg-white text-gray-900';
    }
  };

  const getErrorIcon = (errorType: string) => {
    switch (errorType) {
      case 'pronunciation':
        return '🔊';
      case 'fluency':
        return '⚡';
      case 'silence':
        return '⏸';
      default:
        return '✓';
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
      <div className="mb-4">
        <h3 className="font-bold text-gray-900 mb-4">Your Response</h3>

        {/* 오류 범례 */}
        <div className="flex flex-wrap gap-4 mb-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-200" />
            <span className="text-gray-600">High (Pronunciation)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-200" />
            <span className="text-gray-600">Medium (Fluency)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-200" />
            <span className="text-gray-600">Low (Minor)</span>
          </div>
        </div>
      </div>

      {/* 스크립트 */}
      <div className="bg-white rounded-lg p-6 mb-4 min-h-24">
        <div className="flex flex-wrap gap-2">
          {mockTranscript.map((item) => (
            <div
              key={item.wordIndex}
              className="relative group"
              onMouseEnter={() => setHoveredWordIndex(item.wordIndex)}
              onMouseLeave={() => setHoveredWordIndex(null)}
            >
              {/* 단어 */}
              <span
                className={`px-3 py-1 rounded-lg transition cursor-default ${
                  item.errorType === 'none'
                    ? 'bg-white text-gray-900 border border-gray-300'
                    : getHighlightColor(item.severity)
                }`}
              >
                {item.word}
              </span>

              {/* 에러 아이콘 */}
              {item.errorType !== 'none' && (
                <span className="absolute -top-2 -right-2 text-sm">
                  {getErrorIcon(item.errorType)}
                </span>
              )}

              {/* 툴팁 */}
              {hoveredWordIndex === item.wordIndex &&
                item.errorType !== 'none' && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-10">
                    {item.explanation}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
                  </div>
                )}
            </div>
          ))}
        </div>
      </div>

      {/* 분석 요약 */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h4 className="font-bold text-blue-900 mb-2">Analysis Summary</h4>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• <strong>Pronunciation:</strong> 1 error (Enviroment → Environment)</li>
          <li>• <strong>Fluency:</strong> 1 issue (Pause before "very")</li>
          <li>• <strong>Overall:</strong> Good flow, minor pronunciation issue</li>
        </ul>
      </div>
    </div>
  );
}
