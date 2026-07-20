"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { DrillTask } from "./drill.types";

function pickString(...xs: any[]) {
  for (const x of xs) {
    const s = String(x ?? "").trim();
    if (s) return s;
  }
  return "";
}

function uniqStrings(arr: any[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr ?? []) {
    const s = String(x ?? "").trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function resolveCollocation(task: DrillTask) {
  const t: any = task as any;
  const seed: any = t?.seed ?? {};
  const meta: any = seed?.meta ?? {};

  const prompt = pickString(seed?.prompt, meta?.prompt, "Choose the best collocation:");
  const base = pickString(seed?.base, seed?.stem, seed?.target, meta?.base, meta?.stem, meta?.target, "");

  // phrase could be like: "make ____" or "____ a decision"
  const phrase = pickString(seed?.phrase, seed?.sentence, meta?.phrase, meta?.sentence, "");

  const rawChoices =
    seed?.choices ??
    seed?.options ??
    seed?.items ??
    meta?.choices ??
    meta?.options ??
    seed?.distractors ??
    meta?.distractors ??
    [];

  const choices = uniqStrings(Array.isArray(rawChoices) ? rawChoices : []);

  const correctText = pickString(seed?.answer, seed?.correct, meta?.answer, meta?.correct, seed?.key);
  const correctIndex =
    Number.isFinite(seed?.answerIndex) ? Number(seed?.answerIndex) :
    Number.isFinite(seed?.correctIndex) ? Number(seed?.correctIndex) :
    null;

  let answerIdx: number | null = null;
  if (choices.length) {
    if (correctIndex !== null && correctIndex >= 0 && correctIndex < choices.length) answerIdx = correctIndex;
    else if (correctText) {
      const i = choices.findIndex((c) => c.toLowerCase() === String(correctText).toLowerCase());
      if (i >= 0) answerIdx = i;
    }
  }

  return {
    prompt,
    base,
    phrase,
    choices,
    answerIdx,
    debug: { seed, meta, t },
  };
}

function Choice({
  label,
  state,
  disabled,
  onClick,
}: {
  label: string;
  state: "idle" | "correct" | "wrong" | "dim";
  disabled: boolean;
  onClick: () => void;
}) {
  const styleMap = {
    correct: { border: "1.5px solid #5DCAA5", background: "#1e4a3a" },
    wrong: { border: "1.5px solid #F09595", background: "rgba(61,21,21,0.6)" },
    dim: { border: "0.5px solid rgba(255,255,255,0.08)", background: "rgba(26,61,48,0.4)", opacity: 0.6 },
    idle: { border: "0.5px solid rgba(255,255,255,0.1)", background: "rgba(26,61,48,0.5)" },
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={["rounded-2xl px-4 py-4 text-left transition", disabled ? "cursor-default" : ""].join(" ")}
      style={styleMap[state]}
    >
      <div className="font-extrabold" style={{ fontSize: "clamp(14px, 1.7cqi, 18px)", color: "#E1F5EE" }}>
        {label}
      </div>
      {state === "correct" ? <div className="mt-1 text-xs font-semibold" style={{ color: "#5DCAA5" }}>Correct</div> : null}
      {state === "wrong" ? <div className="mt-1 text-xs font-semibold" style={{ color: "#F09595" }}>Incorrect</div> : null}
    </button>
  );
}

export default function CollocationDrill({
  task,
  onDone,
}: {
  task: DrillTask;
  onDone: (isCorrect: boolean) => void;
}) {
  const { prompt, base, phrase, choices, answerIdx, debug } = useMemo(() => resolveCollocation(task), [task]);

  const [picked, setPicked] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setPicked(null);
    setLocked(false);
  }, [task]);

  const canAnswer = !locked && choices.length >= 2 && answerIdx !== null;
  const usable = choices.length >= 2 && answerIdx !== null && (!!base || !!phrase);

  function choose(i: number) {
    if (!canAnswer) return;
    setPicked(i);
    setLocked(true);
    const ok = i === answerIdx!;
    window.setTimeout(() => onDone(ok), 380);
  }

  if (!usable) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
        <div className="font-semibold">COLLOCATION seed is not usable</div>
        <div className="mt-1 text-xs text-rose-700">
          seed에 base/phrase + choices + answer(or answerIndex)가 필요합니다.
        </div>
        <pre className="mt-3 max-h-64 overflow-auto rounded-lg border bg-white p-2 text-[11px] text-slate-700">
          {JSON.stringify(debug?.seed ?? debug, null, 2)}
        </pre>
        <button
          type="button"
          className="mt-3 w-full rounded-xl bg-black py-2 text-white"
          onClick={() => onDone(false)}
        >
          Skip this task
        </button>
      </div>
    );
  }

  const headerLine = phrase
    ? phrase
    : base
      ? `Choose a strong collocation with: ${base}`
      : "Choose the best collocation:";

  return (
    <div className="w-full h-full">
      <div className="font-semibold" style={{ fontSize: "clamp(12px, 1.35cqi, 13px)", color: "#4da88a" }}>
        Collocation
      </div>

      <div className="mt-2 font-extrabold" style={{ fontSize: "clamp(16px, 2.0cqi, 24px)", color: "#E1F5EE" }}>
        {prompt}
      </div>

      <div className="mt-4 rounded-2xl px-5 py-5 text-left" style={{ background: "rgba(15,40,30,0.6)", border: "0.5px solid rgba(255,255,255,0.1)" }}>
        <div className="font-extrabold" style={{ fontSize: "clamp(16px, 2.05cqi, 26px)", color: "#E1F5EE" }}>
          {headerLine}
        </div>
        {base ? (
          <div className="mt-2 font-semibold" style={{ fontSize: "clamp(12px, 1.35cqi, 13px)", color: "#4da88a" }}>
            Base: <span className="font-black" style={{ color: "#9FE1CB" }}>{base}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {choices.slice(0, 6).map((c, i) => {
          const isPicked = picked === i;
          const isAns = i === answerIdx;
          const state =
            locked
              ? isAns
                ? "correct"
                : isPicked
                  ? "wrong"
                  : "dim"
              : "idle";

          return (
            <Choice
              key={`${c}-${i}`}
              label={c}
              state={state as any}
              disabled={!canAnswer}
              onClick={() => choose(i)}
            />
          );
        })}
      </div>

      <div className="mt-4 font-semibold" style={{ fontSize: "clamp(12px, 1.35cqi, 13px)", color: "#3d7a63" }}>
        Tap one choice. Auto-advances.
      </div>
    </div>
  );
}
