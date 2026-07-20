'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSpeakingSession } from '../../_hooks/useSpeakingSession';
import { Timer } from '../../_components/Timer';

/**
 * Task 2 Response 페이지
 * - 45초 답변 녹음
 * - 준비시간 0 (즉시 녹음)
 * - 수동 [Next] 가능
 * - 45초 후 자동 진행
 */
export default function Task2ResponsePage() {
  const router = useRouter();
  const { currentItemIndex, saveRecording, nextItem, setState, endSession } =
    useSpeakingSession();
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const itemInTask = currentItemIndex - 7;
  const maxDuration = 45;

  useEffect(() => {
    playBeepAndStartRecording();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [currentItemIndex]);

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
        const itemId = `task2_question_${itemInTask + 1}`;
        saveRecording(itemId, blob, recordingTime);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // 시간 카운트
      let elapsed = 0;
      timerRef.current = setInterval(() => {
        elapsed++;
        setRecordingTime(elapsed);
      }, 1000);
    } catch (err) {
      console.error('Microphone access failed:', err);
    }
  };

  const stopRecordingAndProceed = async () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    if (timerRef.current) clearInterval(timerRef.current);

    // Task 2가 마지막 아이템이면 섹션 완료
    if (itemInTask === 3) {
      // 4번째 질문 (8-11 중 마지막)
      endSession();
      router.push('/speaking-2026/complete');
    } else {
      // 다음 질문으로
      nextItem();
      setState('T2_STREAMING_QUESTION');
      router.push('/speaking-2026/task2/listen-question');
    }
  };

  const handleTimeUp = () => {
    stopRecordingAndProceed();
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
        {/* 헤더 */}
        <h2 className="text-lg font-bold text-gray-900 text-center mb-8">
          Talk about the topic specified by the interviewer.
        </h2>

        {/* 거대한 디지털 타이머 */}
        <div className="flex justify-center mb-12">
          <div className="text-8xl font-mono font-bold text-blue-600">
            {String(maxDuration - recordingTime).padStart(2, '0')}
          </div>
        </div>

        {/* 원형 프로그레스 표시 */}
        <div className="flex justify-center mb-12">
          <div className="relative w-40 h-40">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* 배경 원 */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="4"
              />
              {/* 진행도 원 */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#2563EB"
                strokeWidth="4"
                strokeDasharray={`${(recordingTime / maxDuration) * 282.7} 282.7`}
                className="transition-all"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-sm text-gray-600">Progress</div>
                <div className="text-lg font-bold text-gray-900">
                  {Math.round((recordingTime / maxDuration) * 100)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 마이크 표시 */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
            <span className="text-3xl">🎤</span>
          </div>
        </div>

        {/* 진행 상황 */}
        <div className="text-center text-gray-600 mb-8">
          <p className="text-sm">Question {itemInTask + 1} of 4</p>
          <p className="text-sm">Item {currentItemIndex + 1} of 11</p>
        </div>

        {/* Next 버튼 (수동 스킵 가능) */}
        <div className="flex justify-center">
          <button
            onClick={stopRecordingAndProceed}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
