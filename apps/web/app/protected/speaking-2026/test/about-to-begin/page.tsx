'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSpeakingSession } from '../../_hooks/useSpeakingSession';

export default function AboutToBeginPage() {
  const router = useRouter();
  const { setState } = useSpeakingSession();
  const [countdown, setCountdown] = useState(3);
  const [autoStart, setAutoStart] = useState(false);

  useEffect(() => {
    if (!autoStart) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      handleStart();
    }
  }, [countdown, autoStart]);

  const handleStart = () => {
    setState('T1_CONTEXT_LOAD');
    router.push('/speaking-2026/task1/context');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">
        {/* 메인 메시지 */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Ready?
          </h1>
          <p className="text-xl text-gray-600">
            시험을 시작합니다
          </p>
        </div>

        {/* 체크리스트 */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 text-left">
            시작 전 확인사항
          </h2>

          <div className="space-y-4 text-left">
            <div className="flex items-start gap-3">
              <div className="text-green-600 text-xl">✓</div>
              <div>
                <p className="font-medium text-gray-900">조용한 환경</p>
                <p className="text-sm text-gray-600">주변에 소음이 없는지 확인했습니다</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="text-green-600 text-xl">✓</div>
              <div>
                <p className="font-medium text-gray-900">마이크 작동</p>
                <p className="text-sm text-gray-600">마이크가 정상 작동하는지 테스트했습니다</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="text-green-600 text-xl">✓</div>
              <div>
                <p className="font-medium text-gray-900">헤드폰/스피커</p>
                <p className="text-sm text-gray-600">헤드폰 또는 스피커 음량을 조절했습니다</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="text-green-600 text-xl">✓</div>
              <div>
                <p className="font-medium text-gray-900">인터넷 연결</p>
                <p className="text-sm text-gray-600">안정적인 인터넷 연결을 확인했습니다</p>
              </div>
            </div>
          </div>
        </div>

        {/* 경고 메시지 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
          <p className="text-amber-900 text-sm">
            <strong>⚠️ 주의:</strong> 시험이 시작되면 이전 문제로 돌아갈 수 없습니다. (Forward-Only)
          </p>
        </div>

        {/* 시작 버튼 */}
        {!autoStart ? (
          <div className="space-y-4">
            <button
              onClick={() => setAutoStart(true)}
              className="w-full px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-xl"
            >
              시험 시작 🎤
            </button>
            <button
              onClick={handleStart}
              className="w-full px-8 py-4 border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg font-semibold transition-all"
            >
              지금 시작하기
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-6xl font-bold text-indigo-600 animate-pulse">
              {countdown}
            </div>
            <p className="text-gray-600">곧 시험이 시작됩니다...</p>
          </div>
        )}
      </div>
    </div>
  );
}
