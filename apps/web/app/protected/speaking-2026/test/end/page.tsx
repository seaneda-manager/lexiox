'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSpeakingTestRunner } from '../../_hooks/useSpeakingTestRunner';

export default function EndPage() {
  const router = useRouter();
  const { state } = useSpeakingTestRunner();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    const uploadAudios = async () => {
      try {
        const formData = new FormData();

        // 11개의 오디오 파일을 FormData에 추가
        state.recordedAudios.forEach((audio) => {
          formData.append(`audio_${audio.itemNumber}`, audio.audioBlob, `item_${audio.itemNumber}.webm`);
        });

        // 메타데이터 추가
        formData.append('totalItems', '11');
        formData.append('timestamp', new Date().toISOString());

        // 서버로 전송
        const response = await fetch('/api/speaking-2026/submit', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        setUploadProgress(100);
        setIsUploading(false);

        // 3초 후 test results 페이지로 이동
        setTimeout(() => {
          router.push('/speaking-2026/test-results/' + result.resultId);
        }, 3000);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed');
        setIsUploading(false);
      }
    };

    uploadAudios();
  }, [state.recordedAudios, router]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center space-y-6">
        <div className="text-6xl mb-4">
          {uploadError ? '⚠️' : isUploading ? '📤' : '✅'}
        </div>

        <h1 className="text-3xl font-bold text-gray-900">
          {uploadError ? 'Upload Failed' : isUploading ? 'Uploading Results' : 'Test Complete!'}
        </h1>

        {isUploading ? (
          <div className="space-y-6">
            <p className="text-gray-600">
              11개의 음성 데이터를 서버로 전송 중입니다...
            </p>

            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-blue-600 h-4 transition-all duration-500"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">{uploadProgress}% 완료</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-900 text-sm">
                잠시만 기다려주세요. 페이지를 닫지 마세요.
              </p>
            </div>
          </div>
        ) : uploadError ? (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-900 text-sm mb-2">
                <strong>오류 발생:</strong> {uploadError}
              </p>
              <p className="text-red-800 text-xs">
                다시 시도하거나 선생님께 문의해주세요.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
              >
                다시 시도
              </button>
              <button
                onClick={() => router.back()}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
              >
                뒤로가기
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-gray-600">
                모든 답변이 안전하게 업로드 되었습니다.
              </p>
              <p className="text-sm text-gray-500">
                결과 분석 중... 곧 채점 페이지로 이동합니다.
              </p>
            </div>

            <div className="animate-pulse">
              <div className="flex justify-center gap-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
            </div>
          </div>
        )}

        {/* 녹음된 아이템 수 표시 */}
        <div className="text-xs text-gray-400 mt-8">
          {state.recordedAudios.length} / 11 items recorded
        </div>
      </div>
    </div>
  );
}
