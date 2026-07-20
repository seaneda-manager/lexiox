'use client';

import { useState } from 'react';
import Link from 'next/link';
import ListeningAdaptiveRunner from '@/components/listening/ListeningAdaptiveRunner';
import type { ListeningItem, ListeningTest2026 } from '@/components/listening/ListeningAdaptiveRunner';
import { demoTrack } from '../review/demo-session';
import type { ScriptSegment } from '@/models/listening';

/**
 * Practice Mode: Review 이후 맞춤형 재도전 페이지
 *
 * 특징:
 * - Review에서 분석한 오답 원인 기반으로 유사한 난이도의 새로운 세트 제안
 * - Study 모드와 유사한 환경 (scriptSegments 표시 + Waveform)
 * - Test 모드보다는 느슨한 진행 (pause/retry 가능)
 */

// Demo: Practice용 변환된 테스트 데이터
function createPracticeTest(): ListeningTest2026 {
  const items: ListeningItem[] = demoTrack.questions.map((q, qi) => ({
    id: `${demoTrack.id}-${q.id}`,
    number: q.number,
    kind: 'conversation' as const,
    promptTitle: 'Listen to a conversation.',
    imageSrc: 'https://via.placeholder.com/400x300?text=Office',
    audioSrc: demoTrack.audioUrl!,
    question: q.stem,
    choices: q.choices.map((c) => ({ id: c.id, text: c.text })),
    correctChoiceId: q.choices[q.correctIndices[0]]?.id,
    // ── 새로 추가: scriptSegments (Practice 모드에서만 표시) ──
    scriptSegments: demoTrack.scriptSegments as ScriptSegment[],
  }));

  return {
    meta: {
      id: `practice_${demoTrack.id}`,
      label: `Practice: ${demoTrack.title}`,
    },
    items,
  };
}

export default function ListeningPracticePage() {
  const test = createPracticeTest();
  const [isStarted, setIsStarted] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (result) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-12">
        <div className="rounded-xl border bg-white p-8 shadow-sm space-y-4 text-center">
          <div className="text-5xl">
            {result.scorePercent >= 75 ? '🎉' : result.scorePercent >= 50 ? '👍' : '💪'}
          </div>
          <h2 className="text-2xl font-bold">Practice Complete!</h2>
          <p className="text-lg text-gray-600">
            Score: <span className="font-semibold text-2xl">{result.scorePercent}%</span>
          </p>
          <p className="text-sm text-gray-500">
            You answered {result.correctCount} out of {result.total} questions correctly.
          </p>

          <div className="flex justify-center gap-3 pt-4">
            <Link
              href="/updated-listening"
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Back to Listening
            </Link>
            <button
              onClick={() => {
                setIsStarted(false);
                setResult(null);
              }}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isStarted) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
        <div className="rounded-xl border bg-white p-8 shadow-sm space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Practice Mode</h1>
            <p className="text-gray-600">Strengthen your listening skills with targeted practice</p>
          </div>

          <div className="space-y-4 pt-6">
            <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4 space-y-2">
              <h3 className="font-semibold text-indigo-900">📝 About This Practice Set</h3>
              <ul className="text-sm text-indigo-800 space-y-1 list-inside list-disc">
                <li>Same difficulty level as your Review</li>
                <li>Similar question types and topics</li>
                <li>Audio script visible for learning</li>
                <li>No time pressure (pause/retry allowed)</li>
              </ul>
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-2">
              <h3 className="font-semibold text-amber-900">💡 Practice Tips</h3>
              <ul className="text-sm text-amber-800 space-y-1 list-inside list-disc">
                <li>Listen carefully to signal words (However, Therefore, etc.)</li>
                <li>Focus on the main idea first, then details</li>
                <li>Use the script to improve listening accuracy</li>
                <li>Take notes on key information</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center text-sm text-gray-600 pt-4">
              <div>
                <div className="text-2xl font-bold text-gray-900">{test.items.length}</div>
                <div>Questions</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">~10 min</div>
                <div>Expected Time</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <Link
              href="/updated-listening"
              className="flex-1 rounded-lg border px-4 py-3 text-center text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              onClick={() => setIsStarted(true)}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-3 text-center text-sm font-medium text-white hover:bg-indigo-700"
            >
              Start Practice →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더: Practice 모드 표시 */}
      <div className="mx-auto max-w-5xl px-4 py-4 text-sm text-gray-600">
        <div className="inline-block rounded-full bg-indigo-100 text-indigo-700 px-3 py-1 font-medium">
          📚 Practice Mode
        </div>
      </div>

      {/* ListeningAdaptiveRunner 사용 (scriptSegments 지원) */}
      <ListeningAdaptiveRunner
        test={test}
        onFinish={(result) => setResult(result)}
      />
    </div>
  );
}
