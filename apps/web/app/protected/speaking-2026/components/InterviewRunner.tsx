"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSpeechTranscript } from "@/lib/speech/use-speech-transcript";
import SpeakingTestLayout2026, { SpeakingHeaderLabel, SpeakingSubHeaderLabel } from "@/components/speaking/SpeakingTestLayout2026";
import VolumeControl from "@/components/speaking/VolumeControl";
import SpeakingVisual from "@/components/speaking/SpeakingVisual";
import ResponseTimeBadge from "@/components/speaking/ResponseTimeBadge";

export type InterviewQuestion = {
  id: string;
  question: string;
  audioUrl?: string;
  topic?: string;
  answerSeconds?: number;
};

type Phase = "idle" | "listening" | "prepare" | "recording" | "done";

type RecordingResult = {
  questionId: string;
  blob: Blob | null;
  /** 녹음과 나란히 받은 전사. 브라우저가 STT를 지원하지 않으면 빈 문자열. */
  transcript?: string;
  /** 업로드된 오디오의 Public URL */
  audioUrl?: string | null;
};

type Props = {
  questions: InterviewQuestion[];
  interviewerImageUrl?: string;
  mode?: "study" | "test";
  defaultAnswerSeconds?: number;
  totalQuestionOffset?: number;
  totalQuestions?: number;
  autoStartAfterAudio?: boolean;
  volume: number;
  onVolumeChange: (volume: number) => void;
  onComplete?: (results: RecordingResult[]) => void;
};

const MODE_CONFIG = {
  test: {
    prepareSeconds: 15,
    responseSeconds: 45,
  },
  study: {
    prepareSeconds: 15,
    responseSeconds: 60,
  },
};

const nextButtonStyle: React.CSSProperties = {
  height: 32,
  padding: "0 16px",
  fontSize: 12,
  fontWeight: 700,
  border: "none",
  borderRadius: 4,
  backgroundColor: "#0073E6",
  color: "#FFFFFF",
  cursor: "pointer",
};

function playBeep(ctx: AudioContext, freq = 880, duration = 0.15) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

export default function InterviewRunner({
  questions,
  interviewerImageUrl,
  mode = "test",
  defaultAnswerSeconds = 45,
  totalQuestionOffset = 8,
  totalQuestions = 11,
  autoStartAfterAudio = true,
  volume,
  onVolumeChange,
  onComplete,
}: Props) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [timeLeft, setTimeLeft] = useState(0);
  const [recordings, setRecordings] = useState<RecordingResult[]>([]);
  const [nextDisabled, setNextDisabled] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const current = questions[index];
  const answerSeconds = current?.answerSeconds ?? defaultAnswerSeconds;
  const questionNumber = totalQuestionOffset + index;

  const { start: startTranscript, stop: stopTranscript } = useSpeechTranscript();
  const pendingTranscriptRef = useRef("");

  // 오디오 blob을 업로드하고 Public URL 반환
  const uploadAudioBlob = useCallback(async (blob: Blob | null): Promise<string | null> => {
    if (!blob) return null;

    try {
      const formData = new FormData();
      formData.append("file", blob);
      formData.append("testId", current?.id ?? "demo");
      formData.append("taskId", current?.id ?? "extra");

      const res = await fetch("/api/speaking-2026/upload-audio", {
        method: "POST",
        body: formData,
      });

      const data = await res.json() as { ok: boolean; publicUrl?: string; error?: string };
      if (data.ok && data.publicUrl) return data.publicUrl;
      console.warn("Audio upload failed:", data.error);
      return null;
    } catch (e) {
      console.warn("Audio upload error:", e);
      return null;
    }
  }, [current?.id]);

  const clearTimer = () => {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    // 전사를 확정해 둔다. recorder.onstop이 이 값을 결과에 붙인다.
    pendingTranscriptRef.current = stopTranscript();
    clearTimer();
  }, [stopTranscript]);

  const startRecording = useCallback(async () => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    playBeep(audioCtxRef.current, 880, 0.15);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = chunksRef.current.length ? new Blob(chunksRef.current, { type: "audio/webm" }) : null;
        const transcript = pendingTranscriptRef.current;
        const audioUrl = await uploadAudioBlob(blob);
        pendingTranscriptRef.current = "";
        setRecordings((prev) => [
          ...prev.filter((r) => r.questionId !== current.id),
          { questionId: current.id, blob, transcript, audioUrl },
        ]);
      };

      recorder.start();
      startTranscript();
      setPhase("recording");
      setTimeLeft(answerSeconds);
      setNextDisabled(false);

      clearTimer();
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
            playBeep(audioCtxRef.current, 440, 0.2);
            setPhase("done");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      alert("마이크 권한을 확인해 주세요.");
    }
  }, [current, answerSeconds, stopRecording]);

  const playQuestion = useCallback(() => {
    setPhase("listening");
    setNextDisabled(true);

    if (current?.audioUrl) {
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = current.audioUrl;
      audioRef.current.volume = volume / 100;
      audioRef.current.onended = () => {
        if (autoStartAfterAudio) void startRecording();
        else setNextDisabled(false);
      };
      audioRef.current.play().catch(() => {
        if (autoStartAfterAudio) void startRecording();
        else setNextDisabled(false);
      });
    } else {
      // 오디오 없으면 즉시 녹음
      setTimeout(() => void startRecording(), 500);
    }
  }, [current, autoStartAfterAudio, startRecording, volume]);

  useEffect(() => {
    setPhase("idle");
    setTimeLeft(0);
    setTimeout(() => playQuestion(), 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // 헤더에서 볼륨을 바꾸면 재생 중인 오디오에도 즉시 반영
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  const handleNext = () => {
    if (nextDisabled) return;
    stopRecording();
    if (index < questions.length - 1) {
      setIndex((i) => i + 1);
    } else {
      onComplete?.(recordings);
    }
  };

  useEffect(() => {
    return () => {
      stopRecording();
      audioRef.current?.pause();
      audioCtxRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canAdvance = phase === "done" && !nextDisabled;

  return (
    <SpeakingTestLayout2026
      headerLeft={<SpeakingHeaderLabel task={2} />}
      headerRight={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />
          {canAdvance && (
            <button onClick={handleNext} style={nextButtonStyle}>
              {index < questions.length - 1 ? "Next >" : "Submit"}
            </button>
          )}
        </div>
      }
      subHeaderLeft={<SpeakingSubHeaderLabel questionInfo={`Question ${questionNumber} of ${totalQuestions}`} />}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111", textAlign: "center" }}>
          Please answer the interviewer&apos;s questions.
        </h2>

        <SpeakingVisual imageUrl={interviewerImageUrl} isPerson size={220} />

        <p style={{
          fontSize: 14,
          fontWeight: 600,
          color: phase === "recording" ? "#D9383A" : "#1A2B4C",
        }}>
          {phase === "listening" ? "Listening to question..."
            : phase === "recording" ? "● Recording..."
            : phase === "done" ? "Response complete"
            : "Preparing..."}
        </p>

        {(phase === "recording" || phase === "prepare") && (
          <ResponseTimeBadge secondsLeft={phase === "recording" ? timeLeft : null} urgent={phase === "recording" && timeLeft <= 5} />
        )}
      </div>
    </SpeakingTestLayout2026>
  );
}
