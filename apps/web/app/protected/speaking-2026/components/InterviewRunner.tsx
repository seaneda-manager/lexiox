"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type InterviewQuestion = {
  id: string;
  question: string;
  audioUrl?: string;
  topic?: string;
  answerSeconds?: number;
};

type Phase = "idle" | "listening" | "prepare" | "recording" | "done";

type RecordingResult = { questionId: string; blob: Blob | null };

type Props = {
  questions: InterviewQuestion[];
  interviewerImageUrl?: string;
  mode?: "study" | "test";
  defaultAnswerSeconds?: number;
  totalQuestionOffset?: number;
  totalQuestions?: number;
  autoStartAfterAudio?: boolean;
  onComplete?: (results: RecordingResult[]) => void;
};

const MODE_CONFIG = {
  test: {
    prepareSeconds: 0,
    responseSeconds: 45,
    headerBg: "#1A2B4C",
    headerText: "TOEFL 2026 - Speaking - Task 2: Take an Interview",
    description: "Answer the 4 interview questions. No preparation time. 45 seconds per question.",
  },
  study: {
    prepareSeconds: 15,
    responseSeconds: 60,
    headerBg: "#2563EB",
    headerText: "Speaking Practice - Task 2: Take an Interview",
    description: "Answer the 4 interview questions. 15 seconds to prepare. 60 seconds per question.",
  },
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
  const progressPct = totalQuestions > 0 ? (questionNumber / totalQuestions) * 100 : 0;

  const clearTimer = () => {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    clearTimer();
  }, []);

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
      recorder.onstop = () => {
        const blob = chunksRef.current.length ? new Blob(chunksRef.current, { type: "audio/webm" }) : null;
        setRecordings((prev) => [...prev.filter((r) => r.questionId !== current.id), { questionId: current.id, blob }]);
      };

      recorder.start();
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
  }, [current, autoStartAfterAudio, startRecording]);

  useEffect(() => {
    setPhase("idle");
    setTimeLeft(0);
    setTimeout(() => playQuestion(), 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

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

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");

  return (
    <div className="flex flex-col" style={{ minHeight: "100vh", backgroundColor: "#F4F6F9", fontFamily: "Arial, Helvetica, sans-serif" }}>

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 shrink-0" style={{ height: 60, backgroundColor: "#1A2B4C" }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>Updated TOEFL iBT - Speaking</span>
        <div className="flex items-center" style={{ gap: 12 }}>
          <button className="flex items-center gap-1 rounded border border-slate-400 bg-transparent px-3 text-white" style={{ width: 90, height: 36, fontSize: 13 }}>
            🔊 Volume
          </button>
          <button className="rounded border border-slate-400 bg-transparent text-white" style={{ width: 70, height: 36, fontSize: 13 }}>
            Help
          </button>
          <button
            onClick={handleNext}
            disabled={nextDisabled || phase === "listening" || phase === "recording"}
            className="rounded font-semibold text-white disabled:opacity-40"
            style={{ width: 100, height: 36, fontSize: 13, backgroundColor: "#0073E6", border: "none", borderRadius: 4 }}
          >
            Next &gt;
          </button>
        </div>
      </header>

      {/* ── Main Body ── */}
      <main className="flex flex-1 flex-col items-center justify-center" style={{ gap: 0 }}>

        {/* 아바타 비디오 영역 */}
        <div className="overflow-hidden"
          style={{ width: 860, height: 485, border: "4px solid #E0E0E0", borderRadius: 12, backgroundColor: "#1A2B4C", flexShrink: 0 }}>
          {interviewerImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={interviewerImageUrl} alt="Interviewer" className="h-full w-full" style={{ objectFit: "cover" }} />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3" style={{ color: "#94A3B8" }}>
              <div style={{ fontSize: 64 }}>👤</div>
              <p style={{ fontSize: 14 }}>인터뷰어 GIF를 에셋 편집 페이지에서 업로드하세요</p>
            </div>
          )}
        </div>

        {/* 답변 상황판 */}
        <div className="flex flex-col items-center" style={{ marginTop: 40, gap: 16 }}>

          {/* 상태 문구 */}
          <p style={{
            fontSize: 20,
            fontWeight: 600,
            color: phase === "recording" ? "#D9383A" : "#333333",
          }}>
            {phase === "listening" ? "Listening to question..."
              : phase === "recording" ? "Status: RECORDING..."
              : phase === "done" ? "Response complete"
              : "Preparing..."}
          </p>

          {/* 디지털 타이머 */}
          <p style={{ fontSize: 48, fontWeight: 800, color: "#333333", fontFamily: "monospace", lineHeight: 1 }}>
            {mins}:{secs}
          </p>

          {/* 카운트다운 게이지 바 */}
          <div className="overflow-hidden rounded-full" style={{ width: 600, height: 16, backgroundColor: "#E8EBF0" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: phase === "recording" ? `${(timeLeft / answerSeconds) * 100}%` : phase === "done" ? "0%" : "100%",
                backgroundColor: "#0073E6",
                transition: "width 1s linear",
              }}
            />
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
