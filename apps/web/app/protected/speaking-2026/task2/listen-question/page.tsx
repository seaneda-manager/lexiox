'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSpeakingSession } from '../../_hooks/useSpeakingSession';

/**
 * Task 2 Listen Question 페이지
 * - 인터뷰 질문 청취
 * - 텍스트 절대 표시 안 함
 * - 자동 Response 화면으로 전환
 */
export default function Task2ListenQuestionPage() {
  const router = useRouter();
  const { currentItemIndex, setState } = useSpeakingSession();
  const [isPlaying, setIsPlaying] = useState(false);
  const itemInTask = currentItemIndex - 7; // Task 2는 item 8-11 (0-3 in array)
  const totalQuestions = 4;

  useEffect(() => {
    // 키보드 이벤트 차단
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', ' ', 'p'].includes(e.key)) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // 질문 오디오 재생
    const audio = new Audio(`/audio/question-${itemInTask + 1}.mp3`);
    setIsPlaying(true);

    audio.play().catch(() => {
      console.warn('Question audio failed');
      setTimeout(() => proceedToResponse(), 8000);
    });

    audio.onended = () => {
      setIsPlaying(false);
      // 딜레이 없이 즉시 Response 화면으로
      setTimeout(() => proceedToResponse(), 0);
    };

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      audio.pause();
    };
  }, [itemInTask]);

  const proceedToResponse = () => {
    setState('T2_RECORDING_RESPONSE');
    router.push('/speaking-2026/task2/response');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* 헤더 */}
        <h2 className="text-xl font-bold text-gray-900 text-center mb-4">
          Listen to the question.
        </h2>
        <p className="text-gray-600 text-center mb-12">
          Question {itemInTask + 1} of {totalQuestions}
        </p>

        {/* 인터뷰어 아바타 */}
        <div className="flex justify-center mb-12">
          <img
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop"
            alt="Interviewer"
            className={`w-48 h-48 rounded-full object-cover shadow-lg transition-opacity ${
              isPlaying ? 'opacity-100' : 'opacity-75'
            }`}
          />
        </div>

        {/* 스피커 아이콘 */}
        <div className="flex justify-center mb-8">
          <div
            className={`text-6xl transition-opacity ${
              isPlaying ? 'opacity-100 animate-pulse' : 'opacity-50'
            }`}
          >
            🔊
          </div>
        </div>

        {/* 진행 상황 */}
        <div className="text-center text-gray-600">
          <p className="text-sm mb-2">Item {currentItemIndex + 1} of 11</p>
          <div className="w-full h-1 bg-gray-200 rounded-full">
            <div
              className="h-full bg-blue-600"
              style={{ width: `${((currentItemIndex + 1) / 11) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
