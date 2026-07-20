// apps/web/components/vocab/VocabWordDrillPanel.tsx
"use client";

import { useMemo } from "react";

/* =========================================================
 * Types (local, SSOT-safe)
 * ======================================================= */

export type VocabDrillType =
  | "MEANING"
  | "SPELLING"
  | "COLLOCATION"
  | "SENTENCE";

export type VocabDrillEntry = {
  id: string;
  drillType: VocabDrillType;
  prompt: string;
  choices?: string[];
  answer?: string;
};

export type VocabWordForDrill = {
  id: string;
  text: string;
  meanings_ko?: string[];
  drillEntries?: VocabDrillEntry[]; // optional by design
};

type Props = {
  word: VocabWordForDrill;
  onComplete?: (result: {
    drillId: string;
    drillType: VocabDrillType;
    correct: boolean;
  }) => void;
};

/* =========================================================
 * Component
 * ======================================================= */

export default function VocabWordDrillPanel({
  word,
  onComplete,
}: Props) {
  /**
   * drillEntries는 "없을 수 있는 게 정상"
   */
  const drills = useMemo<VocabDrillEntry[]>(
    () => word.drillEntries ?? [],
    [word.drillEntries],
  );

  const drill = drills[0];

  /* =========================================================
   * Empty State (정상 흐름)
   * ======================================================= */

  if (!drill) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-gray-500">
        <p className="font-medium text-gray-700">
          아직 생성된 Drill이 없습니다.
        </p>
        <p className="mt-1 text-xs leading-relaxed">
          이 단어는 현재 Learning / Speed 단계에 있으며,
          <br />
          Drill은 이후 단계에서 자동 생성됩니다.
        </p>
      </div>
    );
  }

  /* =========================================================
   * Handlers
   * ======================================================= */

  function report(correct: boolean) {
    onComplete?.({
      drillId: drill.id,
      drillType: drill.drillType,
      correct,
    });
  }

  /* =========================================================
   * Render
   * ======================================================= */

  return (
    <div className="space-y-4 rounded-lg border p-4">
      {/* ===== Header ===== */}
      <header>
        <h3 className="text-lg font-semibold">
          {word.text}
        </h3>

        {word.meanings_ko?.length ? (
          <p className="mt-1 text-sm text-gray-600">
            {word.meanings_ko.join(" / ")}
          </p>
        ) : null}
      </header>

      {/* ===== Drill Body ===== */}
      <div className="rounded-md bg-gray-50 p-3">
        <p className="text-sm font-medium">
          {drill.prompt}
        </p>

        {/* =====================
           객관식 Drill
        ===================== */}
        {drill.choices && drill.choices.length > 0 && (
          <div className="mt-3 space-y-2">
            {drill.choices.map((choice) => {
              const isCorrect =
                choice === drill.answer;

              return (
                <button
                  key={choice}
                  type="button"
                  onClick={() => report(isCorrect)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      report(isCorrect);
                    }
                  }}
                  className="block w-full rounded-md border px-3 py-2 text-left text-sm transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-black/20"
                >
                  {choice}
                </button>
              );
            })}
          </div>
        )}

        {/* =====================
           주관식 / 판단형 Drill
        ===================== */}
        {!drill.choices && (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => report(true)}
              className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm text-white transition hover:brightness-110"
            >
              맞음
            </button>

            <button
              type="button"
              onClick={() => report(false)}
              className="flex-1 rounded-md border px-3 py-2 text-sm transition hover:bg-gray-100"
            >
              틀림
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
