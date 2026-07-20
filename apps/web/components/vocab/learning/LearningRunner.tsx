// apps/web/components/vocab/learning/LearningRunner.tsx
"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import LearningShowroom from "./LearningShowroom";
import type { LearningWord } from "./learning.types";
import type { SpeedQuestion } from "@/models/vocab/speed.types";

type Stage = "PRESENT" | "DONE";

type Props = {
  words: LearningWord[];
  speedQuestions?: SpeedQuestion[]; // legacy prop (ignored)
  onFinish: () => void;
  trackTitle?: string | null;
  dayIndex?: number | null;
  totalDays?: number | null;
};

export default function LearningRunner({ words, onFinish, trackTitle, dayIndex, totalDays }: Props) {
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<Stage>("PRESENT");

  // onFinish 중복 호출 방지
  const finishedRef = useRef(false);

  // ✅ 안전: words가 비어도 렌더 중 onFinish 호출 금지 (effect로만 처리)
  const hasWords = Array.isArray(words) && words.length > 0;

  // reset 기준을 words reference가 아니라 "id signature"로 고정 (좀 더 robust)
  const wordsKey = useMemo(() => {
    if (!Array.isArray(words) || words.length === 0) return "EMPTY";
    return words
      .map((w: any) => String(w?.id ?? w?.wordId ?? w?.text ?? w?.lemma ?? ""))
      .join("|");
  }, [words]);

  useEffect(() => {
    setIndex(0);
    setStage("PRESENT");
    finishedRef.current = false;
  }, [wordsKey]);

  // ✅ words empty면 effect에서 한 번만 finish
  useEffect(() => {
    if (!hasWords && !finishedRef.current) {
      finishedRef.current = true;
      onFinish();
    }
  }, [hasWords, onFinish]);

  const total = words?.length ?? 0;
  const current = total > 0 ? words[Math.min(index, total - 1)] : null;

  const doneWord = () => {
    setIndex((prev) => {
      const next = prev + 1;
      if (next >= total) {
        setStage("DONE");
        if (!finishedRef.current) {
          finishedRef.current = true;
          onFinish();
        }
        return prev;
      }
      return next;
    });
  };

  if (!hasWords) return null;
  if (stage === "DONE") return null;
  if (!current) return null;

  // ✅ key는 Props가 아니라 Fragment에 달기 (리마운트 유지 + TS 에러 방지)
  return (
    <Fragment key={String((current as any)?.id ?? index)}>
      <LearningShowroom
        word={current as LearningWord}
        index={index}
        total={total}
        onDoneWord={doneWord}
        trackTitle={trackTitle}
        dayIndex={dayIndex}
        totalDays={totalDays}
      />
    </Fragment>
  );
}
