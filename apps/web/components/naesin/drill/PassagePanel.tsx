"use client";

import { useEffect, useRef } from "react";
import {
  flattenPassageSentences,
  type DrillStage,
  type NaesinPassage,
  type UnknownWordMark,
} from "@/components/naesin/drill/types";

type Props = {
  passage: NaesinPassage;
  currentStage: DrillStage;
  currentSentenceIndex: number;
  unknownWords: UnknownWordMark[];
  onSentenceSelect: (sentenceIndex: number) => void;
  onWordToggle: (input: {
    sentenceIndex: number;
    tokenIndex: number;
    rawWord: string;
  }) => void;
};

function normalizeWord(value: string) {
  return value.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "").toLowerCase();
}

function isWordChunk(chunk: string) {
  return /[A-Za-z]/.test(chunk);
}

export default function PassagePanel({
  passage,
  currentStage,
  currentSentenceIndex,
  unknownWords,
  onSentenceSelect,
  onWordToggle,
}: Props) {
  const sentences = flattenPassageSentences(passage);
  const selectedWordIds = new Set(unknownWords.map((w) => w.id));
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [currentSentenceIndex]);

  let runningSentenceIndex = -1;

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-4 space-y-1">
        <div className="text-xs uppercase tracking-[0.18em] text-neutral-400">
          Passage
        </div>
        <div className="text-lg font-semibold text-neutral-900">{passage.title}</div>
        {passage.subtitle ? (
          <div className="text-sm text-neutral-500">{passage.subtitle}</div>
        ) : null}
      </div>

      <div className="space-y-4">
        {passage.paragraphs.map((paragraph, pIdx) => (
          <div key={paragraph.id} className="space-y-2">
            <div className="text-xs font-semibold text-neutral-400">
              문단 {pIdx + 1}
            </div>

            <div className="space-y-2">
              {paragraph.sentences.map((sentence) => {
                runningSentenceIndex += 1;
                const sentenceIndex = runningSentenceIndex;
                const isCurrent = sentenceIndex === currentSentenceIndex;
                const isHiddenForComposition =
                  isCurrent && currentStage === "composition";
                const parts = sentence.text.split(/(\s+)/);

                return (
                  <button
                    key={sentence.id}
                    ref={isCurrent ? activeRef : undefined}
                    type="button"
                    onClick={() => onSentenceSelect(sentenceIndex)}
                    className={[
                      "block w-full rounded-xl border px-3 py-3 text-left transition",
                      isCurrent
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-neutral-200 bg-white hover:bg-neutral-50",
                    ].join(" ")}
                  >
                    <div className="mb-2 text-[11px] font-semibold text-neutral-500">
                      문장 {sentenceIndex + 1}
                    </div>

                    <div className="text-sm leading-7 text-neutral-800">
                      {isHiddenForComposition ? (
                        <span className="italic text-neutral-400">
                          🔒 작문 중에는 원문이 가려집니다. 한글 뜻을 보고 영어로 작문해보세요.
                        </span>
                      ) : parts.map((chunk, tokenIndex) => {
                        if (!chunk) return null;
                        if (/^\s+$/.test(chunk)) {
                          return <span key={`${sentence.id}-${tokenIndex}`}>{chunk}</span>;
                        }

                        if (
                          currentStage === "word_analysis" &&
                          isWordChunk(chunk)
                        ) {
                          const normalized = normalizeWord(chunk);
                          const id = `${sentenceIndex}:${tokenIndex}:${normalized}`;
                          const isSelected = selectedWordIds.has(id);

                          return (
                            <span
                              key={`${sentence.id}-${tokenIndex}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onWordToggle({ sentenceIndex, tokenIndex, rawWord: chunk });
                              }}
                              className={[
                                "cursor-pointer rounded px-0.5 py-0.5",
                                isSelected
                                  ? "bg-amber-200 font-medium text-amber-950"
                                  : "hover:bg-amber-50",
                              ].join(" ")}
                            >
                              {chunk}
                            </span>
                          );
                        }

                        return <span key={`${sentence.id}-${tokenIndex}`}>{chunk}</span>;
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-dashed bg-neutral-50 p-3 text-xs text-neutral-500">
        전체 문장 수: {sentences.length}
      </div>
    </div>
  );
}
