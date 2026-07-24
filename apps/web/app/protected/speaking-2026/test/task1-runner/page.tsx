'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSpeakingTestRunner } from '../../_hooks/useSpeakingTestRunner';
import { AudioTimingController } from '../../_components/AudioTimingController';

/**
 * Task 1 Runner: Listen & Repeat (7 items)
 *
 * 시퀀스:
 * 1. 문장 오디오 재생 (7~10초)
 * 2. 오디오 끝남 → 비프음 "띵~" 재생 (200ms)
 * 3. 비프음 끝남 → 즉시 마이크 녹음 시작 (준비 시간 0초)
 * 4. 8~12초 카운트다운 타이머 동작
 * 5. 시간 종료 → 자동으로 다음 문항
 */
export default function Task1RunnerPage() {
  const router = useRouter();
  const { state, startRecording, stopRecording, moveToNextItem, startAudioLevelMonitoring } =
    useSpeakingTestRunner();

  const [currentAudioUrl, setCurrentAudioUrl] = useState<string>('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(10);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecordingActive, setIsRecordingActive] = useState(false);

  const currentItemNum = state.currentItemNumber;
  const isTask1Item = currentItemNum >= 1 && currentItemNum <= 7;

  // Task 1 아이템 데이터 (예시)
  const task1Items = [
    { id: 1, audioUrl: '/audio/speaking/task1/item1.mp3' },
    { id: 2, audioUrl: '/audio/speaking/task1/item2.mp3' },
    { id: 3, audioUrl: '/audio/speaking/task1/item3.mp3' },
    { id: 4, audioUrl: '/audio/speaking/task1/item4.mp3' },
    { id: 5, audioUrl: '/audio/speaking/task1/item5.mp3' },
    { id: 6, audioUrl: '/audio/speaking/task1/item6.mp3' },
    { id: 7, audioUrl: '/audio/speaking/task1/item7.mp3' },
  ];

  const currentItem = task1Items[currentItemNum - 1];

  // 마이크 스트림 시작
  useEffect(() => {
    (async () => {
      try {
        const mediaStream = await startAudioLevelMonitoring();
        setStream(mediaStream);
      } catch (err) {
        alert('마이크 접근 권한이 필요합니다.');
        router.back();
      }
    })();
  }, [startAudioLevelMonitoring, router]);

  // 아이템 시작 시 오디오 재생
  useEffect(() => {
    if (isTask1Item && currentItem) {
      setCurrentAudioUrl(currentItem.audioUrl);
      setRecordingTimeLeft(10); // Task 1은 10초 고정
      setIsPlayingAudio(true);
    }
  }, [isTask1Item, currentItem, currentItemNum]);

  // 오디오 재생 끝남 (AudioTimingController에서 호출)
  const handleAudioEnd = () => {
    setIsPlayingAudio(false);
  };

  // 비프음 끝남 → 즉시 녹음 시작 (준비 시간 없음!)
  const handleBeepEnd = () => {
    if (stream) {
      startRecording(stream);
      setIsRecordingActive(true);
      setRecordingTimeLeft(10);
    }
  };

  // 녹음 타이머
  useEffect(() => {
    if (!isRecordingActive) return;

    if (recordingTimeLeft > 0) {
      const timer = setTimeout(() => {
        setRecordingTimeLeft(recordingTimeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // 시간 종료 → 자동으로 다음 문항
      stopRecording();
      setIsRecordingActive(false);
      setTimeout(() => {
        if (currentItemNum === 7) {
          // Task 1 마지막 문항 → Task 2 Direction으로 이동
          router.push('/speaking-2026/test/task2-direction');
        } else {
          moveToNextItem();
        }
      }, 500);
    }
  }, [recordingTimeLeft, isRecordingActive, stopRecording, moveToNextItem, currentItemNum, router]);

  if (!isTask1Item) {
    return <div>Loading Task 1...</div>;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      {/* 오디오 타이밍 컨트롤러 */}
      <AudioTimingController
        audioUrl={currentAudioUrl}
        beepStartUrl="/audio/beep-short.mp3"
        onAudioEnd={handleAudioEnd}
        onBeepEnd={handleBeepEnd}
        isPlaying={isPlayingAudio}
      />

      <div className="max-w-3xl w-full">
        {/* 진행 바 */}
        <div className="mb-8">
          <p className="text-sm text-gray-600 mb-2">
            Question {currentItemNum} of 11 (Task 1: Listen & Repeat)
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(currentItemNum / 11) * 100}%` }}
            />
          </div>
        </div>

        {/* 콘텐츠 영역 */}
        <div className="border border-gray-300 rounded-lg p-8 text-center mb-8">
          {isPlayingAudio ? (
            <div className="space-y-4">
              <div className="text-6xl">🎙️</div>
              <p className="text-lg font-semibold text-gray-900">Listening...</p>
              <p className="text-sm text-gray-600">문장을 잘 들어주세요. 곧 따라 말하기가 시작됩니다.</p>
            </div>
          ) : isRecordingActive ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="w-12 h-12 bg-red-500 rounded-full animate-pulse" />
              </div>
              <p className="text-lg font-semibold text-red-600">Recording...</p>
              <p className="text-4xl font-bold text-gray-900">{recordingTimeLeft}초</p>
              <p className="text-sm text-gray-600">문장을 따라 말씀해주세요.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-6xl">✓</div>
              <p className="text-lg font-semibold text-gray-900">준비 중...</p>
            </div>
          )}
        </div>

        {/* 마이크 레벨 미터 */}
        {isRecordingActive && (
          <div className="space-y-2 mb-8">
            <p className="text-xs text-gray-600">마이크 레벨: {Math.round(state.audioLevelPercent)}%</p>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all"
                style={{ width: `${state.audioLevelPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
