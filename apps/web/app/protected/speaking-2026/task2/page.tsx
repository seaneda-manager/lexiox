'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSpeakingSession } from '../_hooks/useSpeakingSession';

/**
 * Task 2 Interview Intro 페이지
 * - 인터뷰어 아바타
 * - 대주제 소개 오디오
 * - 자동 전환
 */
const INTERVIEW_TOPICS = [
  {
    topic: 'Environmental Policy on Campus',
    introAudioUrl: '/audio/interview-intro-1.mp3',
  },
];

export default function Task2IntroPage() {
  const router = useRouter();
  const { currentItemIndex, setState } = useSpeakingSession();
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const topic = INTERVIEW_TOPICS[0];

    // 인터뷰 소개 오디오 재생
    const audio = new Audio(topic.introAudioUrl);
    setIsPlaying(true);

    audio.play().catch(() => {
      console.warn('Interview intro audio failed');
      setTimeout(() => proceedToQuestion(), 3000);
    });

    audio.onended = () => {
      setIsPlaying(false);
      // 0.5초 후 Question 듣기로 전환
      setTimeout(() => proceedToQuestion(), 500);
    };

    return () => {
      audio.pause();
    };
  }, []);

  const proceedToQuestion = () => {
    setState('T2_STREAMING_QUESTION');
    router.push('/speaking-2026/task2/listen-question');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* 헤더 */}
        <h2 className="text-lg font-bold text-gray-900 text-center mb-8">
          Interview Segment
        </h2>

        {/* 인터뷰어 아바타 (대리 이미지) */}
        <div className="flex justify-center mb-12">
          <img
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop"
            alt="Interviewer"
            className="w-48 h-48 rounded-full object-cover shadow-lg"
          />
        </div>

        {/* 상태 메시지 */}
        <div className="text-center text-gray-600">
          {isPlaying && (
            <p className="text-lg font-semibold text-blue-600">
              Listening to introduction...
            </p>
          )}
          {!isPlaying && (
            <p className="text-lg font-semibold text-gray-700">
              Preparing questions...
            </p>
          )}
        </div>

        {/* Task 진행 상황 */}
        <div className="text-center text-gray-600 mt-12">
          <p className="text-sm">Task 2: Interview</p>
        </div>
      </div>
    </div>
  );
}
