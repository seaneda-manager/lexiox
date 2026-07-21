"use client";

// 영어 정의를 보고 해당 단어 고르기.
// 정의 안의 내용어에는 뜻 툴팁(GlossText)이 붙어, 정의를 못 읽어서 틀리는 일을 막는다.

import { useMemo, useState } from "react";
import GlossText from "./GlossText";
import type { DrillTask, DefinitionPickSeed } from "./drill.types";

export default function DefinitionPickDrill({
  task,
  onDone,
}: {
  task: DrillTask;
  onDone: (isCorrect: boolean) => void;
}) {
  const seed = task.seed as DefinitionPickSeed;
  const [picked, setPicked] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const choices = useMemo(() => (Array.isArray(seed?.choices) ? seed.choices : []), [seed]);
  const answer = String(seed?.answer ?? "");
  const ok = Boolean(seed?.definition) && choices.length >= 2 && answer;

  if (!ok) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
        이 문항을 표시할 수 없어요.
        <button
          className="mt-3 w-full rounded-xl bg-white py-2 text-sm font-semibold text-black"
          onClick={() => onDone(false)}
          type="button"
        >
          건너뛰기
        </button>
      </div>
    );
  }

  function choose(c: string) {
    if (locked) return;
    setPicked(c);
    setLocked(true);
    window.setTimeout(() => onDone(c === answer), 420);
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-5">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="mb-2 text-[11px] uppercase tracking-wide text-white/40">영어 정의</p>
        <p className="text-lg leading-8 text-white">
          <GlossText text={seed.definition} gloss={seed.gloss} />
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {choices.map((c) => {
          const isAnswer = c === answer;
          const isPicked = picked === c;
          const style = !locked
            ? "border-white/15 bg-white/5 hover:border-white/40 hover:bg-white/10"
            : isAnswer
              ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-200"
              : isPicked
                ? "border-rose-400/60 bg-rose-400/15 text-rose-200"
                : "border-white/10 bg-white/5 opacity-50";
          return (
            <button
              key={c}
              type="button"
              disabled={locked}
              onClick={() => choose(c)}
              className={`rounded-xl border px-4 py-3 text-left text-base text-white transition ${style}`}
            >
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}
