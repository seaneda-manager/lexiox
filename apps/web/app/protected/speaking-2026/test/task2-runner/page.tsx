'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSpeakingTestRunner } from '../../_hooks/useSpeakingTestRunner';
import { AudioTimingController } from '../../_components/AudioTimingController';

/**
 * Task 2 Runner: Take an Interview (4 items)
 *
 * 시퀀스:
 * 1. 면접관 질문 오디오 재생 (7~15초)
 * 2. 오디오 끝남 → 비프음 "띠딕~" 재생 (200ms)
 * 3. 비프음 끝남 → 즉시 마이크 녹음 시작 (준비 시간 0초)
 * 4. 45초 카운트다운 타이머 동작
 * 5. 사용자가 [답변 완료] 버튼으로 조기 종료 가능
 * 6. 시간 종료 또는 조기 종료 → 자동으로 다음 문항
 */
export default function Task2RunnerPage() {
  const router = useRouter();
  const { state, startRecording, stopRecording, moveToNextItem, startAudioLevelMonitoring } =
    useSpeakingTestRunner();

  const [currentAudioUrl, setCurrentAudioUrl] = useState<string>('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(45);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecordingActive, setIsRecordingActive] = useState(false);

  const currentItemNum = state.currentItemNumber;
  const isTask2Item = currentItemNum >= 8 && currentItemNum <= 11;

  // Task 2 아이템 데이터 (예시)
  const task2Items = [
    { id: 8, questionNumber: 1, audioUrl: '/audio/speaking/task2/q1.mp3' },
    { id: 9, questionNumber: 2, audioUrl: '/audio/speaking/task2/q2.mp3' },
    { id: 10, questionNumber: 3, audioUrl: '/audio/speaking/task2/q3.mp3' },
    { id: 11, questionNumber: 4, audioUrl: '/audio/speaking/task2/q4.mp3' },
  ];

  const currentItem = task2Items[currentItemNum - 8];

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
    if (isTask2Item && currentItem) {
      setCurrentAudioUrl(currentItem.audioUrl);
      setRecordingTimeLeft(45); // Task 2는 45초 고정
      setIsPlayingAudio(true);
    }
  }, [isTask2Item, currentItem, currentItemNum]);

  // 오디오 재생 끝남
  const handleAudioEnd = () => {
    setIsPlayingAudio(false);
  };

  // 비프음 끝남 → 즉시 녹음 시작
  const handleBeepEnd = () => {
    if (stream) {
      startRecording(stream);
      setIsRecordingActive(true);
      setRecordingTimeLeft(45);
    }
  };

  // 테스트 오디오 재생 (파일이 없을 때)
  const handleTestAudio = () => {
    setIsPlayingAudio(true);
    setTimeout(() => {
      setIsPlayingAudio(false);
      handleBeepEnd();
    }, 3000); // 3초 후 녹음 시작
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
      // 시간 종료 → 자동으로 다음 문항 또는 END
      stopRecording();
      setIsRecordingActive(false);
      setTimeout(() => {
        if (currentItemNum === 11) {
          // Task 2 마지막 문항 → End Page로 이동
          router.push('/speaking-2026/test/end');
        } else {
          moveToNextItem();
        }
      }, 500);
    }
  }, [recordingTimeLeft, isRecordingActive, stopRecording, moveToNextItem, currentItemNum, router]);

  // 사용자가 [답변 완료] 버튼 클릭
  const handleFinishEarly = () => {
    stopRecording();
    setIsRecordingActive(false);
    setTimeout(() => {
      moveToNextItem();
    }, 500);
  };

  if (!isTask2Item) {
    return <div>Loading Task 2...</div>;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      {/* 오디오 타이밍 컨트롤러 */}
      <AudioTimingController
        audioUrl={currentAudioUrl}
        beepStartUrl="/audio/beep-start.mp3"
        onAudioEnd={handleAudioEnd}
        onBeepEnd={handleBeepEnd}
        isPlaying={isPlayingAudio}
      />

      <div className="max-w-3xl w-full">
        {/* 진행 바 */}
        <div className="mb-8">
          <p className="text-sm text-gray-600 mb-2">
            Question {currentItemNum} of 11 (Task 2: Interview)
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
              <div className="text-6xl">👨‍💼</div>
              <p className="text-lg font-semibold text-gray-900">Listening to Question...</p>
              <p className="text-sm text-gray-600">질문을 잘 들어주세요. 곧 답변 시간이 시작됩니다.</p>
            </div>
          ) : !isRecordingActive && currentAudioUrl && !currentAudioUrl.includes('/audio/') ? (
            <div className="space-y-4">
              <p className="text-sm text-amber-600">⚠️ 오디오 파일을 찾을 수 없습니다.</p>
              <button
                onClick={handleTestAudio}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 font-semibold transition"
              >
                🎵 테스트 오디오 재생
              </button>
              <p className="text-xs text-gray-500">테스트 오디오로 45초 답변 시간이 시작됩니다</p>
            </div>
          ) : isRecordingActive ? (
            <div className="space-y-6">
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 bg-red-500 rounded-full animate-pulse" />
              </div>
              <div>
                <p className="text-lg font-semibold text-red-600 mb-2">Recording...</p>
                <p className="text-6xl font-bold text-gray-900">{recordingTimeLeft}초</p>
              </div>
              <p className="text-sm text-gray-600">질문에 대해 답변해주세요. (최대 45초)</p>

              {/* 답변 완료 버튼 */}
              <button
                onClick={handleFinishEarly}
                className="mt-6 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
              >
                ✓ 답변 완료
              </button>
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
