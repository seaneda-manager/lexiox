'use client';

import { useState, useRef } from 'react';
import { useWebcam } from '@/lib/hooks/useWebcam';

interface PhotoCaptureProps {
  onCapture: (photoData: string) => void;
  onCancel: () => void;
}

export function PhotoCapture({ onCapture, onCancel }: PhotoCaptureProps) {
  const { videoRef, canvasRef, isActive, isLoading, error, startCamera, stopCamera, takeSnapshot } = useWebcam();
  const [preview, setPreview] = useState<string | null>(null);

  const handleStart = async () => {
    await startCamera();
  };

  const handleCapture = () => {
    const photo = takeSnapshot();
    if (photo) {
      setPreview(photo);
    }
  };

  const handleConfirm = () => {
    if (preview) {
      onCapture(preview);
      stopCamera();
      setPreview(null);
    }
  };

  const handleRetake = () => {
    setPreview(null);
  };

  const handleCancel = () => {
    stopCamera();
    setPreview(null);
    onCancel();
  };

  if (preview) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg overflow-hidden bg-gray-100">
          <img src={preview} alt="Captured" className="w-full h-auto" />
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRetake}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
          >
            다시 촬영
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

  if (isActive) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg overflow-hidden bg-black aspect-video">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        </div>
        <canvas ref={canvasRef} className="hidden" />
        <div className="flex gap-3">
          <button
            onClick={handleCapture}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
          >
            📸 사진 촬영
          </button>
          <button
            onClick={handleCancel}
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
        {isLoading ? '카메라 시작 중...' : '📸 카메라로 사진 촬영'}
      </button>
    </div>
  );
}
