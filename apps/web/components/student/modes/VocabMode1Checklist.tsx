"use client";

import { useState, useEffect } from "react";
import type {
  Mode1PreScreenSession,
  VocabWord,
} from "@/lib/types/vocab-learning-mode";

interface VocabMode1ChecklistProps {
  words: VocabWord[];
  onComplete: (session: Mode1PreScreenSession) => void;
  onCancel?: () => void;
}

export default function VocabMode1Checklist({
  words,
  onComplete,
  onCancel,
}: VocabMode1ChecklistProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [checkedWords, setCheckedWords] = useState<Set<string>>(new Set());
  const [uncheckedWords, setUncheckedWords] = useState<Set<string>>(new Set());
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [autoPlayTimer, setAutoPlayTimer] = useState(0);

  const currentWord = words[currentIndex];
  const totalWords = words.length;
  const progress = ((currentIndex + 1) / totalWords) * 100;

  // 자동 진행 타이머 (10초)
  useEffect(() => {
    if (!autoPlayEnabled || !currentWord) return;

    const timer = setInterval(() => {
      setAutoPlayTimer((prev) => {
        if (prev >= 10) {
          // 자동으로 "모름" 선택 후 다음으로
          if (currentIndex < totalWords - 1) {
            setUncheckedWords((prev) =>
              new Set([...prev, currentWord.id])
            );
            setCurrentIndex((prev) => prev + 1);
            return 0;
          } else {
            return prev;
          }
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoPlayEnabled, currentIndex, currentWord, totalWords]);

  const handleKnow = () => {
    setAutoPlayTimer(0);
    setCheckedWords((prev) => new Set([...prev, currentWord.id]));
    if (currentIndex < totalWords - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleDontKnow = () => {
    setAutoPlayTimer(0);
    setUncheckedWords((prev) => new Set([...prev, currentWord.id]));
    if (currentIndex < totalWords - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    const session: Mode1PreScreenSession = {
      mode: 1,
      dayId: "", // 서버에서 설정
      words,
      checkedWordIds: checkedWords,
      uncheckedWordIds: uncheckedWords,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    onComplete(session);
  };

  const handleNext = () => {
    if (currentIndex < totalWords - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  if (!currentWord) {
    return <div className="text-center p-4">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              📋 PreScreen
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {currentIndex + 1} / {totalWords}
            </p>
          </div>
          <button
            onClick={() => setAutoPlayEnabled(!autoPlayEnabled)}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
              autoPlayEnabled
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {autoPlayEnabled ? "🔄 자동" : "⏸ 수동"}
          </button>
        </div>

        {/* 진행률 바 */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* 메인 카드 */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          {/* 단어 */}
          <div className="text-center mb-8">
            <p className="text-gray-600 text-sm mb-3">이 단어를 알고 있습니까?</p>
            <div className="text-5xl font-bold text-blue-600 mb-4">
              {currentWord.text}
            </div>
            <div className="flex items-center justify-center gap-4">
              <span className="text-lg text-gray-700">
                {currentWord.meaning_ko}
              </span>
              {currentWord.meaning_en && (
                <span className="text-lg text-gray-600">
                  ({currentWord.meaning_en})
                </span>
              )}
            </div>
            {currentWord.pos && (
              <p className="text-sm text-gray-500 mt-2">{currentWord.pos}</p>
            )}
          </div>

          {/* 자동 진행 표시 */}
          {autoPlayEnabled && (
            <div className="mb-8 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-700">
                  {10 - autoPlayTimer}초 후 자동으로 "모름"이 선택됩니다
                </p>
                <div className="w-32 bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(autoPlayTimer / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 선택 버튼 */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleKnow}
              className="py-4 px-6 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-lg transition transform hover:scale-105"
            >
              ✓ 알아요
            </button>
            <button
              onClick={handleDontKnow}
              className="py-4 px-6 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-lg transition transform hover:scale-105"
            >
              ✗ 모르겠어요
            </button>
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">알고 있는 단어</p>
            <p className="text-2xl font-bold text-green-600">
              {checkedWords.size}
            </p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">배워야 할 단어</p>
            <p className="text-2xl font-bold text-orange-600">
              {uncheckedWords.size}
            </p>
          </div>
        </div>

        {/* 네비게이션 */}
        <div className="flex gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
          >
            ← 이전
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === totalWords - 1}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
          >
            다음 →
          </button>
          <button
            onClick={handleComplete}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
          >
            완료
          </button>
        </div>

        {/* 취소 버튼 */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full mt-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            취소
          </button>
        )}
      </div>
    </div>
  );
}
