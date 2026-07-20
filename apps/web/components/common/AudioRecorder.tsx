// apps/web/components/common/AudioRecorder.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AudioRecorderProps = {
  label: string;
  onRecorded: (blob: Blob) => Promise<void> | void;
  disabled?: boolean;
};

export default function AudioRecorder({
  label,
  onRecorded,
  disabled,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isReady, setIsReady] = useState(true); // 마이크 사용 가능 여부
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // 언마운트 시 녹음 중이면 정리
  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
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

        try {
          await onRecorded(blob);
        } catch (err) {
          console.error("onRecorded 처리 중 에러:", err);
        }

        // 스트림 정리
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("마이크 접근 실패:", err);
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

  const isButtonDisabled = disabled || !isReady;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isButtonDisabled}
      className={[
        "inline-flex items-center justify-center rounded-md px-3 py-2 text-[11px] font-medium",
        "border transition",
        isButtonDisabled
          ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
          : isRecording
          ? "border-red-400 bg-red-50 text-red-700 hover:bg-red-100"
          : "border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-50",
      ].join(" ")}
    >
      {isRecording ? "⏹ 녹음 중지" : label}
    </button>
  );
}
