"use client";

import LearningLayout3Col from "@/components/vocab/LearningLayout3Col";
import { demoVocabWords } from "@/models/vocab-demo";
import type { VocabWordCore } from "@/models/vocab";

export default function VocabLearnPage() {
  /**
   * This page MUST ALWAYS render LearningLayout3Col.
   * No gate logic here.
   * No mini challenge here.
   */

  const words: VocabWordCore[] = demoVocabWords;

  if (!words || words.length === 0) {
    return (
      <div className="p-6 text-sm text-gray-500">
        학습할 단어가 없습니다.
      </div>
    );
  }

  return (
    <main className="mx-auto space-y-6 pb-8 max-w-4xl">
      <LearningLayout3Col
        words={words}
        finishHref="/vocab/review"
      />
    </main>
  );
}
