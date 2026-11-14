"use client";
// 녹음(MediaRecorder) + 음성 인식(Web Speech API)을 한 번에 다루는 훅.
// 음성 인식은 Chrome 계열 브라우저만 지원한다 → sttSupported 로 대체 입력을 안내한다.
import { useCallback, useEffect, useRef, useState } from "react";

export type RecStatus = "idle" | "recording" | "done";

export function useSpeechRecorder() {
  const [status, setStatus] = useState<RecStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sttSupported, setSttSupported] = useState(true);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recogRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const finalRef = useRef("");

  useEffect(() => {
    setSttSupported(!!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
  }, []);

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const revoke = useCallback(() => {
    setAudioUrl((u) => {
      if (u) URL.revokeObjectURL(u);
      return null;
    });
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setTranscript("");
    setInterim("");
    finalRef.current = "";
    revoke();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
      };
      recorder.start(250);

      const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (Ctor) {
        const recog = new Ctor();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = "en-US";
        recogRef.current = recog;
        recog.onresult = (e: any) => {
          let fin = "";
          let tmp = "";
          for (let i = 0; i < e.results.length; i++) {
            if (e.results[i].isFinal) fin += e.results[i][0].transcript + " ";
            else tmp += e.results[i][0].transcript;
          }
          finalRef.current = fin;
          setTranscript(fin);
          setInterim(tmp);
        };
        recog.onerror = () => {};
        recog.start();
      }

      startedAtRef.current = Date.now();
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(Math.round((Date.now() - startedAtRef.current) / 1000)), 500);
      setStatus("recording");
    } catch {
      setError("마이크 권한이 필요합니다. 브라우저 설정을 확인해 주세요.");
    }
  }, [revoke]);

  const stop = useCallback(() => {
    clearTimer();
    setSeconds(Math.round((Date.now() - startedAtRef.current) / 1000));
    try {
      recogRef.current?.stop();
    } catch {}
    try {
      recorderRef.current?.stop();
    } catch {}
    // 마지막 중간 결과까지 합쳐서 확정
    setTimeout(() => {
      setInterim((tmp) => {
        if (tmp) {
          finalRef.current = (finalRef.current + " " + tmp).trim();
          setTranscript(finalRef.current);
        }
        return "";
      });
      setStatus("done");
    }, 400);
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    try {
      recogRef.current?.stop();
    } catch {}
    try {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    } catch {}
    setStatus("idle");
    setTranscript("");
    setInterim("");
    setSeconds(0);
    setError(null);
    finalRef.current = "";
    revoke();
  }, [revoke]);

  useEffect(
    () => () => {
      clearTimer();
      try {
        recogRef.current?.stop();
      } catch {}
    },
    [],
  );

  return { status, transcript, interim, seconds, audioUrl, error, sttSupported, start, stop, reset, setTranscript };
}
