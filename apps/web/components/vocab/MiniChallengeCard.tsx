"use client";

import { useEffect, useMemo, useState } from "react";
import type { VocabWordCore } from "@/models/vocab";

export type MiniChallengeResult = "correct" | "incorrect";
type ChallengeKind = "meaning" | "synonym" | "usage" | "grammar";

type Props = {
  word: VocabWordCore;
  onResult: (result: MiniChallengeResult) => void;
};

type Choice = {
  label: string;
  isCorrect: boolean;
};

type BuiltChallenge = {
  kind: ChallengeKind;
  title: string;
  description: string;
  note?: string;
  choices: Choice[];
};

const MAX_ROUNDS = 4;

/* ------------------------------------------------------------
   🔒 SSR-SAFE SHUFFLE
   - initial render: no shuffle
   - client mount: shuffle once
------------------------------------------------------------ */
function shuffleClientOnly(arr: Choice[]): Choice[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function MiniChallengeCard({ word, onResult }: Props) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState<MiniChallengeResult | "idle">("idle");

  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    setClientReady(true); // ✅ hydration 이후
  }, []);

  const coreEn = word.meanings_en_simple[0] ?? "";
  const hasCore = coreEn.trim().length > 0;

  const currentChallenge: BuiltChallenge | null = useMemo(() => {
    if (!hasCore) return null;

    const order: ChallengeKind[] = ["meaning", "synonym", "usage", "grammar"];
    const kind = order[Math.min(roundIndex, order.length - 1)];

    const genericPool = [
      "to reduce",
      "to hide",
      "to move",
      "to increase",
      "to delay",
      "to explain",
      "to connect",
      "to separate",
    ];

    const baseChoices = (): Choice[] => {
      const correct: Choice = { label: coreEn, isCorrect: true };
      const distractors: Choice[] = genericPool
        .filter((d) => d !== coreEn)
        .slice(0, 3)
        .map((d) => ({ label: d, isCorrect: false }));

      const ordered = [correct, ...distractors];
      return clientReady ? shuffleClientOnly(ordered) : ordered;
    };

    if (kind === "grammar") {
      const pos = (word.pos ?? "").toLowerCase();
      const correctLabel =
        pos.includes("v") ? "동사(verb)" :
        pos.includes("n") ? "명사(noun)" :
        pos.includes("adj") ? "형용사(adjective)" :
        pos.includes("adv") ? "부사(adverb)" :
        "기타(other)";

      const choices: Choice[] = [
        { label: "명사(noun)", isCorrect: false },
        { label: "동사(verb)", isCorrect: false },
        { label: "형용사(adjective)", isCorrect: false },
        { label: "부사(adverb)", isCorrect: false },
      ].map((c) =>
        c.label === correctLabel ? { ...c, isCorrect: true } : c
      );

      return {
        kind,
        title: "Mini Challenge – Grammar",
        description: "이 단어의 품사를 고르세요.",
        choices: clientReady ? shuffleClientOnly(choices) : choices,
      };
    }

    return {
      kind,
      title: "Mini Challenge",
      description: "가장 알맞은 뜻을 고르세요.",
      choices: baseChoices(),
    };
  }, [hasCore, coreEn, roundIndex, word, clientReady]);

  if (!currentChallenge) return null;

  const handleClick = (c: Choice) => {
    if (locked) return;
    setSelected(c.label);
    setLocked(true);
    const r = c.isCorrect ? "correct" : "incorrect";
    setResult(r);
    onResult(r);
  };

  return (
    <div className="mt-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs">
      <p className="font-semibold mb-1">{currentChallenge.title}</p>
      <p className="mb-2 text-[11px]">{currentChallenge.description}</p>

      <div className="space-y-1.5">
        {currentChallenge.choices.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => handleClick(c)}
            disabled={locked}
            className="w-full rounded-lg border bg-white px-3 py-1.5 text-left text-[11px] hover:bg-emerald-50"
          >
            {c.label}
          </button>
        ))}
      </div>

      {locked && (
        <p className="mt-2 text-[11px] font-semibold">
          {result === "correct"
            ? "정답 👍"
            : "오답 – 다시 기억해 봐요"}
        </p>
      )}
    </div>
  );
}
