'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSpeakingSession } from '../../_hooks/useSpeakingSession';

/**
 * Task 1 Context Page
 * - 배경 이미지 표시
 * - 5초 컨텍스트 오디오 재생
 * - 자동으로 Listen 화면으로 전환
 */
const CONTEXT_SCENARIOS = [
  {
    id: 'campus_dorm',
    title: 'Campus Dorm',
    description: 'Two students are having a conversation in their dorm room.',
    imageUrl: 'https://images.unsplash.com/photo-1552832860-d0883b5eef89?w=1024&h=768&fit=crop',
    audioUrl: '/audio/context-dorm.mp3',
  },
];

export default function Task1ContextPage() {
  const router = useRouter();
  const { currentItemIndex, setState } = useSpeakingSession();
  const [contextLoaded, setContextLoaded] = useState(false);

  useEffect(() => {
    const scenario = CONTEXT_SCENARIOS[0];

    let audio: HTMLAudioElement | null = null;
    try {
      audio = new Audio(scenario.audioUrl);
      audio.play().catch(() => {
        console.warn('Context audio failed to play, continuing anyway');
      });
    } catch (err) {
      console.warn('Audio creation failed, continuing anyway');
    }

    const timeout = setTimeout(() => {
      setState('T1_STREAMING_PROMPT');
      router.push('/speaking-2026/task1/listen');
    }, 5000);

    return () => {
      clearTimeout(timeout);
      if (audio) audio.pause();
    };
  }, [setState, router]);

  const scenario = CONTEXT_SCENARIOS[0];

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <img
          src={scenario.imageUrl}
          alt={scenario.title}
          className="w-full h-96 object-cover rounded-lg mb-8 shadow-lg"
        />

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {scenario.title}
          </h2>
          <p className="text-gray-700 text-lg">
            {scenario.description}
          </p>
        </div>

        <div className="text-center text-gray-600">
          <p className="text-sm mb-2">Item {currentItemIndex + 1} of 7</p>
          <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${((currentItemIndex + 1) / 7) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
