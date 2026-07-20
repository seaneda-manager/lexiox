"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Square, RotateCcw, Check, Loader2 } from "lucide-react";

type Phase = "idle" | "ready" | "recording" | "done" | "saving";

export default function ReRecordPanel({
  resultId,
  prompt,
  onScriptUpdated,
}: {
  resultId: string;
  prompt?: string | null;
  onScriptUpdated?: (newScript: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  function startTimer() {
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  async function startRecording() {
    setError(null);
    setTranscript("");
    setInterimText("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start(250);

      // Web Speech API
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        const recognition: SpeechRecognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognitionRef.current = recognition;

        recognition.onresult = (e: SpeechRecognitionEvent) => {
          let final = "";
          let interim = "";
          for (let i = 0; i < e.results.length; i++) {
            if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
            else interim += e.results[i][0].transcript;
          }
          setTranscript(final);
          setInterimText(interim);
        };
        recognition.onerror = () => {};
        recognition.start();
      }

      setPhase("recording");
      startTimer();
    } catch {
      setError("마이크 권한이 필요합니다. 브라우저 설정을 확인해주세요.");
    }
  }

  function stopRecording() {
    clearTimer();
    recognitionRef.current?.stop();
    mediaRecorderRef.current?.stop();
    setInterimText("");
    setPhase("done");
  }

  async function saveScript() {
    const finalScript = transcript.trim();
    if (!finalScript) {
      setError("인식된 텍스트가 없습니다. 다시 녹음해주세요.");
      return;
    }
    setPhase("saving");
    try {
      const res = await fetch("/api/speaking/update-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId, script: finalScript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "저장 실패");
      onScriptUpdated?.(finalScript);
      setPhase("idle");
      setTranscript("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 오류");
      setPhase("done");
    }
  }

  function reset() {
    recognitionRef.current?.stop();
    mediaRecorderRef.current?.stop();
    clearTimer();
    setPhase("idle");
    setTranscript("");
    setInterimText("");
    setError(null);
  }

  useEffect(() => () => { clearTimer(); recognitionRef.current?.stop(); }, []);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (phase === "idle") {
    return (
      <button
        onClick={() => setPhase("ready")}
        className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100"
      >
        <RotateCcw className="h-3 w-3" />
        재발화
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50/40 p-4 space-y-3">
      {prompt && phase === "ready" && (
        <p className="text-xs text-gray-600 leading-relaxed">
          <span className="font-semibold text-orange-700">문제: </span>{prompt}
        </p>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2">
        {phase === "ready" && (
          <button
            onClick={startRecording}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
          >
            <Mic className="h-3.5 w-3.5" />
            녹음 시작
          </button>
        )}

        {phase === "recording" && (
          <>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              {fmt(seconds)}
            </span>
            <button
              onClick={stopRecording}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700"
            >
              <Square className="h-3 w-3" />
              중지
            </button>
          </>
        )}

        {phase === "done" && (
          <>
            <button
              onClick={saveScript}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700"
            >
              <Check className="h-3 w-3" />
              이 스크립트로 저장
            </button>
            <button
              onClick={reset}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
            >
              <RotateCcw className="h-3 w-3" />
              다시 녹음
            </button>
          </>
        )}

        {phase === "saving" && (
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            저장 중…
          </span>
        )}

        {(phase === "ready" || phase === "recording" || phase === "done") && (
          <button onClick={reset} className="ml-auto text-[11px] text-gray-400 hover:text-gray-600">
            취소
          </button>
        )}
      </div>

      {/* Live transcript */}
      {(phase === "recording" || phase === "done") && (
        <div className="rounded-lg border border-orange-100 bg-white p-3 min-h-[80px]">
          <div className="text-[10px] font-semibold text-orange-600 mb-1 uppercase tracking-wide">
            인식된 텍스트
          </div>
          <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
            {transcript}
            {interimText && (
              <span className="text-gray-400">{interimText}</span>
            )}
            {!transcript && !interimText && phase === "recording" && (
              <span className="text-gray-400 animate-pulse">말씀해 주세요…</span>
            )}
            {!transcript && phase === "done" && (
              <span className="text-gray-400">인식된 텍스트가 없습니다.</span>
            )}
          </p>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
