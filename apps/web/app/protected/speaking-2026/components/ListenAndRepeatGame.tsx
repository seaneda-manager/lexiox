"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type ListenRepeatGameItem = {
  id: string;
  sentence: string;
  audioUrl?: string;
  imageUrl?: string;
};

type Phase = "idle" | "listening" | "recording" | "done" | "feedback";

type Props = {
  items: ListenRepeatGameItem[];
  globalImageUrl?: string;
  onComplete?: (result: { itemId: string; blob: Blob | null }[]) => void;
};

function WaveformBar({ isActive, volume }: { isActive: boolean; volume: number }) {
  const bars = Array.from({ length: 20 });
  return (
    <div className="flex items-center justify-center gap-1" style={{ width: 300, height: 60 }}>
      {bars.map((_, i) => {
        const seed = Math.sin(i * 2) * 0.5 + 0.5;
        const h = isActive ? Math.max(3, seed * volume * 50 + 3) : 3;
        return (
          <div
            key={i}
            className="rounded-full transition-all duration-75"
            style={{
              width: 8,
              height: h,
              backgroundColor: isActive ? "#FF6B6B" : "#E0E0E0",
            }}
          />
        );
      })}
    </div>
  );
}

export default function ListenAndRepeatGame({
  items,
  globalImageUrl,
  onComplete,
}: Props) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [volume, setVolume] = useState(0);
  const [recordings, setRecordings] = useState<{ itemId: string; blob: Blob | null }[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const current = items[index];
  const imageUrl = current?.imageUrl ?? globalImageUrl;
  const recordingSeconds = 20;

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
        setPhase("feedback");
        setScore((s) => s + 10);
        setStreak((st) => st + 1);
      };

      recorder.start();
      setPhase("recording");

      clearTimer();
      timerRef.current = window.setInterval(() => {
        setVolume((v) => Math.max(0, v - 0.05));
      }, 100);

      setTimeout(() => {
        stopRecording();
      }, recordingSeconds * 1000);
    } catch {
      alert("마이크 권한을 확인해 주세요.");
    }
  }, [current, stopRecording]);

  const playAudio = useCallback(() => {
    setPhase("listening");

    if (current?.audioUrl) {
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = current.audioUrl;
      audioRef.current.onended = () => {
        setTimeout(() => void startRecording(), 500);
      };
      audioRef.current.play().catch(() => {
        void startRecording();
      });
    } else {
      setTimeout(() => {
        void startRecording();
      }, 1500);
    }
  }, [current, startRecording]);

  useEffect(() => {
    setPhase("idle");
    setTimeout(() => playAudio(), 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const handleNext = () => {
    stopRecording();
    if (index < items.length - 1) {
      setIndex((i) => i + 1);
    } else {
      onComplete?.(recordings);
    }
  };

  const handleRetry = () => {
    setPhase("idle");
    setTimeout(() => playAudio(), 600);
  };

  useEffect(() => {
    return () => {
      stopRecording();
      audioRef.current?.pause();
      audioCtxRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const phaseText = phase === "listening"
    ? "🎧 Listen carefully..."
    : phase === "recording"
    ? "🎤 SPEAK NOW!"
    : phase === "feedback"
    ? "✨ Great job!"
    : phase === "done"
    ? "🎉 Awesome!"
    : "Get ready...";

  const progressPct = items.length > 0 ? ((index + 1) / items.length) * 100 : 0;

  return (
    <div
      className="flex flex-col"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-6 shrink-0"
        style={{
          height: 70,
          backgroundColor: "rgba(0,0,0,0.2)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="text-white">
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            🎮 Listen & Repeat Game
          </h1>
        </div>
        <div
          className="flex items-center gap-6 text-white"
          style={{ fontSize: 18, fontWeight: 600 }}
        >
          <div>⭐ {score}</div>
          <div>🔥 {streak}</div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex flex-1 items-center justify-center" style={{ padding: "40px 60px" }}>
        <div className="flex flex-col items-center gap-8 w-full max-w-2xl">
          {/* Image */}
          {imageUrl && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                width: "100%",
                height: 400,
                boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                backgroundColor: "#fff",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Speaking prompt"
                className="w-full h-full"
                style={{ objectFit: "cover" }}
              />
            </div>
          )}

          {/* Status */}
          <div
            className="text-center text-white"
            style={{
              fontSize: 28,
              fontWeight: 700,
              textShadow: "0 2px 10px rgba(0,0,0,0.2)",
            }}
          >
            {phaseText}
          </div>

          {/* Waveform */}
          <WaveformBar isActive={phase === "recording"} volume={volume} />

          {/* Action Buttons */}
          <div className="flex gap-4">
            {phase === "feedback" && (
              <>
                <button
                  onClick={handleRetry}
                  className="px-8 py-3 rounded-xl font-semibold text-white"
                  style={{ backgroundColor: "#FF6B6B" }}
                >
                  🔄 Try Again
                </button>
                <button
                  onClick={handleNext}
                  className="px-8 py-3 rounded-xl font-semibold text-white"
                  style={{ backgroundColor: "#4ECDC4" }}
                >
                  ✓ Next
                </button>
              </>
            )}
          </div>

          {/* Progress */}
          <div className="w-full">
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", marginBottom: 8 }}>
              {index + 1} of {items.length}
            </p>
            <div
              className="overflow-hidden rounded-full"
              style={{
                width: "100%",
                height: 10,
                backgroundColor: "rgba(255,255,255,0.2)",
              }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, backgroundColor: "#FFD700" }}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
