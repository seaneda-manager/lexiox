"use client";

import { useMemo, useState } from "react";
import type { NaesinPassage } from "@/components/naesin/drill/types";

type FlatSentence = {
  paragraphId: string;
  paragraphLabel?: string;
  sentenceId: string;
  text: string;
};

type Chunk = {
  id: string;
  en: string;
  koHint?: string;
};

type ReadStage = "skeleton" | "chunk" | "keyword" | "final";

type SentenceProgress = {
  stage: ReadStage;
  completed: boolean;
};

type Props = {
  passage: NaesinPassage;
};

function flattenSentences(passage: NaesinPassage): FlatSentence[] {
  return passage.paragraphs.flatMap((paragraph) =>
    paragraph.sentences.map((sentence) => ({
      paragraphId: paragraph.id,
      paragraphLabel: paragraph.label,
      sentenceId: sentence.id,
      text: sentence.text,
    })),
  );
}

function splitIntoChunks(text: string): Chunk[] {
  const raw = text
    .replace(/\s+/g, " ")
    .trim()
    .split(/,\s*|\s+because\s+|\s+that\s+|\s+before\s+|\s+after\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);

  if (raw.length <= 1) {
    const words = text.trim().split(/\s+/);
    const midpoint = Math.max(2, Math.floor(words.length / 2));
    return [
      {
        id: "c1",
        en: words.slice(0, midpoint).join(" "),
        koHint: "앞부분 핵심 청크",
      },
      {
        id: "c2",
        en: words.slice(midpoint).join(" "),
        koHint: "뒷부분 핵심 청크",
      },
    ].filter((item) => item.en.trim());
  }

  return raw.map((part, index) => ({
    id: `c${index + 1}`,
    en: part,
    koHint: `청크 ${index + 1}`,
  }));
}

function skeletonize(text: string): string {
  const words = text.split(/\s+/);
  return words
    .map((word, index) => {
      const clean = word.replace(/[^A-Za-z]/g, "");
      if (clean.length <= 3) return word;
      if (index % 2 === 0) return word;
      return "...";
    })
    .join(" ");
}

function keywordize(text: string): string[] {
  const stop = new Set([
    "the",
    "a",
    "an",
    "is",
    "are",
    "was",
    "were",
    "to",
    "of",
    "in",
    "on",
    "at",
    "for",
    "with",
    "and",
    "or",
    "that",
    "who",
    "which",
    "because",
    "before",
    "after",
    "during",
  ]);

  const tokens = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter((token) => token && !stop.has(token));

  return Array.from(new Set(tokens)).slice(0, 4);
}

function stageLabel(stage: ReadStage): string {
  switch (stage) {
    case "skeleton":
      return "A. 골격 회상";
    case "chunk":
      return "B. 청크 읽기";
    case "keyword":
      return "C. 키워드 회상";
    case "final":
      return "D. 최종 읽기";
  }
}

export default function Stage8ReadAloudMemory({ passage }: Props) {
  const sentences = useMemo(() => flattenSentences(passage), [passage]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showKoreanHint, setShowKoreanHint] = useState(false);
  const [progress, setProgress] = useState<Record<string, SentenceProgress>>({});

  const current = sentences[currentIndex];
  const currentChunks = useMemo(
    () => (current ? splitIntoChunks(current.text) : []),
    [current],
  );
  const currentKeywords = useMemo(
    () => (current ? keywordize(current.text) : []),
    [current],
  );

  const currentStage: ReadStage = progress[current?.sentenceId ?? ""]?.stage ?? "skeleton";
  const currentCompleted = progress[current?.sentenceId ?? ""]?.completed ?? false;

  function advanceStage() {
    if (!current) return;

    const order: ReadStage[] = ["skeleton", "chunk", "keyword", "final"];
    const idx = order.indexOf(currentStage);
    const nextStage = order[Math.min(order.length - 1, idx + 1)];

    setProgress((prev) => ({
      ...prev,
      [current.sentenceId]: {
        stage: nextStage,
        completed: nextStage === "final" ? true : false,
      },
    }));
  }

  function completeAndNext() {
    if (!current) return;

    setProgress((prev) => ({
      ...prev,
      [current.sentenceId]: {
        stage: "final",
        completed: true,
      },
    }));

    setShowKoreanHint(false);

    if (currentIndex < sentences.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }

  function jumpToSentence(index: number) {
    setCurrentIndex(index);
    setShowKoreanHint(false);
  }

  const completedSentences = sentences.filter(
    (sentence) => progress[sentence.sentenceId]?.completed,
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
      <section className="space-y-4 rounded-2xl border bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Read Aloud Memory
            </div>
            <h2 className="text-xl font-semibold text-neutral-900">
              소리내어 읽기 전, 떠올리고 다시 읽기
            </h2>
          </div>
          <div className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium text-neutral-700">
            {currentIndex + 1} / {sentences.length}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
            현재 단계
          </div>
          <div className="text-lg font-semibold text-neutral-900">{stageLabel(currentStage)}</div>
        </div>

        <div className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            현재 문장
          </div>
          <p className="text-2xl font-semibold leading-10 text-neutral-900">
            {currentStage === "skeleton" && current ? skeletonize(current.text) : null}
            {currentStage === "chunk" && current ? current.text : null}
            {currentStage === "keyword" && current ? currentKeywords.join(" · ") : null}
            {currentStage === "final" && current ? current.text : null}
          </p>

          {currentStage === "skeleton" ? (
            <div className="text-sm text-neutral-600">
              영어 골격만 보고 먼저 떠올려서 말해보세요.
            </div>
          ) : null}

          {currentStage === "chunk" ? (
            <div className="space-y-2">
              <div className="text-sm text-neutral-600">
                청크별로 끊어 읽고, 이어서 전체 문장을 말해보세요.
              </div>
              <div className="flex flex-wrap gap-2">
                {currentChunks.map((chunk) => (
                  <span
                    key={chunk.id}
                    className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-800"
                  >
                    {chunk.en}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {currentStage === "keyword" ? (
            <div className="text-sm text-neutral-600">
              핵심어만 보고 문장을 복원해서 말해보세요.
            </div>
          ) : null}

          {showKoreanHint ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                한글 힌트
              </div>
              <div className="flex flex-wrap gap-2">
                {currentChunks.map((chunk) => (
                  <span
                    key={`${chunk.id}-ko`}
                    className="rounded-lg bg-white px-3 py-1.5 text-sm text-neutral-700"
                  >
                    {chunk.koHint ?? "청크 힌트"}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowKoreanHint((prev) => !prev)}
            className="rounded-xl border px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            {showKoreanHint ? "한글 힌트 닫기" : "한글 힌트 보기"}
          </button>

          <button
            type="button"
            onClick={advanceStage}
            disabled={currentStage === "final"}
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            다음 단계
          </button>

          <button
            type="button"
            onClick={completeAndNext}
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            문장 완료 & 다음
          </button>
        </div>

        <div className="space-y-2 rounded-2xl border bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
            전체 문장 보기
          </div>
          <div className="space-y-2">
            {sentences.map((sentence, index) => {
              const isCurrent = index === currentIndex;
              const isDone = progress[sentence.sentenceId]?.completed;

              return (
                <button
                  key={sentence.sentenceId}
                  type="button"
                  onClick={() => jumpToSentence(index)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                    isCurrent
                      ? "border-sky-500 bg-sky-50 text-sky-900"
                      : isDone
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                    문장 {index + 1}
                  </div>
                  <div className="line-clamp-2 leading-6">{sentence.text}</div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <aside className="space-y-4 rounded-2xl border bg-white p-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
            Progress
          </div>
          <h3 className="mt-1 text-lg font-semibold text-neutral-900">회상 진행 현황</h3>
        </div>

        <div className="grid gap-3">
          <div className="rounded-2xl bg-neutral-50 p-4">
            <div className="text-sm text-neutral-500">완료 문장</div>
            <div className="mt-1 text-2xl font-semibold text-neutral-900">
              {completedSentences.length}
            </div>
          </div>

          <div className="rounded-2xl bg-neutral-50 p-4">
            <div className="text-sm text-neutral-500">현재 단계</div>
            <div className="mt-1 text-base font-semibold text-neutral-900">
              {stageLabel(currentStage)}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold text-neutral-900">완료된 문장</div>
          {completedSentences.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 px-4 py-6 text-sm text-neutral-500">
              아직 완료된 문장이 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {completedSentences.map((sentence) => {
                const index = sentences.findIndex((item) => item.sentenceId === sentence.sentenceId);
                return (
                  <button
                    key={`${sentence.sentenceId}-done`}
                    type="button"
                    onClick={() => jumpToSentence(index)}
                    className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm text-emerald-900"
                  >
                    <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                      완료 문장 {index + 1}
                    </div>
                    <div className="line-clamp-2 leading-6">{sentence.text}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
