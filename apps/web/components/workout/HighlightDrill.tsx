"use client";

import { useEffect, useRef, useState } from "react";
import StageScaffold from "@/components/common/stage/StageScaffold";
import { taskInstruction, taskLabel, type HighlightDrillItem } from "@/lib/workout/highlightDrillTypes";

type AnswerState = "unanswered" | "correct" | "wrong" | "timeout";

export default function HighlightDrill({
  items,
  onComplete,
}: {
  items: HighlightDrillItem[];
  onComplete?: (result: { correct: number; total: number }) => void;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("unanswered");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const item = items[index];
  const isLast = index === items.length - 1;

  useEffect(() => {
    setSelected(null);
    setAnswerState("unanswered");
    setSecondsLeft(item?.timeLimitSec ?? 20);
  }, [index, item?.timeLimitSec]);

  useEffect(() => {
    if (!item || answerState !== "unanswered") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setAnswerState("timeout");
          setStreak(0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, answerState]);

  if (!item) return null;

  const handleSelect = (sentenceIndex: number) => {
    if (answerState !== "unanswered") return;
    const isCorrect = item.correctIndices.includes(sentenceIndex);
    setSelected(sentenceIndex);
    setAnswerState(isCorrect ? "correct" : "wrong");
    if (isCorrect) {
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
  };

  const handleNext = () => {
    if (isLast) {
      onComplete?.({ correct: score, total: items.length });
      return;
    }
    setIndex((i) => i + 1);
  };

  const answered = answerState !== "unanswered";
  const timeUrgent = secondsLeft <= 5 && answerState === "unanswered";

  return (
    <div className="h-full w-full">
      <StageScaffold
        stageLabel={taskLabel(item.taskType)}
        step={{ index: index + 1, total: items.length }}
        title={item.passageTitle ?? "지문을 읽고 찾아보세요"}
        subtitle={taskInstruction(item)}
        topRight={
          <div
            className={[
              "rounded-full border px-3 py-1 text-xs font-extrabold tabular-nums",
              timeUrgent ? "border-rose-300 bg-rose-50 text-rose-600" : "border-black/10 bg-white/70 text-slate-700",
            ].join(" ")}
          >
            ⏱ {secondsLeft}s
          </div>
        }
        hint={answered ? undefined : "문장을 탭해서 답하세요"}
        primary={answered ? { label: isLast ? "결과 보기" : "다음 문제", onClick: handleNext } : undefined}
      >
        <div className="mx-auto flex h-full max-w-2xl flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>점수 {score}/{items.length}</span>
            <span>🔥 연속 {streak}</span>
          </div>

          <div className="flex-1 space-y-2 overflow-auto">
            {item.sentences.map((sentence, i) => {
              const isSelected = selected === i;
              const isCorrectSentence = item.correctIndices.includes(i);
              let cls =
                "w-full rounded-2xl border px-4 py-3 text-left text-[15px] leading-relaxed transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500";
              if (!answered) {
                cls += " border-black/10 bg-white hover:border-emerald-300 hover:bg-emerald-50/60 cursor-pointer";
              } else if (isCorrectSentence) {
                cls += " border-emerald-400 bg-emerald-50 text-emerald-900";
              } else if (isSelected) {
                cls += " border-rose-300 bg-rose-50 text-rose-800 motion-safe:animate-[shake_0.3s_ease-in-out]";
              } else {
                cls += " border-black/5 bg-white text-slate-400";
              }
              return (
                <button key={i} type="button" disabled={answered} onClick={() => handleSelect(i)} className={cls}>
                  {sentence}
                  {answered && isCorrectSentence && <span className="ml-2 text-emerald-600">✓</span>}
                  {answered && isSelected && !isCorrectSentence && <span className="ml-2 text-rose-500">✕</span>}
                </button>
              );
            })}
          </div>

          {answered && (
            <p
              className={[
                "text-center text-sm font-bold",
                answerState === "correct" ? "text-emerald-600" : "text-rose-500",
              ].join(" ")}
            >
              {answerState === "correct" ? "정답입니다! 🎉" : answerState === "timeout" ? "시간 초과 — 정답을 확인하세요" : "아쉬워요 — 정답을 확인하세요"}
            </p>
          )}
        </div>
      </StageScaffold>
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
