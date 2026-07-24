'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useSpeakingTestRunner } from '../../_hooks/useSpeakingTestRunner';
import { AudioTimingController } from '../../_components/AudioTimingController';
import type { SpeakingTest2026, SpeakingTaskListenRepeat2026 } from '@/models/speaking-2026';

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
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();
  const { state, startRecording, stopRecording, moveToNextItem, startAudioLevelMonitoring } =
    useSpeakingTestRunner();

  const [test, setTest] = useState<SpeakingTest2026 | null>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string>('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(10);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const currentItemNum = state.currentItemNumber;
  const isTask1Item = currentItemNum >= 1 && currentItemNum <= 7;

  // 테스트 정보 조회
  useEffect(() => {
    const testId = searchParams.get('testId');
    if (!testId) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase
          .from('speaking_tests_2026')
          .select('*')
          .eq('id', testId)
          .single();

        if (error) throw error;
        setTest(data as SpeakingTest2026);
      } catch (err) {
        console.error('Failed to load test:', err);
        alert('테스트를 불러올 수 없습니다.');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams, supabase, router]);

  // Task 1 정보
  const listenRepeatTask = test?.tasks.find(
    (t) => t.type === 'listen_repeat'
  ) as SpeakingTaskListenRepeat2026 | undefined;
  const currentSentence = listenRepeatTask?.sentences[currentItemNum - 1];

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
    if (isTask1Item && currentSentence) {
      console.log('Task 1 Item:', {
        itemNum: currentItemNum,
        sentence: currentSentence.text,
        audioUrl: currentSentence.audioUrl,
        speakingSeconds: currentSentence.speakingSeconds,
      });
      setCurrentAudioUrl(currentSentence.audioUrl || '');
      setRecordingTimeLeft(currentSentence.speakingSeconds || 10);
      setIsPlayingAudio(true);
    }
  }, [isTask1Item, currentSentence, currentItemNum]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="animate-pulse text-center">
          <p>테스트를 불러오는 중...</p>
        </div>
      </div>
    );
  }

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
          ) : !isRecordingActive && currentAudioUrl && !currentAudioUrl.includes('/audio/') ? (
            <div className="space-y-4">
              <p className="text-sm text-amber-600">⚠️ 오디오 파일을 찾을 수 없습니다.</p>
              <button
                onClick={handleTestAudio}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 font-semibold transition"
              >
                🎵 테스트 오디오 재생
              </button>
              <p className="text-xs text-gray-500">테스트 오디오로 녹음을 시작합니다 (3초)</p>
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
