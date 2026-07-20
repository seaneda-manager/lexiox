'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAudioCheck } from '../../_hooks/useAudioCheck';
import { useSpeakingSession } from '../../_hooks/useSpeakingSession';
import { VuMeter } from '../../_components/VuMeter';

/**
 * Audio Check 페이지
 * - 마이크 레벨 측정
 * - 임계값 달성 시 Next 활성화
 */
export default function AudioCheckPage() {
  const router = useRouter();
  const { micLevel, isReady, error, gainLevel, setGainLevel, startAudioCheck, stopAudioCheck } = useAudioCheck();
  const { initSession, setState } = useSpeakingSession();

  useEffect(() => {
    initSession();
    startAudioCheck();

    return () => {
      stopAudioCheck();
    };
  }, [startAudioCheck, stopAudioCheck, initSession]);

  const handleNext = () => {
    stopAudioCheck();
    setState('DIRECTIONS');
    router.push('/speaking-2026/test/directions');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-semibold mb-2">Microphone Error</p>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* 헤더 */}
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
          Volume and Microphone Check
        </h1>
        <p className="text-gray-600 text-center mb-12">
          Please read the sentence below in your normal voice so the system can auto-adjust your microphone volume.
        </p>

        {/* 마이크 아이콘 */}
        <div className="flex justify-center mb-12">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-5xl">
            🎤
          </div>
        </div>

        {/* VU Meter */}
        <div className="mb-12">
          <VuMeter level={micLevel} isReady={isReady} />
        </div>

        {/* Gain Control */}
        <div className="mb-12 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Microphone Level Adjustment
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={gainLevel}
              onChange={(e) => setGainLevel(parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm font-medium text-gray-700 min-w-12">
              {Math.round(gainLevel * 100)}%
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Adjust the slider to increase or decrease your microphone volume
          </p>
        </div>

        {/* 샘플 문장 */}
        <div className="mb-12 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-lg text-gray-800 text-center font-medium">
            "I believe that technology has made our lives better in many ways."
          </p>
        </div>

        {/* Next 버튼 */}
        <div className="flex justify-center">
          <button
            onClick={handleNext}
            disabled={!isReady}
            className={`px-8 py-3 rounded-lg font-semibold text-white transition-all ${
              isReady
                ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
