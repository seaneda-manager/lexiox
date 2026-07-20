"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UnknownWordMark } from "@/components/naesin/drill/types";

type Props = {
  unknownWords: UnknownWordMark[];
  onUpdateWordMeta: (
    id: string,
    patch: Partial<Pick<UnknownWordMark, "pos" | "meaning">>,
  ) => void;
  onRemoveWord: (id: string) => void;
};

type LoadingMap = Record<string, boolean>;
type LookupStatus = "idle" | "loading" | "found" | "missing" | "error";
type LookupStatusMap = Record<string, LookupStatus>;

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isMissingMeta(word: UnknownWordMark): boolean {
  const pos = (word.pos ?? "").trim();
  const meaning = (word.meaning ?? "").trim();

  return (
    pos === "-" ||
    meaning === "사전 미등록" ||
    meaning === "조회 실패" ||
    meaning === "뜻 없음" ||
    meaning === "뜻 컬럼 비어 있음"
  );
}

export default function Stage1WordAnalysis({
  unknownWords,
  onUpdateWordMeta,
  onRemoveWord,
}: Props) {
  const [loadingMap, setLoadingMap] = useState<LoadingMap>({});
  const [statusMap, setStatusMap] = useState<LookupStatusMap>({});
  const requestedRef = useRef<Set<string>>(new Set());
  const latestWordsRef = useRef<UnknownWordMark[]>(unknownWords);

  useEffect(() => {
    latestWordsRef.current = unknownWords;
  }, [unknownWords]);

  useEffect(() => {
    const liveIds = new Set(unknownWords.map((word) => word.id));

    requestedRef.current.forEach((id) => {
      if (!liveIds.has(id)) {
        requestedRef.current.delete(id);
      }
    });

    setStatusMap((prev) => {
      const next: LookupStatusMap = {};
      for (const [id, status] of Object.entries(prev)) {
        if (liveIds.has(id)) next[id] = status;
      }
      return next;
    });

    setLoadingMap((prev) => {
      const next: LoadingMap = {};
      for (const [id, loading] of Object.entries(prev)) {
        if (liveIds.has(id)) next[id] = loading;
      }
      return next;
    });
  }, [unknownWords]);

  const lookupWordMeta = useCallback(
    async (target: UnknownWordMark, force = false) => {
      const surface = target.word?.trim();
      if (!surface) {
        requestedRef.current.delete(target.id);
        return;
      }

      if (force) {
        requestedRef.current.delete(target.id);
      }

      requestedRef.current.add(target.id);
      setLoadingMap((prev) => ({ ...prev, [target.id]: true }));
      setStatusMap((prev) => ({ ...prev, [target.id]: "loading" }));

      try {
        const res = await fetch(
          `/api/naesin/word-lookup?word=${encodeURIComponent(surface)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data = await res.json();

        if (!res.ok || !data?.ok) {
          setStatusMap((prev) => ({ ...prev, [target.id]: "error" }));
          requestedRef.current.delete(target.id);
          return;
        }

        const current = latestWordsRef.current.find((w) => w.id === target.id);
        if (!current) return;

        const patch: Partial<Pick<UnknownWordMark, "pos" | "meaning">> = {};

        const nextPos = data?.found
          ? (data.word?.pos ?? "-")
          : (data.pos ?? "-");

        const nextMeaning = data?.found
          ? (data.word?.meaning ?? "뜻 없음")
          : (data.meaning ?? "사전 미등록");

        if (!hasText(current.pos) && hasText(nextPos)) {
          patch.pos = nextPos;
        }

        if (!hasText(current.meaning) && hasText(nextMeaning)) {
          patch.meaning = nextMeaning;
        }

        if (Object.keys(patch).length > 0) {
          onUpdateWordMeta(target.id, patch);
        }

        setStatusMap((prev) => ({
          ...prev,
          [target.id]: data?.found ? "found" : "missing",
        }));
      } catch (error) {
        console.error("[Stage1WordAnalysis.lookupWordMeta]", error);
        setStatusMap((prev) => ({ ...prev, [target.id]: "error" }));
        requestedRef.current.delete(target.id);
      } finally {
        setLoadingMap((prev) => {
          const next = { ...prev };
          delete next[target.id];
          return next;
        });
      }
    },
    [onUpdateWordMeta],
  );

  useEffect(() => {
    unknownWords.forEach((word) => {
      const needsPos = !hasText(word.pos);
      const needsMeaning = !hasText(word.meaning);
      const needsLookup = needsPos || needsMeaning;

      if (!needsLookup) return;
      if (requestedRef.current.has(word.id)) return;

      void lookupWordMeta(word);
    });
  }, [unknownWords, lookupWordMeta]);

  const unresolvedWords = useMemo(() => {
    return unknownWords.filter((word) => {
      const status = statusMap[word.id];
      return status === "missing" || status === "error" || isMissingMeta(word);
    });
  }, [statusMap, unknownWords]);

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-neutral-400">
            Stage 1
          </div>
          <div className="text-lg font-semibold text-neutral-900">단어 분석</div>
          <div className="mt-1 text-sm text-neutral-500">
            지문에서 모르는 단어를 체크한 뒤 품사와 뜻을 확인합니다.
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unresolvedWords.length > 0 ? (
            <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700">
              미등록/실패 {unresolvedWords.length}개
            </div>
          ) : null}

          <div className="rounded-full border bg-neutral-50 px-3 py-1 text-xs text-neutral-600">
            체크 단어 {unknownWords.length}개
          </div>
        </div>
      </div>

      <div className="mt-4">
        {unknownWords.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-neutral-50 p-6 text-sm text-neutral-500">
            왼쪽 지문에서 모르는 단어를 클릭해서 체크하세요.
          </div>
        ) : (
          <div className="space-y-3">
            {unknownWords.map((word) => {
              const isLoading = !!loadingMap[word.id];
              const status = statusMap[word.id] ?? "idle";

              return (
                <div
                  key={word.id}
                  className="rounded-xl border bg-neutral-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-base font-semibold text-neutral-900">
                          {word.word}
                        </div>

                        {isLoading ? (
                          <div className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            자동 조회 중...
                          </div>
                        ) : null}

                        {!isLoading && status === "found" ? (
                          <div className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                            자동 채움 완료
                          </div>
                        ) : null}

                        {!isLoading && status === "missing" ? (
                          <div className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            미등록
                          </div>
                        ) : null}

                        {!isLoading && status === "error" ? (
                          <div className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                            조회 실패
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-1 text-xs text-neutral-500">
                        문장 {word.sentenceIndex + 1}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {(status === "missing" || status === "error") && !isLoading ? (
                        <button
                          type="button"
                          onClick={() => void lookupWordMeta(word, true)}
                          className="rounded-lg border px-2 py-1 text-xs text-neutral-700 hover:bg-white"
                        >
                          다시 조회
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => onRemoveWord(word.id)}
                        className="rounded-lg border px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        제거
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-neutral-700">
                        품사
                      </label>
                      <input
                        value={word.pos ?? ""}
                        onChange={(e) =>
                          onUpdateWordMeta(word.id, { pos: e.target.value })
                        }
                        placeholder="예: n. / v. / adj."
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-neutral-700">
                        뜻
                      </label>
                      <input
                        value={word.meaning ?? ""}
                        onChange={(e) =>
                          onUpdateWordMeta(word.id, { meaning: e.target.value })
                        }
                        placeholder="뜻 입력"
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {unresolvedWords.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-amber-900">
                자동 조회 실패 단어
              </div>
              <div className="mt-1 text-xs text-amber-700">
                words 사전에 없는 단어이거나 조회 중 문제가 있었던 단어들입니다.
              </div>
            </div>

            <div className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs text-amber-700">
              {unresolvedWords.length}개
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {unresolvedWords.map((word) => {
              const status = statusMap[word.id];

              return (
                <button
                  key={`missing-${word.id}`}
                  type="button"
                  onClick={() => void lookupWordMeta(word, true)}
                  className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs text-amber-800 hover:bg-amber-100"
                >
                  {word.word}
                  <span className="ml-1 text-amber-500">
                    {status === "error" ? "(retry)" : "(미등록)"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
