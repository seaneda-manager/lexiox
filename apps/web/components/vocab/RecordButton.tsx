// 🔽 필요하다면 파일 최상단 근처에 넣거나, 별도 파일로 분리해서 import 해도 됩니다.
// 예: apps/web/components/vocab/RecordButton.tsx

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

type RecordButtonProps = {
  label: string;
  onRecorded: (blob: Blob) => Promise<void> | void;
  disabled?: boolean;
};

export function RecordButton({ label, onRecorded, disabled }: RecordButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isReady, setIsReady] = useState(true); // 마이크 접근 가능 여부
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // 🔹 컴포넌트 unmount 시 녹음 중지/정리
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];

        // ✅ 상위에서 전달받은 콜백 실행
        try {
          await onRecorded(blob);
        } catch (e) {
          console.error("onRecorded 처리 중 에러:", e);
        }

        // 스트림 정리
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("마이크에 접근할 수 없습니다:", err);
      setIsReady(false);
      alert("마이크 권한을 허용해 주세요.");
    }
  }, [onRecorded]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.stop();
      setIsRecording(false);
    }
  }, []);

  const handleClick = useCallback(() => {
    if (disabled || !isReady) return;

    if (!isRecording) {
      void startRecording();
    } else {
      stopRecording();
    }
  }, [disabled, isReady, isRecording, startRecording, stopRecording]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || !isReady}
      className={[
        "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium",
        "border",
        disabled || !isReady
          ? "opacity-50 cursor-not-allowed"
          : isRecording
          ? "bg-red-100 border-red-400"
          : "bg-white hover:bg-gray-50 border-gray-300",
      ].join(" ")}
    >
      {isRecording ? "⏹ 녹음 중지" : label}
    </button>
  );
}
