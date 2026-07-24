'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSpeakingSession } from '../../_hooks/useSpeakingSession';

/**
 * Directions 페이지
 * - 전체 11개 아이템 안내
 * - Task 1 (7개) + Task 2 (4개)
 * - Forward-Only 정책 안내
 */
export default function DirectionsPage() {
  const router = useRouter();
  const { setState } = useSpeakingSession();

  const handleStart = () => {
    setState('T_AUDIO_CHECK');
    router.push('/speaking-2026/test/audio-check');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        {/* 타이머는 여기서 필요 없음 */}

        {/* 헤더 */}
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">
          SPEAKING SECTION DIRECTIONS
        </h1>

        {/* 콘텐츠 박스 */}
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-8 space-y-6 mb-12">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Overview</h2>
            <p className="text-gray-700 leading-relaxed">
              This section tests your ability to speak English. There are <strong>11 items</strong> in total.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Task 1: Listen and Repeat (Items 1-7)</h2>
            <ul className="space-y-2 text-gray-700 list-disc list-inside">
              <li>You will hear a sentence. Repeat it exactly as you hear it.</li>
              <li>Preparation time: <strong>0 seconds</strong> (respond immediately)</li>
              <li>Response time: <strong>8–12 seconds</strong></li>
              <li>You cannot see the text of the sentence.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Task 2: Take an Interview (Items 8-11)</h2>
            <ul className="space-y-2 text-gray-700 list-disc list-inside">
              <li>An interviewer will ask you a question. Answer the question.</li>
              <li>Preparation time: <strong>0 seconds</strong> (respond immediately)</li>
              <li>Response time: <strong>45 seconds</strong></li>
              <li>You cannot see the text of the question.</li>
              <li>You may click [Next] to move on before 45 seconds are up.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Important Rules</h2>
            <ul className="space-y-2 text-gray-700 list-disc list-inside">
              <li><strong>Forward-Only:</strong> You cannot go back to previous items.</li>
              <li><strong>No Note-Taking:</strong> Note-taking tools are disabled.</li>
              <li><strong>Automatic Recording:</strong> All responses are automatically recorded.</li>
              <li><strong>Time Management:</strong> Manage your time carefully. The timer will auto-advance when time expires.</li>
            </ul>
          </section>

          <section className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <p className="text-yellow-800 font-semibold mb-2">⚠️ Important</p>
            <p className="text-yellow-700 text-sm">
              Once you begin, you cannot pause or return to previous items. Make sure you have a quiet environment and a working microphone before you start.
            </p>
          </section>
        </div>

        {/* Start 버튼 */}
        <div className="flex justify-center">
          <button
            onClick={handleStart}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
          >
            Dismiss Directions & Start →
          </button>
        </div>
      </div>
    </div>
  );
}
