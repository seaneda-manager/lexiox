"use client";

import { useState } from "react";
import HighlightDrill from "@/components/workout/HighlightDrill";
import type { HighlightDrillItem } from "@/lib/workout/highlightDrillTypes";

const DEMO_ITEMS: HighlightDrillItem[] = [
  {
    id: "topic-1",
    taskType: "topic_sentence",
    passageTitle: "Urban Heat Islands",
    timeLimitSec: 20,
    correctIndices: [0],
    sentences: [
      "Cities tend to be significantly warmer than the rural areas that surround them, a phenomenon known as the urban heat island effect.",
      "Asphalt and concrete absorb sunlight during the day and slowly release the stored heat after sunset.",
      "Tall buildings can also trap warm air at street level, preventing it from dispersing.",
      "In some major cities, nighttime temperatures can be as much as seven degrees higher than in nearby countryside.",
    ],
  },
  {
    id: "summary-1",
    taskType: "summary",
    passageTitle: "The Domestication of Maize",
    timeLimitSec: 25,
    correctIndices: [2],
    sentences: [
      "Modern corn looks nothing like its wild ancestor, a grass called teosinte that produced only a handful of small, hard kernels.",
      "Over thousands of years, early farmers in Mesoamerica selected teosinte plants with slightly larger, softer kernels and replanted their seeds.",
      "Through this gradual selective breeding, teosinte was transformed into the large-eared, easily harvested crop we now call maize.",
      "Archaeologists have found early maize cobs in caves in central Mexico dating back roughly nine thousand years.",
    ],
  },
  {
    id: "evidence-1",
    taskType: "evidence",
    passageTitle: "Migratory Birds and Magnetic Fields",
    timeLimitSec: 20,
    claim: "Some migratory birds can sense the Earth's magnetic field.",
    correctIndices: [1],
    sentences: [
      "Every autumn, European robins travel thousands of kilometers from northern breeding grounds to warmer wintering sites.",
      "Experiments have shown that robins kept in a controlled chamber will consistently orient themselves toward magnetic north, even when no visual landmarks are present.",
      "Their migratory routes often follow coastlines and river valleys, which may serve as additional visual guides.",
      "Robins typically travel at night, resting and feeding during daylight hours.",
    ],
  },
  {
    id: "referent-1",
    taskType: "referent",
    passageTitle: "Coral Bleaching",
    timeLimitSec: 20,
    referentWord: "this",
    correctIndices: [0],
    sentences: [
      "When ocean temperatures rise even slightly above normal, corals expel the colorful algae living in their tissues.",
      "This causes the coral to turn pale or white, a condition known as bleaching.",
      "Without the algae, corals lose their main source of food and become far more vulnerable to disease.",
      "Some coral colonies can recover if water temperatures drop again within a few weeks.",
    ],
  },
];

export default function HighlightDrillDemoPage() {
  const [result, setResult] = useState<{ correct: number; total: number } | null>(null);
  const [runKey, setRunKey] = useState(0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">Workout 프로토타입</p>
      <h1 className="mb-4 text-lg font-bold text-neutral-900">하이라이트 엔진 — topic sentence / summary / 근거 / 지칭추론</h1>

      <div className="h-[600px] w-full">
        {result ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-[28px] border border-black/10 bg-white/80 text-center">
            <p className="text-4xl">{result.correct === result.total ? "🏆" : "🎯"}</p>
            <p className="text-2xl font-black text-slate-800">
              {result.correct} / {result.total} 정답
            </p>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setRunKey((k) => k + 1);
              }}
              className="rounded-2xl bg-emerald-700 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-600"
            >
              다시하기
            </button>
          </div>
        ) : (
          <HighlightDrill key={runKey} items={DEMO_ITEMS} onComplete={setResult} />
        )}
      </div>
    </div>
  );
}
