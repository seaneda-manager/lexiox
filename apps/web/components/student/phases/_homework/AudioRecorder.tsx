'use client';

import { useState } from 'react';
import { useAudioRecorder } from '@/lib/hooks/useAudioRecorder';

interface AudioRecorderProps {
  onRecordComplete: (audioBlob: Blob) => void;
  onCancel: () => void;
  maxDuration?: number;
}

export function AudioRecorder({ onRecordComplete, onCancel, maxDuration = 300 }: AudioRecorderProps) {
  const {
    isRecording,
    isLoading,
    error,
    duration,
    durationFormatted,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder();

  const [preview, setPreview] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const isMaxDurationReached = duration >= maxDuration;

  const handleStart = async () => {
    await startRecording();
  };

  const handleStop = async () => {
    const audioBlob = await stopRecording();
    if (audioBlob) {
      setPreview(audioBlob);
      setPreviewUrl(URL.createObjectURL(audioBlob));
    }
  };

  const handleAutoStop = async () => {
    if (isMaxDurationReached) {
      await handleStop();
    }
  };

  const handleConfirm = () => {
    if (preview) {
      onRecordComplete(preview);
      setPreview(null);
      setPreviewUrl(null);
    }
  };

  const handleRetry = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreview(null);
    setPreviewUrl(null);
  };

  const handleCancel = () => {
    cancelRecording();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreview(null);
    setPreviewUrl(null);
    onCancel();
  };

  // Auto-stop at max duration
  if (isRecording && isMaxDurationReached) {
    handleAutoStop();
  }

  if (preview && previewUrl) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-gray-100 p-4">
          <div className="text-sm text-gray-600 mb-2">녹음 시간: {durationFormatted}</div>
          <audio
            controls
            src={previewUrl}
            className="w-full"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
          >
            다시 녹음
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
          >
            확인
          </button>
        </div>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-blue-50 p-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
            <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
          </div>
          <div className="text-3xl font-bold text-blue-900 mb-2">{durationFormatted}</div>
          <p className="text-sm text-blue-700">녹음 중...</p>
          {isMaxDurationReached && (
            <p className="text-xs text-red-600 mt-2">최대 시간 도달</p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleStop}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
          >
            ⏹️ 녹음 완료
          </button>
          <button
            onClick={cancelRecording}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700 text-sm">
          {error}
        </div>
      )}
      <button
        onClick={handleStart}
        disabled={isLoading}
        className="w-full px-4 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? '마이크 시작 중...' : '🎤 음성 녹음 시작'}
      </button>
      <p className="text-xs text-gray-500 text-center">
        최대 {maxDuration}초까지 녹음할 수 있습니다
      </p>
    </div>
  );
}
