"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { DrillTask } from "./drill.types";

function cleanStr(v: unknown) {
  return String(v ?? "").trim();
}
function uniqStrings(xs: any[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of xs ?? []) {
    const s = cleanStr(x);
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function readSeed(task: DrillTask) {
  const t: any = task as any;
  const seed: any = t?.seed ?? {};
  const meta: any = seed?.meta ?? t?.meta ?? {};

  const prompt =
    cleanStr(seed?.prompt) ||
    (cleanStr(seed?.kind) ? `Choose the correct form (${cleanStr(seed.kind)}):` : "Choose the correct word form:");

  const stem =
    cleanStr(seed?.stem) ||
    cleanStr(meta?.lemma) ||
    cleanStr(meta?.stem) ||
    cleanStr(meta?.target) ||
    "";

  const rawChoices = seed?.choices ?? seed?.options ?? meta?.choices ?? meta?.options ?? seed?.items ?? [];
  const choices = uniqStrings(Array.isArray(rawChoices) ? rawChoices : []);

  const answerText = cleanStr(seed?.answer ?? seed?.correct ?? meta?.answer ?? meta?.correct ?? "");
  const answerIndex =
    Number.isFinite(seed?.answerIndex) ? Number(seed.answerIndex) :
    Number.isFinite(seed?.correctIndex) ? Number(seed.correctIndex) :
    null;

  let answerIdx: number | null = null;
  if (choices.length) {
    if (answerIndex !== null && answerIndex >= 0 && answerIndex < choices.length) {
      answerIdx = answerIndex;
    } else if (answerText) {
      const i = choices.findIndex((c) => c.toLowerCase() === answerText.toLowerCase());
      if (i >= 0) answerIdx = i;
    }
  }

  return { prompt, stem, choices, answerIdx, seed };
}

export default function WordFormPickDrill({
  task,
  onDone,
}: {
  task: DrillTask;
  onDone: (isCorrect: boolean) => void;
}) {
  const { prompt, stem, choices, answerIdx, seed } = useMemo(() => readSeed(task), [task]);

  const [picked, setPicked] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setPicked(null);
    setLocked(false);
  }, [task]);

  const usable = stem && choices.length >= 2 && answerIdx !== null;

  function choose(i: number) {
    if (!usable || locked) return;
    setPicked(i);
    setLocked(true);
    const ok = i === answerIdx!;
    window.setTimeout(() => onDone(ok), 450);
  }

  if (!usable) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
        <div className="font-semibold">WORD_FORM seed is not usable</div>
        <div className="mt-1 text-xs text-red-700">
          stem + choices + answer(또는 answerIndex)가 필요합니다.
        </div>
        <pre className="mt-3 max-h-64 overflow-auto rounded-lg border bg-white p-2 text-[11px] text-slate-700">
          {JSON.stringify(seed, null, 2)}
        </pre>
        <button className="mt-3 w-full rounded-xl bg-black py-2 text-white" onClick={() => onDone(false)}>
          Skip this task
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-5" style={{ background: "rgba(15,40,30,0.6)", border: "0.5px solid rgba(255,255,255,0.1)" }}>
      <div className="text-xs font-semibold" style={{ color: "#4da88a" }}>WORD FORM</div>

      <div className="mt-2 text-lg font-semibold" style={{ color: "#E1F5EE" }}>
        {prompt}{" "}
        <span className="rounded-lg px-2 py-0.5 font-mono" style={{ background: "rgba(26,61,48,0.8)", color: "#9FE1CB" }}>{stem}</span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {choices.slice(0, 6).map((c, i) => {
          const isPicked = picked === i;
          const isAnswer = i === answerIdx;
          const choiceStyle = locked
            ? isAnswer
              ? { border: "1.5px solid #5DCAA5", background: "#1e4a3a" }
              : isPicked
                ? { border: "1.5px solid #F09595", background: "rgba(61,21,21,0.6)" }
                : { border: "0.5px solid rgba(255,255,255,0.08)", background: "rgba(26,61,48,0.4)", opacity: 0.6 }
            : { border: "0.5px solid rgba(255,255,255,0.1)", background: "rgba(26,61,48,0.5)" };

          return (
            <button
              key={`${c}-${i}`}
              className="rounded-xl px-4 py-3 text-left text-sm transition"
              style={choiceStyle}
              disabled={locked}
              onClick={() => choose(i)}
            >
              <div className="font-semibold" style={{ color: "#E1F5EE" }}>{c}</div>
              {locked && isAnswer ? (
                <div className="mt-1 text-xs font-semibold" style={{ color: "#5DCAA5" }}>Correct</div>
              ) : locked && isPicked && !isAnswer ? (
                <div className="mt-1 text-xs font-semibold" style={{ color: "#F09595" }}>Incorrect</div>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 text-xs" style={{ color: "#3d7a63" }}>Tap one choice. Auto-advances.</div>
    </div>
  );
}
