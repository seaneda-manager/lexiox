'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Task 2 Direction
 * - Task 2 방향 안내 오디오 자동 재생
 * - 오디오 종료 → 자동으로 task2-runner로 이동
 */
export default function Task2DirectionPage() {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // 오디오 재생 시작
    audio.play().catch((err) => {
      console.error('Failed to play direction audio:', err);
      // 재생 실패 시 5초 후 진행
      setTimeout(() => {
        router.push('/speaking-2026/test/task2-runner');
      }, 5000);
    });
  }, [router]);

  const handleAudioEnd = () => {
    // 오디오 종료 → 즉시 task2-runner로 이동
    const testId = new URLSearchParams(window.location.search).get('testId');
    const url = testId
      ? `/speaking-2026/test/task2-runner?testId=${testId}`
      : '/speaking-2026/test/task2-runner';
    router.push(url);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <audio
        ref={audioRef}
        src="/audio/speaking/task2-direction.mp3"
        onEnded={handleAudioEnd}
        style={{ display: 'none' }}
      />

      <div className="max-w-2xl w-full text-center space-y-6">
        <div className="text-6xl mb-4">👨‍💼</div>

        <h1 className="text-2xl font-bold text-gray-900">Task 2: Take an Interview</h1>

        <div className="bg-gray-50 border border-gray-300 rounded-lg p-6 space-y-4">
          <p className="text-gray-700 leading-relaxed">
            An interviewer will ask you a question. <strong>Answer the question.</strong>
          </p>
          <ul className="text-left space-y-2 text-gray-700">
            <li>✓ <strong>4 questions</strong> in total</li>
            <li>✓ <strong>0 seconds</strong> preparation time</li>
            <li>✓ <strong>45 seconds</strong> response time per question</li>
            <li>✓ You cannot see the text of the question</li>
            <li>✓ You may click [마치기] to finish early</li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-900 text-sm">
            📢 Listening to directions... The interview will begin shortly.
          </p>
        </div>

        <div className="animate-pulse">
          <div className="w-16 h-16 bg-blue-500 rounded-full mx-auto"></div>
        </div>
      </div>
    </div>
  );
}
