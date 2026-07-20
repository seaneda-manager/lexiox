"use client";

import LearningRunner from "@/components/vocab/learning/LearningRunner";
import type { LearningWord } from "@/components/vocab/learning/learning.types";
import type { SessionWord } from "@/models/vocab/SessionWord";

type Props = {
  words: SessionWord[];
};

export default function VocabStudyClient({ words }: Props) {
  const learningWords: LearningWord[] = words.map((w) => ({
    id: w.id,
    text: w.text,
    lemma: w.text,
    meanings_ko: w.meanings_ko,
    meanings_en_simple: w.meanings_en_simple,
  }));

  return (
    <LearningRunner
      words={learningWords}
      onFinish={() => {
        // Study 완료 시 처리
        console.log("Study complete");
      }}
    />
  );
}
