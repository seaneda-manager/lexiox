// apps/web/app/(protected)/vocab/pre-screen/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";

import PrescreenBoard from "@/components/vocab/PrescreenBoard";

import { demoVocabWords } from "@/models/vocab-demo";
import type { VocabWordCore } from "@/models/vocab";
import type { PrescreenResult } from "@/models/vocab/session/prescreen";
import type { VocabSessionState } from "@/models/vocab";

/* =========================================================
 * adapter (demo → core)
 * ======================================================= */

function toVocabWordCore(w: any): VocabWordCore {
  return {
    id: w.id,
    text: w.text,
    lemma: w.text,
    pos: w.pos ?? null,
    is_function_word: false,
    meanings_ko: w.meanings_ko ?? [],
    meanings_en_simple: [],
    examples_easy: [],
    examples_hard: [],
    frequency: null,
    gradeBandMin: null,
    gradeBandMax: null,
    tags: [],
  };
}

export default function VocabPreScreenPage() {
  const router = useRouter();

  const words: VocabWordCore[] = useMemo(
    () => demoVocabWords.map(toVocabWordCore),
    [],
  );

  function handleFinish(result: PrescreenResult) {
    const { knownWordIds, unknownWordIds } = result;

    const todayWordIds =
      unknownWordIds.length > 0
        ? unknownWordIds
        : knownWordIds;

    const session: VocabSessionState = {
      userId: "demo-user",
      mode: "core",
      gradeBand: null,
      todayWordIds,
      knownWordIds,
      unknownWordIds,
      currentIndex: 0,
      recallQueue: [],
    };

    sessionStorage.setItem(
      "lingox_vocab_session",
      JSON.stringify(session),
    );

    router.push("/vocab/learn");
  }

  return (
    <PrescreenBoard
      words={words}
      onFinish={handleFinish}
    />
  );
}
