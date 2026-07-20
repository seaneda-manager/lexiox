'use client';

import React from 'react';

interface VuMeterProps {
  level: number; // 0-100
  isReady: boolean;
}

/**
 * VU Meter 컴포넌트
 * - 마이크 오디오 레벨 시각화
 * - 0-100 스케일 프로그레스바
 */
export function VuMeter({ level, isReady }: VuMeterProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">Microphone Level</span>
        <span className="text-sm font-bold text-gray-600">{Math.round(level)}%</span>
      </div>

      {/* 프로그레스바 */}
      <div className="w-full h-8 bg-gray-200 rounded-full overflow-hidden border-2 border-gray-300">
        <div
          className={`h-full transition-all duration-100 rounded-full ${
            isReady ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min(level, 100)}%` }}
        />
      </div>

      {/* 상태 메시지 */}
      <div className="mt-3 text-center">
        {isReady ? (
          <p className="text-sm font-semibold text-green-600">
            ✓ Microphone level is good
          </p>
        ) : (
          <p className="text-sm font-semibold text-gray-600">
            Please speak to test your microphone
          </p>
        )}
      </div>
    </div>
  );
}
