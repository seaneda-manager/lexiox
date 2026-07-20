"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { SpeedAttemptResult, SpeedQuestion } from "@/models/vocab/speed.types";
import StageScaffold from "@/components/common/stage/StageScaffold";

type Props = {
  userId: string;
  questions?: SpeedQuestion[];
  tryIndex?: number;
  onFinish: (result: SpeedAttemptResult) => void;
  secondsPerQuestion?: number;
  minPassAccuracy?: number;
};

function norm(s: unknown): string {
  return String(s ?? "").trim().toLowerCase();
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-9 px-4 rounded-full font-extrabold bg-white/90 border border-black/10 inline-flex items-center">
      <span style={{ fontSize: "clamp(12px, 1.35cqi, 14px)" }}>{children}</span>
    </div>
  );
}

export default function SpeedChallengeRunner({
  userId,
  questions,
  tryIndex = 1,
  onFinish,
  secondsPerQuestion = 6,
  minPassAccuracy = 0.7,
}: Props) {
  const qs = useMemo(() => (Array.isArray(questions) ? questions : []).filter(Boolean), [questions]);
  const total = qs.length;

  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [locked, setLocked] = useState(false);

  const [correctCount, setCorrectCount] = useState(0);
  const [wrongWordIds, setWrongWordIds] = useState<string[]>([]);
  const [lastVerdict, setLastVerdict] = useState<"correct" | "wrong" | null>(null);

  const timeLimit = useMemo(() => clamp(Math.floor(secondsPerQuestion), 2, 30), [secondsPerQuestion]);
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setIndex(0);
    setInput("");
    setLocked(false);
    setCorrectCount(0);
    setWrongWordIds([]);
    setLastVerdict(null);
    setTimeLeft(timeLimit);
  }, [qs, timeLimit]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [index]);

  useEffect(() => {
    if (total !== 0) return;

    const result: SpeedAttemptResult = {
      userId,
      tryIndex,
      totalQuestions: 0,
      correctCount: 0,
      wrongWordIds: [],
      retryWordIds: [],
      accuracy: 0,
      passed: true,
      finishedAt: new Date().toISOString(),
    };

    onFinish(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const q = total > 0 ? qs[index] : null;

  useEffect(() => {
    if (!q) return;
    if (locked) return;

    setTimeLeft(timeLimit);

    const id = window.setInterval(() => {
      setTimeLeft((t) => (t <= 1 ? 0 : t - 1));
    }, 1000);

    return () => window.clearInterval(id);
  }, [q?.id, locked, timeLimit]);

  useEffect(() => {
    if (!q) return;
    if (locked) return;
    if (timeLeft !== 0) return;

    gradeAndAdvance(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, q?.id, locked]);

  function finishNow(nextCorrectCount: number, nextWrongWordIds: string[]) {
    const accuracy = total === 0 ? 0 : nextCorrectCount / total;
    const passed = accuracy >= minPassAccuracy;

    const result: SpeedAttemptResult = {
      userId,
      tryIndex,
      totalQuestions: total,
      correctCount: nextCorrectCount,
      wrongWordIds: nextWrongWordIds,
      retryWordIds: nextWrongWordIds,
      accuracy,
      passed,
      finishedAt: new Date().toISOString(),
    };

    onFinish(result);
  }

  function gradeAndAdvance(isCorrect: boolean) {
    if (!q) return;
    if (locked) return;

    setLocked(true);

    const wid = String(q.wordId ?? "").trim();

    if (isCorrect) {
      setLastVerdict("correct");
      setCorrectCount((c) => c + 1);
    } else {
      setLastVerdict("wrong");
      if (wid) {
        setWrongWordIds((prev) => (prev.includes(wid) ? prev : [...prev, wid]));
      }
    }

    window.setTimeout(() => {
      setLastVerdict(null);
      setInput("");

      const nextIndex = index + 1;

      const nextCorrect = isCorrect ? correctCount + 1 : correctCount;
      const nextWrong =
        !isCorrect && wid
          ? wrongWordIds.includes(wid)
            ? wrongWordIds
            : [...wrongWordIds, wid]
          : wrongWordIds;

      if (nextIndex >= total) {
        finishNow(nextCorrect, nextWrong);
        return;
      }

      setIndex(nextIndex);
      setLocked(false);
    }, 380);
  }

  function onSubmit() {
    if (!q) return;
    if (locked) return;

    const ans = norm(q.answer);
    const typed = norm(input);

    const ok = typed.length > 0 && typed === ans;
    gradeAndAdvance(ok);
  }

  // ✅ 객관식(단어→뜻): 보기 클릭 시 즉시 채점
  function onPick(choice: string) {
    if (!q) return;
    if (locked) return;
    setInput(choice);
    gradeAndAdvance(norm(choice) === norm(q.answer));
  }

  const isMcq = Array.isArray(q?.choices) && (q?.choices?.length ?? 0) > 0;

  if (total === 0) return null;

  const accuracySoFar = index === 0 ? 0 : correctCount / index;

  const topRight = (
    <div className="flex items-center gap-2">
      <Pill>
        <span className={timeLeft <= 2 ? "text-rose-700" : "text-neutral-800"}>⏱ {timeLeft}s</span>
      </Pill>
      <Pill>Try {tryIndex}</Pill>
    </div>
  );

  const hint = `Correct: ${correctCount} • Accuracy (so far): ${Math.round(
    accuracySoFar * 100
  )}% • Pass ≥ ${Math.round(minPassAccuracy * 100)}%`;

  return (
    <div className="h-full w-full">
      <StageScaffold
        stageKey="speed"
        stageLabel="Speed Check"
        title="Speed Check"
        subtitle={
          isMcq
            ? `뜻을 고르세요. ${timeLimit}s per question.`
            : `Type the correct word. ${timeLimit}s per question.`
        }
        step={{ index: index + 1, total }}
        topRight={topRight}
        hint={hint}
        primary={
          isMcq
            ? { label: "보기를 클릭하세요", onClick: () => {}, disabled: true }
            : { label: "Submit", onClick: onSubmit, disabled: locked || norm(input).length === 0 }
        }
        align="center"
      >
        <div className="w-full space-y-4">
          <div className="rounded-2xl border border-black/5 bg-white/70 px-5 py-5 text-left">
            <div className="text-neutral-500 font-semibold" style={{ fontSize: "clamp(12px, 1.35cqi, 13px)" }}>
              Prompt
            </div>
            <div className="mt-2 text-neutral-900 font-extrabold" style={{ fontSize: "clamp(18px, 2.4cqi, 30px)" }}>
              {q?.prompt ?? ""}
            </div>
          </div>

          {isMcq ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {(q?.choices ?? []).map((choice, i) => (
                <button
                  key={`${choice}:${i}`}
                  type="button"
                  disabled={locked}
                  onClick={() => onPick(choice)}
                  className="rounded-2xl border border-black/10 bg-white/85 px-5 py-4 text-left font-bold text-neutral-900 transition-colors hover:border-black/30 hover:bg-white disabled:opacity-60"
                  style={{ fontSize: "clamp(15px, 1.9cqi, 20px)" }}
                >
                  {choice}
                </button>
              ))}
            </div>
          ) : (
            <input
              ref={inputRef}
              value={input}
              disabled={locked}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSubmit();
              }}
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-5 py-4 text-center font-extrabold outline-none focus:ring-2 focus:ring-black/10"
              style={{ fontSize: "clamp(18px, 2.3cqi, 30px)" }}
              placeholder="Type here..."
              autoComplete="off"
              spellCheck={false}
            />
          )}

          {lastVerdict === "correct" ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800 font-bold">
              ✅ Correct
            </div>
          ) : null}

          {lastVerdict === "wrong" ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-800 font-bold">
              ❌ Wrong <span className="opacity-80">(Answer: {q?.answer})</span>
            </div>
          ) : null}
        </div>
      </StageScaffold>
    </div>
  );
}
