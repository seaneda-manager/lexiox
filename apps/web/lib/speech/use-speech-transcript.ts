"use client";

// apps/web/lib/speech/use-speech-transcript.ts
//
// 녹음과 나란히 돌리는 브라우저 STT.
//
// speaking_results_2026 / ai-feedback / 채점 화면은 모두 script(전사 텍스트)를
// 전제로 만들어져 있는데, 러너는 오디오만 만들고 있었다. 그래서 결과가 한 건도
// 쌓이지 않았고 채점 화면이 계속 비어 있었다.
//
// 서버 STT는 아직 없다. 저장소에 이미 쓰이던 Web Speech API(ReRecordPanel,
// audio-flashcard)와 같은 방식으로 채운다. 정확도는 서버 STT보다 떨어지고
// 브라우저에 따라 아예 지원되지 않을 수 있으므로, 전사가 비어 있어도 흐름이
// 막히지 않게 호출부에서 다뤄야 한다.

import { useCallback, useRef, useState } from "react";

export function useSpeechTranscript(lang = "en-US") {
  const recognitionRef = useRef<any>(null);
  const finalRef = useRef("");
  const [interim, setInterim] = useState("");
  const [supported] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  });

  const start = useCallback(() => {
    finalRef.current = "";
    setInterim("");

    const Ctor =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!Ctor) return;

    try {
      const recognition = new Ctor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onresult = (e: any) => {
        let interimText = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const chunk = e.results[i][0]?.transcript ?? "";
          if (e.results[i].isFinal) finalRef.current += chunk + " ";
          else interimText += chunk;
        }
        setInterim(interimText);
      };

      // 무음이 길면 브라우저가 알아서 끊는다. 녹음은 계속되므로 조용히 무시한다.
      recognition.onerror = () => {};

      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      // 이미 돌고 있는 경우 등 — 전사 실패가 녹음을 막지는 않는다.
    }
  }, [lang]);

  /** 인식을 멈추고 지금까지의 확정 전사를 반환한다. */
  const stop = useCallback((): string => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* 이미 멈춘 경우 */
    }
    recognitionRef.current = null;
    const text = finalRef.current.trim();
    setInterim("");
    return text;
  }, []);

  return { start, stop, interim, supported };
}
