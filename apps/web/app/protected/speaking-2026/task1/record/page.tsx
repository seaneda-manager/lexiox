'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSpeakingSession } from '../../_hooks/useSpeakingSession';
import { Timer } from '../../_components/Timer';

const RECORDING_DURATIONS: Record<number, number> = {
  0: 8, 1: 9, 2: 10, 3: 11, 4: 12, 5: 8, 6: 9,
};

/**
 * Task 1 Record 페이지
 * - 즉시 녹음 (준비시간 0)
 * - 비프음 + MediaRecorder.start()
 * - 8-12초 카운트다운 프로그레스 바
 * - 자동으로 Record 종료 후 다음 아이템
 */
export default function Task1RecordPage() {
  const router = useRouter();
  const { currentItemIndex, saveRecording, nextItem, setState } = useSpeakingSession();
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const maxDuration = RECORDING_DURATIONS[currentItemIndex] || 10;

  useEffect(() => {
    // 비프음 재생 후 녹음 시작
    playBeepAndStartRecording();

    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [currentItemIndex]);

  // recordingTime 업데이트
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      setRecordingTime((prev) => Math.min(prev + 1, maxDuration));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, maxDuration]);

  const playBeepAndStartRecording = async () => {
    // 비프음 재생
    const beep = new Audio('/audio/beep.mp3');
    await beep.play().catch(() => console.warn('Beep failed'));

    // MediaRecorder 시작
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const itemId = `task1_item_${currentItemIndex + 1}`;
        saveRecording(itemId, blob, recordingTime);
        proceedToNextOrComplete();
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access failed:', err);
    }
  };

  const proceedToNextOrComplete = async () => {
    const itemId = `task1_item_${currentItemIndex + 1}`;

    if (currentItemIndex < 6) {
      // 다음 아이템으로
      nextItem();
      setState('T1_CONTEXT_LOAD');
      router.push('/speaking-2026/task1');
    } else {
      // Task 1 완료, Task 2로 이동
      nextItem();
      setState('T2_INTERVIEW_INTRO');
      router.push('/speaking-2026/task2');
    }
  };

  const handleTimeUp = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      {/* 타이머 */}
      <Timer
        initialSeconds={maxDuration}
        onTimeUp={handleTimeUp}
        isRunning={isRecording}
      />

      <div className="max-w-2xl w-full mt-16">
        {/* 상태 라벨 */}
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">
          {isRecording ? '🎤 RESPOND NOW' : 'Preparing...'}
        </h2>

        {/* 마이크 표시 (RED) */}
        <div className="flex justify-center mb-12">
          <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
            <span className="text-4xl">🎤</span>
          </div>
        </div>

        {/* 프로그레스 바 */}
        <div className="mb-12">
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${(recordingTime / maxDuration) * 100}%` }}
            />
          </div>
          <p className="text-center text-gray-600 text-sm mt-2">
            {maxDuration - recordingTime}s remaining
          </p>
        </div>

        {/* 진행 상황 */}
        <div className="text-center text-gray-600">
          <p className="text-sm">Item {currentItemIndex + 1} of 7</p>
        </div>
      </div>
    </div>
  );
}
