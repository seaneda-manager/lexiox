'use client';

import { useEffect, useRef, useState } from 'react';

interface AudioTimingControllerProps {
  audioUrl: string;
  beepStartUrl?: string;    // 시작 비프음 (Task 1: 짧은 비프)
  beepEndUrl?: string;      // 종료 비프음 (Task 2: 긴 비프)
  onAudioEnd: () => void;   // 오디오 종료
  onBeepEnd: () => void;    // 비프음 종료 직후 (즉시 녹음 시작)
  isPlaying: boolean;
}

/**
 * AudioTimingController
 *
 * 핵심 시퀀스:
 * 1. 성우 오디오 재생
 * 2. 오디오 끝남 (onended 이벤트)
 * 3. 비프음 재생
 * 4. 비프음 끝남 (onended 이벤트)
 * 5. onBeepEnd() 콜백 → 녹음 즉시 시작 (준비 시간 없음)
 */
export function AudioTimingController({
  audioUrl,
  beepStartUrl,
  beepEndUrl,
  onAudioEnd,
  onBeepEnd,
  isPlaying,
}: AudioTimingControllerProps) {
  const audioElementRef = useRef<HTMLAudioElement>(null);
  const beepElementRef = useRef<HTMLAudioElement>(null);
  const [isInBeepPhase, setIsInBeepPhase] = useState(false);

  // 성우 오디오 재생
  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch((err) => {
        console.error('Failed to play audio:', err);
      });
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [isPlaying]);

  // 성우 오디오가 끝나면 → 비프음 재생
  const handleAudioEnded = () => {
    onAudioEnd();
    setIsInBeepPhase(true);

    // 비프음 바로 재생 (딜레이 최소화)
    const beep = beepElementRef.current;
    if (beep) {
      beep.currentTime = 0;
      beep.play().catch((err) => {
        console.error('Failed to play beep:', err);
        // 비프음 재생 실패 시 즉시 녹음 시작
        onBeepEnd();
      });
    } else {
      // 비프음 파일이 없으면 즉시 녹음 시작
      onBeepEnd();
    }
  };

  // 오디오 재생 에러
  const handleAudioError = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    console.error('Audio playback error:', {
      error: audio.error?.message,
      src: audio.src,
      networkState: audio.networkState,
      readyState: audio.readyState,
    });
    // 오디오 재생 실패 시 바로 비프음 진행
    handleAudioEnded();
  };

  // 비프음이 끝나면 → 즉시 녹음 시작 (준비 시간 없음!)
  const handleBeepEnded = () => {
    setIsInBeepPhase(false);
    onBeepEnd(); // 이 함수에서 MediaRecorder.start() 호출
  };

  return (
    <>
      {/* 숨겨진 오디오 엘리먼트: 성우 음성 */}
      <audio
        ref={audioElementRef}
        src={audioUrl}
        onEnded={handleAudioEnded}
        onError={handleAudioError}
        style={{ display: 'none' }}
      />

      {/* 숨겨진 오디오 엘리먼트: 비프음 */}
      {(beepStartUrl || beepEndUrl) && (
        <audio
          ref={beepElementRef}
          src={isInBeepPhase ? beepStartUrl || beepEndUrl : ''}
          onEnded={handleBeepEnded}
          style={{ display: 'none' }}
        />
      )}
    </>
  );
}
