"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSpeechTranscript } from "@/lib/speech/use-speech-transcript";
import SpeakingTestLayout2026, { SpeakingHeaderLabel, SpeakingSubHeaderLabel } from "@/components/speaking/SpeakingTestLayout2026";
import VolumeControl from "@/components/speaking/VolumeControl";
import SpeakingVisual from "@/components/speaking/SpeakingVisual";
import ResponseTimeBadge from "@/components/speaking/ResponseTimeBadge";

export type ListenRepeatItem = {
  id: string;
  sentence: string;
  audioUrl?: string;
  speakingSeconds?: number;
  imageUrl?: string;
  region?: { x: number; y: number; w: number; h: number };
};

type Phase = "idle" | "listening" | "prepare" | "recording" | "done";

type Props = {
  items: ListenRepeatItem[];
  globalImageUrl?: string;
  mode?: "study" | "test";
  totalQuestionOffset?: number;
  totalQuestions?: number;
  volume: number;
  onVolumeChange: (volume: number) => void;
  onComplete?: (result: { itemId: string; blob: Blob | null; transcript?: string; audioUrl?: string | null }[]) => void;
};

const MODE_CONFIG = {
  test: {
    showText: false,
    prepareSeconds: 0,        // 준비 시간 없음 (실제 시험)
    recordingSeconds: 10,     // 8~12초 (실제 시험)
    allowReplay: false,
    allowSkip: false,
  },
  study: {
    showText: true,
    prepareSeconds: 30,       // 준비 시간 있음 (학습)
    recordingSeconds: 20,     // 여유있게 (학습)
    allowReplay: true,
    allowSkip: true,
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

// 오디오 beep 생성 (Web Audio API)
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

// Waveform visualizer
function WaveformBar({ isActive, volume }: { isActive: boolean; volume: number }) {
  const bars = Array.from({ length: 20 });
  return (
    <div className="flex items-center justify-center gap-[2px]" style={{ width: 260, height: 48 }}>
      {bars.map((_, i) => {
        const seed = Math.sin(i * 2.5) * 0.5 + 0.5;
        const h = isActive ? Math.max(3, seed * volume * 36 + 3) : 3;
        return (
          <div
            key={i}
            className="rounded-full transition-all duration-75"
            style={{
              width: 6,
              height: h,
              backgroundColor: isActive ? "#D9383A" : "#CBD5E1",
            }}
          />
        );
      })}
    </div>
  );
}

export default function ListenAndRepeatRunner({
  items,
  globalImageUrl,
  mode = "test",
  totalQuestionOffset = 1,
  totalQuestions = 11,
  volume,
  onVolumeChange,
  onComplete,
}: Props) {
  const config = MODE_CONFIG[mode];
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [timeLeft, setTimeLeft] = useState(0);
  const [micVolume, setMicVolume] = useState(0);
  const [recordings, setRecordings] = useState<{ itemId: string; blob: Blob | null; transcript?: string; audioUrl?: string | null }[]>([]);
  // 녹음과 나란히 받는 전사. speaking_results_2026의 script를 채운다.
  const { start: startTranscript, stop: stopTranscript } = useSpeechTranscript();
  const pendingTranscriptRef = useRef("");
  const [nextDisabled, setNextDisabled] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const current = items[index];
  const speakingSeconds = config.recordingSeconds;
  const questionNumber = totalQuestionOffset + index;
  const imageUrl = current?.imageUrl ?? globalImageUrl;

  const clearTimer = () => {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
  };

  // 오디오 blob을 업로드하고 Public URL 반환
  const uploadAudioBlob = useCallback(async (blob: Blob | null): Promise<string | null> => {
    if (!blob) return null;

    try {
      const formData = new FormData();
      formData.append("file", blob);
      formData.append("testId", "listen-repeat");
      formData.append("taskId", "task1");

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
  }, []);

  const stopVolumeTracker = () => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    setMicVolume(0);
  };

  const startVolumeTracker = (stream: MediaStream) => {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyserRef.current = analyser;
    analyser.fftSize = 256;
    const src = ctx.createMediaStreamSource(stream);
    src.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length / 128;
      setMicVolume(avg);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    stopVolumeTracker();
    // 전사를 확정해 둔다. recorder.onstop이 이 값을 결과에 붙인다.
    pendingTranscriptRef.current = stopTranscript();
    clearTimer();
  }, [stopTranscript]);

  const startRecording = useCallback(async () => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    playBeep(audioCtxRef.current, 880, 0.15); // 시작 beep

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      startVolumeTracker(stream);

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = chunksRef.current.length ? new Blob(chunksRef.current, { type: "audio/webm" }) : null;
        const transcript = pendingTranscriptRef.current;
        const audioUrl = await uploadAudioBlob(blob);
        pendingTranscriptRef.current = "";
        setRecordings((prev) => {
          const filtered = prev.filter((r) => r.itemId !== current.id);
          return [...filtered, { itemId: current.id, blob, transcript, audioUrl }];
        });
      };

      recorder.start();
      startTranscript();
      setPhase("recording");
      setTimeLeft(speakingSeconds);

      clearTimer();
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
            playBeep(audioCtxRef.current, 440, 0.2); // 종료 beep
            setPhase("done");
            setNextDisabled(false); // 버튼 활성화
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      alert("마이크 권한을 확인해 주세요.");
    }
  }, [current, speakingSeconds, stopRecording]);

  const playAudio = useCallback(() => {
    setPhase("listening");
    setNextDisabled(true);
    setShowPlayButton(false);

    if (current?.audioUrl) {
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = current.audioUrl;
      audioRef.current.volume = volume / 100;
      audioRef.current.onended = () => {
        // Test 모드: 준비 시간 없음 (음성 종료 → 즉시 녹음)
        if (mode === "test") {
          void startRecording();
        } else {
          // Study 모드: 준비 시간 있음
          setPhase("prepare");
          setTimeLeft(config.prepareSeconds);
          setNextDisabled(config.allowSkip ? false : true);

          clearTimer();
          timerRef.current = window.setInterval(() => {
            setTimeLeft((prev) => {
              if (prev <= 1) {
                clearTimer();
                setPhase("recording");
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          setTimeout(() => void startRecording(), 300);
        }
      };
      audioRef.current.play().catch((err) => {
        console.error("Audio play failed:", err);
        if (mode === "test") {
          void startRecording();
        } else {
          setPhase("prepare");
          setTimeLeft(config.prepareSeconds);
          setNextDisabled(config.allowSkip ? false : true);
          void startRecording();
        }
      });
    } else {
      // 오디오 없으면 2초 후 녹음 시작 (개발용)
      setTimeout(() => {
        if (mode === "test") {
          void startRecording();
        } else {
          setPhase("prepare");
          setTimeLeft(config.prepareSeconds);
          setNextDisabled(config.allowSkip ? false : true);
          setTimeout(() => void startRecording(), 500);
        }
      }, 1500);
    }
  }, [current, startRecording, config, clearTimer, mode, volume]);

  // 문항 전환 시: test 모드는 자동 재생, study 모드는 버튼 대기
  useEffect(() => {
    setPhase("idle");
    setTimeLeft(0);
    setShowPlayButton(true);
    if (mode === "test") {
      setTimeout(() => void playAudio(), 600);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, mode]);

  // 헤더에서 볼륨을 바꾸면 재생 중인 오디오에도 즉시 반영
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  const handleNext = () => {
    if (nextDisabled) return;
    stopRecording();
    if (index < items.length - 1) {
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

  const phaseText = phase === "listening" ? "Now playing..."
    : phase === "prepare" ? "Prepare to repeat..."
    : phase === "recording" ? "● Recording..."
    : phase === "done" ? "Response complete"
    : "Loading...";

  const canAdvance = phase === "done" && !nextDisabled;
  const showResponseTimer = phase === "recording" || phase === "prepare";

  return (
    <SpeakingTestLayout2026
      headerLeft={<SpeakingHeaderLabel task={1} />}
      headerRight={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />
          {canAdvance && (
            <button onClick={handleNext} style={nextButtonStyle}>
              {index < items.length - 1 ? "Next >" : "Submit"}
            </button>
          )}
        </div>
      }
      subHeaderLeft={<SpeakingSubHeaderLabel questionInfo={`Question ${questionNumber} of ${totalQuestions}`} />}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111", textAlign: "center" }}>
          Listen and repeat only once.
        </h2>

        {config.showText && !imageUrl ? (
          <div style={{ maxWidth: 480, textAlign: "center" }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: "#1A2B4C", lineHeight: 1.6 }}>
              {current?.sentence}
            </p>
          </div>
        ) : (
          <SpeakingVisual imageUrl={imageUrl} region={current?.region} isPerson={false} size={220} />
        )}

        <p style={{ fontSize: 14, fontWeight: 600, color: phase === "recording" ? "#D9383A" : "#1A2B4C" }}>
          {phaseText}
        </p>

        {showPlayButton && phase !== "recording" && (
          <button
            onClick={() => void playAudio()}
            disabled={nextDisabled}
            style={{ padding: "10px 24px", fontSize: 14, fontWeight: 700, color: "#FFFFFF", backgroundColor: "#0073E6", border: "none", borderRadius: 6, cursor: "pointer", opacity: nextDisabled ? 0.5 : 1 }}
          >
            🔊 Play Audio
          </button>
        )}

        <WaveformBar isActive={phase === "recording"} volume={micVolume} />

        {showResponseTimer && (
          <ResponseTimeBadge secondsLeft={phase === "recording" ? timeLeft : null} urgent={phase === "recording" && timeLeft <= 3} />
        )}
      </div>

      {/* Hidden Audio (test 모드 전용 상태 유지) */}
      {/* audioRef는 코드에서 동적으로 생성됨 */}
    </SpeakingTestLayout2026>
  );
}
