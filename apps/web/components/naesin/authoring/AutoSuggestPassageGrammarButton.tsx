"use client";

import { useMemo, useState, useTransition } from "react";
import { runAutoSuggestPassageGrammarTargetsAction } from "@/app/protected/admin/naesin/passages/grammar-actions";
import type { GrammarUnitLite } from "@/lib/naesin/grammar/ruleScanV1";

type Props = {
  passageId: string;
  lessonGrammarUnits: GrammarUnitLite[];
};

export default function AutoSuggestPassageGrammarButton({
  passageId,
  lessonGrammarUnits,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const unitCount = useMemo(() => lessonGrammarUnits.length, [lessonGrammarUnits]);

  function handleRun() {
    setMessage("");
    setError("");

    startTransition(async () => {
      const result = await runAutoSuggestPassageGrammarTargetsAction({
        passageId,
        lessonGrammarUnits,
        replaceExistingAutoDetected: true,
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      setMessage(
        [
          `자동 추천 완료`,
          `문장 ${result.sentenceCount}개`,
          `후보 ${result.candidateCount}개`,
          `저장 ${result.insertedCount}개`,
        ].join(" · "),
      );
    });
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
        현재 lesson grammar units: <span className="font-semibold">{unitCount}</span>
      </div>

      <button
        type="button"
        onClick={handleRun}
        disabled={isPending || unitCount === 0}
        className="rounded-2xl border px-4 py-2 text-sm font-medium text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "문법 자동 추천 실행 중..." : "문법 자동 추천 실행"}
      </button>

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
