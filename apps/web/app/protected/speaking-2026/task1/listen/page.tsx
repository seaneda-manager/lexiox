'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSpeakingSession } from '../../_hooks/useSpeakingSession';

/**
 * Task 1 Listen 페이지
 * - 문장 듣기 (텍스트 절대 표시 안 함)
 * - 프로그레스 바 없음 (시간 예측 방지)
 * - 키보드/마우스 오버라이드 완전 차단
 */
export default function Task1ListenPage() {
  const router = useRouter();
  const { currentItemIndex, setState } = useSpeakingSession();
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // 키보드 이벤트 차단 (되감기, 일시정지 등)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', ' ', 'p'].includes(e.key)) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // 문장 오디오 재생
    let audio: HTMLAudioElement | null = null;
    let playTimer: NodeJS.Timeout | null = null;

    try {
      audio = new Audio('/audio/sentence-' + (currentItemIndex + 1) + '.mp3');
      setIsPlaying(true);

      audio.play().catch(() => {
        console.warn('Sentence audio failed to play, continuing anyway');
        setIsPlaying(false);
        playTimer = setTimeout(() => proceedToRecord(), 8000);
      });

      audio.onended = () => {
        setIsPlaying(false);
        // 0.2초 후 Record 화면으로 전환
        playTimer = setTimeout(() => proceedToRecord(), 200);
      };

      // 8초 타임아웃 (오디오가 끝나지 않으면 강제 진행)
      playTimer = setTimeout(() => {
        setIsPlaying(false);
        proceedToRecord();
      }, 8000);
    } catch (err) {
      console.warn('Audio creation failed, continuing anyway');
      setIsPlaying(false);
      playTimer = setTimeout(() => proceedToRecord(), 8000);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (audio) audio.pause();
      if (playTimer) clearTimeout(playTimer);
    };
  }, [currentItemIndex]);

  const proceedToRecord = () => {
    setState('T1_RECORDING_ACTIVE');
    router.push('/speaking-2026/task1/record');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* 헤더 */}
        <h2 className="text-xl font-bold text-gray-900 text-center mb-12">
          Listen to the sentence.
        </h2>

        {/* 스피커 아이콘 애니메이션 */}
        <div className="flex justify-center mb-12">
          <div
            className={`text-8xl transition-opacity ${
              isPlaying ? 'opacity-100 animate-pulse' : 'opacity-50'
            }`}
          >
            🔊
          </div>
        </div>

        {/* 진행 상황 */}
        <div className="text-center text-gray-600">
          <p className="text-sm mb-4">Item {currentItemIndex + 1} of 7</p>
          <div className="w-full h-1 bg-gray-200 rounded-full">
            <div
              className="h-full bg-blue-600"
              style={{ width: `${((currentItemIndex + 1) / 7) * 100}%` }}
            />
          </div>
        </div>

        {/* 상태 메시지 */}
        <div className="text-center mt-12 text-gray-600">
          {isPlaying && <p>Playing...</p>}
          {!isPlaying && <p>Preparing to record...</p>}
        </div>
      </div>
    </div>
  );
}
