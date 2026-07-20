"use client";

import LearningRunner from "@/components/vocab/learning/LearningRunner";
import type { LearningWord } from "@/components/vocab/learning/learning.types";
import type { TVocaWord } from "@/models/voca";

type Props = {
  words: TVocaWord[];
};

export default function VocaStudyClient({ words }: Props) {
  const learningWords: LearningWord[] = words.map((w) => ({
    id: w.id,
    text: w.word,
    lemma: w.word,
    meanings_ko: Array.isArray(w.meanings_ko)
      ? w.meanings_ko
      : typeof w.meaning_kr === "string"
        ? [w.meaning_kr]
        : [],
    meanings_en_simple: Array.isArray(w.meanings_en_simple)
      ? w.meanings_en_simple
      : typeof w.meaning_en === "string"
        ? [w.meaning_en]
        : [],
  }));

  return (
    <LearningRunner
      words={learningWords}
      onFinish={() => {
        console.log("Study complete");
      }}
    />
  );
}
