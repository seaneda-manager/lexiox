"use client";

import type {
  PassageSentence,
  ReadAloudAuthoringItem,
} from "@/components/naesin/authoring/passage_authoring_schema_v1";

function createChunkId(index: number) {
  return `chunk-${index + 1}`;
}

function createEmptyItem(defaultSentenceId?: string): ReadAloudAuthoringItem {
  return {
    sentenceId: defaultSentenceId ?? "",
    skeleton: "",
    keywordHints: [""],
    chunks: [
      {
        id: createChunkId(0),
        text: "",
        hintKo: "",
      },
    ],
    finalText: "",
  };
}

type Props = {
  sentences: PassageSentence[];
  readAloudItems: ReadAloudAuthoringItem[];
  onChange: (next: ReadAloudAuthoringItem[]) => void;
};

function toggleStringInList(list: string[], value: string) {
  const normalized = value.trim();
  if (!normalized) return list;
  if (list.includes(normalized)) {
    return list.filter((item) => item !== normalized);
  }
  return [...list, normalized];
}

export default function ReadAloudItemsEditor({
  sentences,
  readAloudItems,
  onChange,
}: Props) {
  const sentenceMap = new Map(
    sentences.map((sentence) => [sentence.id, sentence.text]),
  );

  function patchItem(
    sentenceId: string,
    patch: Partial<ReadAloudAuthoringItem>,
  ) {
    onChange(
      readAloudItems.map((item) =>
        item.sentenceId === sentenceId ? { ...item, ...patch } : item,
      ),
    );
  }

  function addItem() {
    const defaultSentenceId = sentences[0]?.id ?? "";
    const duplicate = readAloudItems.some(
      (item) => item.sentenceId === defaultSentenceId,
    );

    const safeSentenceId = duplicate ? "" : defaultSentenceId;

    onChange([...readAloudItems, createEmptyItem(safeSentenceId)]);
  }

  function removeItem(sentenceId: string) {
    onChange(readAloudItems.filter((item) => item.sentenceId !== sentenceId));
  }

  function patchKeyword(
    sentenceId: string,
    keywordIndex: number,
    value: string,
  ) {
    onChange(
      readAloudItems.map((item) => {
        if (item.sentenceId !== sentenceId) return item;
        const nextKeywords = [...item.keywordHints];
        nextKeywords[keywordIndex] = value;
        return { ...item, keywordHints: nextKeywords };
      }),
    );
  }

  function addKeyword(sentenceId: string) {
    onChange(
      readAloudItems.map((item) =>
        item.sentenceId !== sentenceId
          ? item
          : { ...item, keywordHints: [...item.keywordHints, ""] },
      ),
    );
  }

  function removeKeyword(sentenceId: string, keywordIndex: number) {
    onChange(
      readAloudItems.map((item) => {
        if (item.sentenceId !== sentenceId) return item;
        const nextKeywords = item.keywordHints.filter(
          (_, index) => index !== keywordIndex,
        );
        return {
          ...item,
          keywordHints: nextKeywords.length > 0 ? nextKeywords : [""],
        };
      }),
    );
  }

  function patchChunk(
    sentenceId: string,
    chunkId: string,
    patch: { text?: string; hintKo?: string },
  ) {
    onChange(
      readAloudItems.map((item) =>
        item.sentenceId !== sentenceId
          ? item
          : {
              ...item,
              chunks: item.chunks.map((chunk) =>
                chunk.id === chunkId ? { ...chunk, ...patch } : chunk,
              ),
            },
      ),
    );
  }

  function addChunk(sentenceId: string) {
    onChange(
      readAloudItems.map((item) =>
        item.sentenceId !== sentenceId
          ? item
          : {
              ...item,
              chunks: [
                ...item.chunks,
                {
                  id: createChunkId(item.chunks.length),
                  text: "",
                  hintKo: "",
                },
              ],
            },
      ),
    );
  }

  function removeChunk(sentenceId: string, chunkId: string) {
    onChange(
      readAloudItems.map((item) => {
        if (item.sentenceId !== sentenceId) return item;
        const nextChunks = item.chunks.filter((chunk) => chunk.id !== chunkId);
        return {
          ...item,
          chunks:
            nextChunks.length > 0
              ? nextChunks
              : [
                  {
                    id: createChunkId(0),
                    text: "",
                    hintKo: "",
                  },
                ],
        };
      }),
    );
  }

  function changeSentenceId(prevSentenceId: string, nextSentenceId: string) {
    onChange(
      readAloudItems.map((item) =>
        item.sentenceId === prevSentenceId
          ? {
              ...item,
              sentenceId: nextSentenceId,
              finalText:
                item.finalText || sentenceMap.get(nextSentenceId) || "",
            }
          : item,
      ),
    );
  }

  const usedSentenceIds = readAloudItems.map((item) => item.sentenceId);

  return (
    <section className="space-y-4 rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-neutral-900">
            Read Aloud Items Editor
          </div>
          <div className="mt-1 text-sm text-neutral-500">
            sentence별 skeleton, keyword hint, chunk hint, final text를
            authoring합니다.
          </div>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Read Aloud Item 추가
        </button>
      </div>

      {readAloudItems.length === 0 ? (
        <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">
          아직 read aloud item이 없습니다. 위 버튼으로 첫 item을 추가하세요.
        </div>
      ) : (
        <div className="space-y-5">
          {readAloudItems.map((item, itemIndex) => {
            const sourceSentence =
              sentenceMap.get(item.sentenceId) ?? "문장을 먼저 선택하세요.";

            return (
              <article
                key={`${item.sentenceId || "unassigned"}-${itemIndex}`}
                className="rounded-3xl border border-neutral-200 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      Read Aloud Item {itemIndex + 1}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-neutral-900">
                      {item.sentenceId || "sentence-unassigned"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.sentenceId)}
                    className="rounded-2xl border px-3 py-2 text-sm font-medium text-red-600"
                  >
                    Item 삭제
                  </button>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <label className="space-y-2">
                    <div className="text-sm font-medium text-neutral-800">
                      Sentence
                    </div>
                    <select
                      value={item.sentenceId}
                      onChange={(e) =>
                        changeSentenceId(item.sentenceId, e.target.value)
                      }
                      className="w-full rounded-2xl border px-3 py-2 text-sm"
                    >
                      <option value="">문장 선택</option>
                      {sentences.map((sentence) => {
                        const disabled =
                          usedSentenceIds.includes(sentence.id) &&
                          sentence.id !== item.sentenceId;

                        return (
                          <option
                            key={sentence.id}
                            value={sentence.id}
                            disabled={disabled}
                          >
                            {sentence.id} · {sentence.text}
                          </option>
                        );
                      })}
                    </select>
                  </label>

                  <div className="rounded-2xl bg-neutral-50 p-3 text-sm text-neutral-700">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                      Source Sentence
                    </div>
                    <div className="mt-2 leading-7">{sourceSentence}</div>
                  </div>
                </div>

                <label className="mt-4 block space-y-2">
                  <div className="text-sm font-medium text-neutral-800">
                    Skeleton
                  </div>
                  <textarea
                    value={item.skeleton}
                    onChange={(e) =>
                      patchItem(item.sentenceId, { skeleton: e.target.value })
                    }
                    className="min-h-[96px] w-full rounded-2xl border px-3 py-2 text-sm leading-7"
                    placeholder="예: The boy _____ a blue cap _____ quickly to the store."
                  />
                </label>

                <div className="mt-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-neutral-900">
                      Keyword Hints
                    </div>
                    <button
                      type="button"
                      onClick={() => addKeyword(item.sentenceId)}
                      className="rounded-2xl border px-3 py-2 text-sm font-medium text-neutral-700"
                    >
                      Keyword 추가
                    </button>
                  </div>

                  <div className="space-y-3">
                    {item.keywordHints.map((keyword, keywordIndex) => (
                      <div
                        key={`${item.sentenceId}-keyword-${keywordIndex}`}
                        className="grid gap-3 rounded-2xl border p-3 md:grid-cols-[1fr_auto] md:items-center"
                      >
                        <input
                          value={keyword}
                          onChange={(e) =>
                            patchKeyword(
                              item.sentenceId,
                              keywordIndex,
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border px-3 py-2 text-sm"
                          placeholder="예: blue cap / quickly / store"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            removeKeyword(item.sentenceId, keywordIndex)
                          }
                          className="rounded-2xl border px-3 py-2 text-sm text-red-600"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-neutral-900">
                      Hint Chunks
                    </div>
                    <button
                      type="button"
                      onClick={() => addChunk(item.sentenceId)}
                      className="rounded-2xl border px-3 py-2 text-sm font-medium text-neutral-700"
                    >
                      Chunk 추가
                    </button>
                  </div>

                  <div className="space-y-3">
                    {item.chunks.map((chunk) => (
                      <div
                        key={chunk.id}
                        className="rounded-2xl border p-3"
                      >
                        <div className="mb-3 text-sm font-semibold text-neutral-500">
                          {chunk.id}
                        </div>

                        <div className="grid gap-3 xl:grid-cols-2">
                          <label className="space-y-2">
                            <div className="text-sm text-neutral-700">
                              Chunk Text
                            </div>
                            <input
                              value={chunk.text}
                              onChange={(e) =>
                                patchChunk(item.sentenceId, chunk.id, {
                                  text: e.target.value,
                                })
                              }
                              className="w-full rounded-2xl border px-3 py-2 text-sm"
                              placeholder="예: who is wearing"
                            />
                          </label>

                          <label className="space-y-2">
                            <div className="text-sm text-neutral-700">
                              한국어 힌트
                            </div>
                            <input
                              value={chunk.hintKo ?? ""}
                              onChange={(e) =>
                                patchChunk(item.sentenceId, chunk.id, {
                                  hintKo: e.target.value,
                                })
                              }
                              className="w-full rounded-2xl border px-3 py-2 text-sm"
                              placeholder="예: 쓰고 있는"
                            />
                          </label>
                        </div>

                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              removeChunk(item.sentenceId, chunk.id)
                            }
                            className="rounded-2xl border px-3 py-2 text-sm text-red-600"
                          >
                            Chunk 삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <label className="mt-6 block space-y-2">
                  <div className="text-sm font-medium text-neutral-800">
                    Final Text
                  </div>
                  <textarea
                    value={item.finalText}
                    onChange={(e) =>
                      patchItem(item.sentenceId, { finalText: e.target.value })
                    }
                    className="min-h-[96px] w-full rounded-2xl border px-3 py-2 text-sm leading-7"
                    placeholder="최종 정답 문장"
                  />
                </label>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
