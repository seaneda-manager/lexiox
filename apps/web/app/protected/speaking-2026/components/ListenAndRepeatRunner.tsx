"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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
  onComplete?: (result: { itemId: string; blob: Blob | null }[]) => void;
};

const MODE_CONFIG = {
  test: {
    showText: false,
    prepareSeconds: 0,        // 준비 시간 없음 (실제 시험)
    recordingSeconds: 10,     // 8~12초 (실제 시험)
    allowReplay: false,
    allowSkip: false,
    headerBg: "#1A2B4C",
    headerText: "TOEFL 2026 - Speaking - Task 1: Listen and Repeat",
    description: "Listen to the sentence and repeat it within 10 seconds. No preparation time.",
  },
  study: {
    showText: true,
    prepareSeconds: 30,       // 준비 시간 있음 (학습)
    recordingSeconds: 20,     // 여유있게 (학습)
    allowReplay: true,
    allowSkip: true,
    headerBg: "#2563EB",
    headerText: "Speaking Practice - Task 1: Listen and Repeat",
    description: "Listen to the sentence and repeat it. You have time to prepare.",
  },
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
  onComplete,
}: Props) {
  const config = MODE_CONFIG[mode];
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [timeLeft, setTimeLeft] = useState(0);
  const [volume, setVolume] = useState(0);
  const [recordings, setRecordings] = useState<{ itemId: string; blob: Blob | null }[]>([]);
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

  const stopVolumeTracker = () => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
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
      recorder.onstop = () => {
        const blob = chunksRef.current.length ? new Blob(chunksRef.current, { type: "audio/webm" }) : null;
        setRecordings((prev) => {
          const filtered = prev.filter((r) => r.itemId !== current.id);
          return [...filtered, { itemId: current.id, blob }];
        });
      };

      recorder.start();
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
    console.log('🎵 playAudio called:', { audioUrl: current?.audioUrl, mode });
    setPhase("listening");
    setNextDisabled(true);
    setShowPlayButton(false);

    if (current?.audioUrl) {
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = current.audioUrl;
      console.log('📻 Audio src set to:', current.audioUrl);
      audioRef.current.onended = () => {
        console.log('✅ Audio ended');
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
        console.error('❌ Audio play failed:', err);
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
      console.warn('⚠️ No audioUrl found');
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
  }, [current, startRecording, config, clearTimer, mode]);

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

  const phaseText = phase === "listening" ? "Listening to prompt..."
    : phase === "prepare" ? "Prepare to repeat..."
    : phase === "recording" ? "● RECORDING"
    : phase === "done" ? "Done"
    : "Loading...";

  const phaseColor = phase === "recording" ? "#D9383A"
    : phase === "listening" ? "#1A2B4C"
    : "#333333";

  const progressPct = totalQuestions > 0 ? (questionNumber / totalQuestions) * 100 : 0;

  return (
    <div className="flex flex-col" style={{ minHeight: "100vh", backgroundColor: "#F4F6F9", fontFamily: "Arial, Helvetica, sans-serif" }}>

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 shrink-0" style={{ height: 70, backgroundColor: config.headerBg }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
            {config.headerText}
          </span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
            {config.description}
          </span>
        </div>
        <div className="flex items-center" style={{ gap: 12 }}>
          {config.allowReplay && (
            <button className="flex items-center gap-1 rounded border border-slate-400 bg-transparent px-3 text-white" style={{ width: 90, height: 36, fontSize: 13 }}>
              🔊 Replay
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={nextDisabled || phase === "recording" || phase === "listening"}
            className="rounded font-semibold text-white disabled:opacity-40"
            style={{ width: 100, height: 36, fontSize: 13, backgroundColor: "#0073E6", border: "none", borderRadius: 4, cursor: "pointer" }}
          >
            {index < items.length - 1 ? "Next >" : "Submit"}
          </button>
        </div>
      </header>

      {/* ── Main Body ── */}
      <main className="flex flex-1 items-center justify-center" style={{ padding: "0 60px" }}>
        <div className="flex items-center justify-center gap-8 w-full">

          {/* 좌측: Visual/Text Card */}
          <div className="relative shrink-0 overflow-hidden rounded-lg"
            style={{ width: 800, height: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", backgroundColor: "#E2E8F0" }}>
            {config.showText && !imageUrl ? (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-8 text-center">
                <p style={{ fontSize: 28, fontWeight: 700, color: "#1A2B4C", lineHeight: 1.6, maxWidth: 600 }}>
                  {current?.sentence}
                </p>
              </div>
            ) : imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Site map" className="h-full w-full" style={{ objectFit: "contain" }} />
                {/* 하이라이트 영역 */}
                {current?.region && (
                  <div className="absolute pointer-events-none transition-all duration-300"
                    style={{
                      left: `${current.region.x}%`,
                      top: `${current.region.y}%`,
                      width: `${current.region.w}%`,
                      height: `${current.region.h}%`,
                      border: "3px solid #0073E6",
                      backgroundColor: "rgba(0,115,230,0.15)",
                      borderRadius: 4,
                    }}
                  />
                )}
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400 text-sm">
                {config.showText ? "음성을 들어보세요" : "음성을 주의 깊게 들으세요"}
              </div>
            )}
          </div>

          {/* 우측: Status & Audio Card */}
          <div className="flex shrink-0 flex-col items-center justify-center gap-8 rounded-lg bg-white"
            style={{ width: 600, height: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>

            {/* 상태 텍스트 */}
            <p style={{ fontSize: 24, fontWeight: 700, color: phaseColor, letterSpacing: "0.01em" }}>
              {phaseText}
            </p>

            {/* 음원 재생 버튼 (study 모드 또는 대기 중) */}
            {showPlayButton && phase !== "recording" && (
              <button
                onClick={() => void playAudio()}
                disabled={nextDisabled}
                className="flex items-center gap-2 rounded-lg px-8 py-4 font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: "#0073E6", fontSize: 16 }}
              >
                🔊 Play Audio
              </button>
            )}

            {/* Waveform */}
            <WaveformBar isActive={phase === "recording"} volume={volume} />

            {/* 카운트다운 타이머 바 */}
            <div className="space-y-2 text-center">
              {phase === "recording" && (
                <p className="font-mono text-sm" style={{ color: "#D9383A" }}>
                  {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
                </p>
              )}
              <div className="overflow-hidden rounded-full" style={{ width: 450, height: 12, backgroundColor: "#EEEEEE" }}>
                <div
                  className="h-full rounded-full transition-all duration-1000 linear"
                  style={{
                    width: phase === "recording" ? `${(timeLeft / speakingSeconds) * 100}%` : phase === "done" ? "0%" : "100%",
                    backgroundColor: timeLeft <= 2 && phase === "recording" ? "#D9383A" : "#0073E6",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="flex items-center justify-between shrink-0 border-t px-6"
        style={{ height: 60, backgroundColor: "#FFFFFF", borderColor: "#E0E0E0" }}>
        <span style={{ fontSize: 15, fontWeight: 500, color: "#333333" }}>
          Question {questionNumber} of {totalQuestions}
        </span>
        <div className="overflow-hidden rounded-full" style={{ width: 240, height: 8, backgroundColor: "#E0E0E0" }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, backgroundColor: "#0073E6" }} />
        </div>
      </footer>
    </div>
  );
}
