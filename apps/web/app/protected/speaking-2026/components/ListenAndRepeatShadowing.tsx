"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getStageConfig, getScoreForStage } from "@/lib/speaking-game/stage-config";

export type ShadowingItem = {
  id: string;
  sentence: string;
  audioUrl?: string;
  imageUrl?: string;
};

type Phase = "idle" | "playing" | "done";

type Props = {
  items: ShadowingItem[];
  globalImageUrl?: string;
  mode?: "study" | "test";
  stage?: number; // Stage 1-50
  startStage?: number; // 시작 stage (기본값: 1)
  totalQuestionOffset?: number;
  totalQuestions?: number;
  onStageComplete?: (stage: number, score: number) => void; // stage 완료 콜백
  onComplete?: (result: { itemId: string; blob: Blob | null }[]) => void;
};

const MODE_CONFIG = {
  test: {
    showText: false,
    allowReplay: false,
    headerBg: "#1A2B4C",
    headerText: "TOEFL iBT - Speaking - Task 1: Shadowing",
  },
  study: {
    showText: true,
    allowReplay: true,
    headerBg: "#2563EB",
    headerText: "Speaking Practice - Shadowing",
  },
};

function WaveformBar({ isActive, volume }: { isActive: boolean; volume: number }) {
  const bars = Array.from({ length: 24 });
  return (
    <div className="flex items-center justify-center gap-[3px]" style={{ width: 400, height: 80 }}>
      {bars.map((_, i) => {
        const seed = Math.sin(i * 2.5) * 0.5 + 0.5;
        const h = isActive ? Math.max(4, seed * volume * 60 + 4) : 4;
        return (
          <div
            key={i}
            className="rounded-full transition-all duration-75"
            style={{
              width: 10,
              height: h,
              backgroundColor: isActive ? "#FF6B6B" : "#CBD5E1",
            }}
          />
        );
      })}
    </div>
  );
}

export default function ListenAndRepeatShadowing({
  items,
  globalImageUrl,
  mode = "test",
  stage = 1,
  startStage = 1,
  totalQuestionOffset = 0,
  totalQuestions = items.length,
  onStageComplete,
  onComplete,
}: Props) {
  const config = MODE_CONFIG[mode];
  const stageConfig = getStageConfig(stage);
  const stageScore = getScoreForStage(stage);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [volume, setVolume] = useState(0);
  const [recordings, setRecordings] = useState<{ itemId: string; blob: Blob | null }[]>([]);
  const [nextDisabled, setNextDisabled] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalScore, setTotalScore] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const current = items[index];
  const questionNumber = totalQuestionOffset + index;
  const imageUrl = current?.imageUrl ?? globalImageUrl;
  const progressPct = totalQuestions > 0 ? (questionNumber / totalQuestions) * 100 : 0;

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopVolumeTracker = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setVolume(0);
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
      setVolume(avg);
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
    clearTimer();
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      startVolumeTracker(stream);

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = chunksRef.current.length
          ? new Blob(chunksRef.current, { type: "audio/webm" })
          : null;
        setRecordings((prev) => {
          const filtered = prev.filter((r) => r.itemId !== current.id);
          return [...filtered, { itemId: current.id, blob }];
        });
      };

      recorder.start();
      setPhase("playing");
      setElapsedTime(0);

      // 음성 길이만큼 타이머 실행
      clearTimer();
      timerRef.current = window.setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } catch {
      alert("마이크 권한을 확인해 주세요.");
    }
  }, [current]);

  const playAudio = useCallback(() => {
    setNextDisabled(true);

    if (current?.audioUrl) {
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = current.audioUrl;

      // 음성 로드되면 길이 저장
      audioRef.current.onloadedmetadata = () => {
        setAudioDuration(Math.round(audioRef.current?.duration || 0));
      };

      // 음성 재생 시작과 동시에 녹음 시작
      audioRef.current.onplay = () => {
        void startRecording();
      };

      // 음성 종료 시 녹음 종료
      audioRef.current.onended = () => {
        stopRecording();
        setPhase("done");
        setNextDisabled(false);
      };

      audioRef.current.play().catch(() => {
        void startRecording();
      });
    } else {
      // 오디오 없으면 3초만 재생 (개발용)
      setAudioDuration(3);
      void startRecording();
      setTimeout(() => {
        stopRecording();
        setPhase("done");
        setNextDisabled(false);
      }, 3000);
    }
  }, [current, startRecording, stopRecording]);

  // 문항 전환 시 자동 재생
  useEffect(() => {
    setPhase("idle");
    setElapsedTime(0);
    setAudioDuration(0);
    setTimeout(() => playAudio(), 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const handleNext = () => {
    if (nextDisabled) return;
    stopRecording();
    if (index < items.length - 1) {
      setIndex((i) => i + 1);
    } else {
      // Stage 완료
      const finalScore = totalScore + stageScore;
      setTotalScore(finalScore);
      onStageComplete?.(stage, finalScore);
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

  const phaseText = phase === "playing"
    ? "🎤 SHADOW THE SPEAKER"
    : phase === "done"
    ? "✓ Complete"
    : "Get ready...";

  const phaseColor = phase === "playing" ? "#FF6B6B" : "#333333";

  const progressbarValue = audioDuration > 0 ? (elapsedTime / audioDuration) * 100 : 0;

  return (
    <div
      className="flex flex-col"
      style={{ minHeight: "100vh", backgroundColor: "#F4F6F9", fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-6 shrink-0"
        style={{ height: 60, backgroundColor: config.headerBg }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>{config.headerText}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
            🎮 Stage {stage} / {stageConfig.description}
          </span>
        </div>
        <div className="flex items-center" style={{ gap: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#FFD700" }}>
            ⭐ {totalScore + stageScore}
          </div>
          {config.allowReplay && (
            <button
              className="flex items-center gap-1 rounded border border-slate-400 bg-transparent px-3 text-white"
              style={{ width: 90, height: 36, fontSize: 13 }}
            >
              🔊 Replay
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={nextDisabled || phase === "playing"}
            className="rounded font-semibold text-white disabled:opacity-40"
            style={{
              width: 100,
              height: 36,
              fontSize: 13,
              backgroundColor: "#0073E6",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {index < items.length - 1 ? "Next >" : "Submit"}
          </button>
        </div>
      </header>

      {/* ── Main Body ── */}
      <main className="flex flex-1 items-center justify-center" style={{ padding: "0 60px" }}>
        <div className="flex items-center justify-center gap-8 w-full">
          {/* 좌측: Visual/Text Card */}
          <div
            className="relative shrink-0 overflow-hidden rounded-lg"
            style={{
              width: 800,
              height: 600,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              backgroundColor: "#E2E8F0",
            }}
          >
            {config.showText && !imageUrl ? (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-8 text-center">
                <p
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#1A2B4C",
                    lineHeight: 1.6,
                    maxWidth: 600,
                  }}
                >
                  {current?.sentence}
                </p>
              </div>
            ) : imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Shadowing prompt"
                  className="h-full w-full"
                  style={{ objectFit: "contain" }}
                />
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400 text-sm">
                {config.showText ? "음성을 따라하세요" : "음성을 주의 깊게 따라하세요"}
              </div>
            )}
          </div>

          {/* 우측: Status & Audio Card */}
          <div
            className="flex shrink-0 flex-col items-center justify-center gap-8 rounded-lg bg-white"
            style={{
              width: 600,
              height: 600,
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            }}
          >
            {/* 상태 텍스트 */}
            <p
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: phaseColor,
                letterSpacing: "0.01em",
              }}
            >
              {phaseText}
            </p>

            {/* Waveform */}
            <WaveformBar isActive={phase === "playing"} volume={volume} />

            {/* 진행 시간 & 진행률 바 */}
            <div className="space-y-2 text-center">
              {phase === "playing" && audioDuration > 0 && (
                <p className="font-mono text-sm" style={{ color: "#FF6B6B" }}>
                  {String(Math.floor(elapsedTime / 60)).padStart(2, "0")}:{String(elapsedTime % 60).padStart(2, "0")} / {String(Math.floor(audioDuration / 60)).padStart(2, "0")}:{String(Math.round(audioDuration) % 60).padStart(2, "0")}
                </p>
              )}
              <div
                className="overflow-hidden rounded-full"
                style={{ width: 450, height: 12, backgroundColor: "#EEEEEE" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300 linear"
                  style={{
                    width: phase === "playing" ? `${progressbarValue}%` : phase === "done" ? "100%" : "0%",
                    backgroundColor: "#FF6B6B",
                  }}
                />
              </div>
            </div>

            {/* 안내 텍스트 */}
            <p style={{ fontSize: 12, color: "#999", textAlign: "center", maxWidth: 500 }}>
              음성이 재생되는 동안 최대한 자연스럽게 따라 말하세요.<br />
              발음, 리듬, 악센트를 그대로 모방하는 것이 목표입니다.
            </p>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer
        className="flex items-center justify-between shrink-0 border-t px-6"
        style={{ height: 60, backgroundColor: "#FFFFFF", borderColor: "#E0E0E0" }}
      >
        <span style={{ fontSize: 15, fontWeight: 500, color: "#333333" }}>
          Question {questionNumber} of {totalQuestions}
        </span>
        <div className="overflow-hidden rounded-full" style={{ width: 240, height: 8, backgroundColor: "#E0E0E0" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, backgroundColor: "#0073E6" }}
          />
        </div>
      </footer>
    </div>
  );
}
