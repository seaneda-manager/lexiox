"use client";

import { useState, useEffect, useRef } from "react";
import type { BlankSegmentContent } from "@/models/grammar/types";

type Props = {
  content: BlankSegmentContent;
  onDone: () => void;
};

type State = "idle" | "correct" | "wrong_typing" | "wrong_blink" | "done";

export default function BlankFillChallenge({ content, onDone }: Props) {
  const [input, setInput] = useState("");
  const [state, setState] = useState<State>("idle");
  const [typedChars, setTypedChars] = useState<string[]>([]);
  const [blinkCount, setBlinkCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 정답 타이핑 애니메이션
  useEffect(() => {
    if (state !== "wrong_typing") return;
    const answer = content.answer;
    if (typedChars.length >= answer.length) {
      setState("wrong_blink");
      setBlinkCount(0);
      return;
    }
    const t = setTimeout(() => {
      setTypedChars((prev) => [...prev, answer[prev.length]]);
    }, 120);
    return () => clearTimeout(t);
  }, [state, typedChars, content.answer]);

  // 깜박임 효과 (2~3회)
  useEffect(() => {
    if (state !== "wrong_blink") return;
    if (blinkCount >= 6) {  // 3회 깜박 = on/off 6번
      setTimeout(onDone, 300);
      return;
    }
    const t = setTimeout(() => setBlinkCount((c) => c + 1), 250);
    return () => clearTimeout(t);
  }, [state, blinkCount, onDone]);

  const handleSubmit = () => {
    if (state !== "idle") return;
    const correct = input.trim().toLowerCase() === content.answer.toLowerCase();
    if (correct) {
      setState("correct");
      setTimeout(onDone, 800);
    } else {
      setTypedChars([]);
      setState("wrong_typing");
    }
  };

  const parts = content.prompt.split("___");
  const isBlinking = state === "wrong_blink" && blinkCount % 2 === 1;

  return (
    <div className="my-4 p-5 rounded-2xl bg-amber-50 border border-amber-200">
      <p className="text-xs text-amber-600 font-medium mb-3 uppercase tracking-wide">
        빈칸을 채우세요
      </p>

      <p className="text-base leading-relaxed mb-4 flex flex-wrap items-center gap-1">
        <span>{parts[0]}</span>

        {state === "idle" || state === "correct" ? (
          <span
            className={`inline-block border-b-2 min-w-[80px] text-center font-bold transition-colors
              ${state === "correct" ? "border-green-500 text-green-600" : "border-amber-400"}`}
          >
            {state === "correct" ? content.answer : input || " "}
          </span>
        ) : (
          <span
            className={`inline-block min-w-[80px] text-center font-bold text-red-600 transition-opacity
              ${isBlinking ? "opacity-0" : "opacity-100"}`}
          >
            {typedChars.join("")}
            {state === "wrong_typing" && (
              <span className="animate-pulse">|</span>
            )}
          </span>
        )}

        <span>{parts[1]}</span>
      </p>

      {state === "idle" && (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={content.hint_ko ?? "입력..."}
            className="flex-1 border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
          />
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 transition"
          >
            확인
          </button>
        </div>
      )}

      {state === "correct" && (
        <p className="text-green-600 text-sm font-medium">정답입니다!</p>
      )}
    </div>
  );
}
