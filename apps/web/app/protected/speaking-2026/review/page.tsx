'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSpeakingSession } from '../_hooks/useSpeakingSession';
import { WaveformPlayer } from './_components/WaveformPlayer';
import { TranscriptWithHighlights } from './_components/TranscriptWithHighlights';

/**
 * Review 모듈 메인 페이지
 * - 아이템 선택
 * - 녹음 데이터 로드
 */
interface ReviewItem {
  itemId: string;
  taskType: 1 | 2;
  itemNumber: number;
  prompt: string;
  duration: number;
}

const REVIEW_ITEMS: ReviewItem[] = [
  // Task 1 (7개)
  ...Array.from({ length: 7 }, (_, i) => ({
    itemId: `task1_item_${i + 1}`,
    taskType: 1 as const,
    itemNumber: i + 1,
    prompt: 'Repeat the sentence you heard.',
    duration: 8 + (i % 5),
  })),
  // Task 2 (4개)
  ...Array.from({ length: 4 }, (_, i) => ({
    itemId: `task2_question_${i + 1}`,
    taskType: 2 as const,
    itemNumber: i + 1,
    prompt: `Answer question ${i + 1}.`,
    duration: 45,
  })),
];

export default function ReviewPage() {
  const router = useRouter();
  const { session } = useSpeakingSession();
  const [selectedItemId, setSelectedItemId] = useState<string>(REVIEW_ITEMS[0].itemId);

  const selectedItem = useMemo(
    () => REVIEW_ITEMS.find((item) => item.itemId === selectedItemId),
    [selectedItemId]
  );

  const selectedRecording = useMemo(() => {
    if (!session || !selectedItem) return null;
    return session.recordings.get(selectedItemId);
  }, [session, selectedItemId]);

  const task1Items = REVIEW_ITEMS.filter((item) => item.taskType === 1);
  const task2Items = REVIEW_ITEMS.filter((item) => item.taskType === 2);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Review</h1>
          <p className="text-gray-600">
            Select an item to review your response with detailed analysis.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* 좌측: 아이템 리스트 */}
          <div className="lg:col-span-1 space-y-6">
            {/* Task 1 */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold text-gray-900 mb-3 text-sm">
                Task 1: Listen & Repeat
              </h3>
              <div className="space-y-2">
                {task1Items.map((item) => (
                  <button
                    key={item.itemId}
                    onClick={() => setSelectedItemId(item.itemId)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition ${
                      selectedItemId === item.itemId
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    Item {item.itemNumber}
                    {selectedRecording && (
                      <span className="text-xs ml-2">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Task 2 */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold text-gray-900 mb-3 text-sm">
                Task 2: Interview
              </h3>
              <div className="space-y-2">
                {task2Items.map((item) => (
                  <button
                    key={item.itemId}
                    onClick={() => setSelectedItemId(item.itemId)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition ${
                      selectedItemId === item.itemId
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    Q{item.itemNumber}
                    {selectedRecording && (
                      <span className="text-xs ml-2">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 행동 */}
            <button
              onClick={() => router.push('/home')}
              className="w-full px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-semibold transition"
            >
              Back to Home
            </button>
          </div>

          {/* 우측: 상세 분석 */}
          <div className="lg:col-span-3">
            {selectedItem && selectedRecording ? (
              <div className="bg-white rounded-lg shadow p-6 space-y-6">
                {/* 아이템 정보 */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedItem.taskType === 1
                      ? `Task 1: Item ${selectedItem.itemNumber}`
                      : `Task 2: Question ${selectedItem.itemNumber}`}
                  </h2>
                  <p className="text-gray-600">{selectedItem.prompt}</p>
                </div>

                {/* Waveform Player */}
                <WaveformPlayer
                  audioBlob={selectedRecording}
                  duration={selectedItem.duration}
                />

                {/* STT 스크립트 */}
                <TranscriptWithHighlights itemId={selectedItemId} />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-600 text-lg">
                  {selectedRecording
                    ? 'Loading analysis...'
                    : 'No recording found for this item.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
