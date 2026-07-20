'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Drill Practice 페이지
 * - 취약점 기반 아이템 반복
 * - 로컬 스코링 (간단)
 * - 콤보 시스템
 */
export default function DrillPracticePage() {
  const router = useRouter();
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [combo, setCombo] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // 더미 데이터: Task 1 아이템들
  const drillItems = [
    {
      id: 'drill_1',
      prompt: 'The environment is very important for our future.',
      duration: 10,
    },
    {
      id: 'drill_2',
      prompt: 'Technology has changed how we communicate.',
      duration: 9,
    },
    {
      id: 'drill_3',
      prompt: 'Education is the key to success.',
      duration: 8,
    },
  ];

  const currentItem = drillItems[currentItemIndex % drillItems.length];
  const currentRound = Math.floor(currentItemIndex / drillItems.length) + 1;
  const successRate =
    totalAttempts > 0
      ? Math.round((totalCorrect / totalAttempts) * 100)
      : 0;

  const handlePlayAudio = () => {
    setIsPlaying(true);
    // 실제로는 오디오 재생
    setTimeout(() => setIsPlaying(false), 3000);
  };

  const handleCorrect = () => {
    setTotalCorrect(totalCorrect + 1);
    setTotalAttempts(totalAttempts + 1);
    setCombo(combo + 1);
    proceedToNext();
  };

  const handleIncorrect = () => {
    setTotalAttempts(totalAttempts + 1);
    setCombo(0);
    proceedToNext();
  };

  const proceedToNext = () => {
    setTimeout(() => {
      if (currentItemIndex < drillItems.length * 3 - 1) {
        // 3라운드 반복 (더미 설정)
        setCurrentItemIndex(currentItemIndex + 1);
      } else {
        // 완료
        router.push('/speaking-2026/drill/complete');
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* 상단 통계 */}
        <div className="grid grid-cols-4 gap-4 mb-12">
          <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
            <div className="text-3xl font-bold text-blue-600">🔥 {combo}</div>
            <div className="text-xs text-gray-600 mt-1">Combo</div>
          </div>

          <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
            <div className="text-3xl font-bold text-green-600">{totalCorrect}</div>
            <div className="text-xs text-gray-600 mt-1">Correct</div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-200">
            <div className="text-3xl font-bold text-purple-600">
              {successRate}%
            </div>
            <div className="text-xs text-gray-600 mt-1">Success Rate</div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4 text-center border border-orange-200">
            <div className="text-3xl font-bold text-orange-600">
              {currentRound}/3
            </div>
            <div className="text-xs text-gray-600 mt-1">Round</div>
          </div>
        </div>

        {/* 문제 */}
        <div className="bg-gray-50 rounded-lg p-8 mb-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Repeat the sentence:
          </h2>

          {/* 재생 버튼 */}
          <div className="flex justify-center mb-8">
            <button
              onClick={handlePlayAudio}
              className={`flex items-center gap-3 px-8 py-4 rounded-lg font-bold text-white transition ${
                isPlaying
                  ? 'bg-red-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <span className="text-2xl">{isPlaying ? '⏸' : '▶'}</span>
              <span>{isPlaying ? 'Playing...' : 'Play Audio'}</span>
            </button>
          </div>

          {/* 진행 상황 */}
          <div className="text-center text-sm text-gray-600 mb-6">
            Item {(currentItemIndex % drillItems.length) + 1} of{' '}
            {drillItems.length} (Round {currentRound}/3)
          </div>

          <div className="w-full h-1 bg-gray-300 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{
                width: `${((currentItemIndex + 1) / (drillItems.length * 3)) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* 평가 버튼 */}
        <div className="space-y-3">
          <button
            onClick={handleCorrect}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg font-bold text-lg transition"
          >
            ✓ I got it right
          </button>

          <button
            onClick={handleIncorrect}
            className="w-full bg-gray-400 hover:bg-gray-500 text-white py-4 rounded-lg font-bold text-lg transition"
          >
            ✗ I made a mistake
          </button>

          <button
            onClick={() => router.push('/speaking-2026/drill')}
            className="w-full bg-gray-300 hover:bg-gray-400 text-gray-900 py-3 rounded-lg font-semibold transition"
          >
            Quit Drill
          </button>
        </div>

        {/* 현재 문장 텍스트 (참고용) */}
        <div className="mt-12 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800 font-mono">
            "{currentItem.prompt}"
          </p>
        </div>
      </div>
    </div>
  );
}
