"use client";

import { useMemo, useState } from "react";
import type {
  PassageSentence,
  SentenceOrderAuthoringItem,
  SentenceOrderKind,
  SentenceOrderUnit,
} from "@/components/naesin/authoring/passage_authoring_schema_v1";

type Props = {
  sentences: PassageSentence[];
  sentenceOrderItems: SentenceOrderAuthoringItem[];
  onChange: (next: SentenceOrderAuthoringItem[]) => void;
};

type BuilderState = {
  selectedSentenceIds: string[];
  selectedLeadSentenceIds: string[];
};

const KIND_OPTIONS: Array<{ value: SentenceOrderKind; label: string; description: string }> = [
  {
    value: "naesin_excerpt_restore",
    label: "내신 발췌 복원",
    description: "긴 지문에서 발췌된 문장/문장묶음을 원래 순서로 복원",
  },
  {
    value: "mock_fixed_lead_reorder",
    label: "모의고사 선행 고정 배열",
    description: "앞부분은 고정 제시, 뒤의 파트들을 배열",
  },
];

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function createLabel(index: number) {
  return `(${String.fromCharCode(65 + index)})`;
}

function joinSentenceTexts(sentenceIds: string[], sentenceMap: Map<string, PassageSentence>) {
  return sentenceIds
    .map((id) => sentenceMap.get(id)?.text ?? id)
    .join(" ")
    .trim();
}

function createUnitFromSentence(
  sentence: PassageSentence,
  index: number,
): SentenceOrderUnit {
  return {
    id: createId("unit"),
    type: "sentence",
    label: createLabel(index),
    text: sentence.text,
    sourceSentenceIds: [sentence.id],
  };
}

function createBundleFromSentenceIds(
  sentenceIds: string[],
  sentenceMap: Map<string, PassageSentence>,
  index: number,
): SentenceOrderUnit {
  return {
    id: createId("unit"),
    type: sentenceIds.length > 1 ? "sentence_bundle" : "sentence",
    label: createLabel(index),
    text: joinSentenceTexts(sentenceIds, sentenceMap),
    sourceSentenceIds: sentenceIds,
  };
}

function createEmptyItem(): SentenceOrderAuthoringItem {
  return {
    id: createId("order"),
    kind: "naesin_excerpt_restore",
    title: "",
    instructions: "",
    exposeFullOriginal: false,
    reorderUnits: [],
    correctOrder: [],
    explanation: {
      summary: "",
      koreanHint: "",
    },
  };
}

function renumberLabels(units: SentenceOrderUnit[]) {
  return units.map((unit, index) => ({
    ...unit,
    label: unit.label?.trim() ? unit.label : createLabel(index),
  }));
}

function reorderArray<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [picked] = next.splice(from, 1);
  next.splice(to, 0, picked);
  return next;
}

function updateItem(
  items: SentenceOrderAuthoringItem[],
  itemId: string,
  updater: (item: SentenceOrderAuthoringItem) => SentenceOrderAuthoringItem,
) {
  return items.map((item) => (item.id === itemId ? updater(item) : item));
}

function getCorrectOrderUnits(item: SentenceOrderAuthoringItem) {
  const unitMap = new Map(item.reorderUnits.map((unit) => [unit.id, unit]));
  return item.correctOrder
    .map((id) => unitMap.get(id))
    .filter((unit): unit is SentenceOrderUnit => !!unit);
}

export default function SentenceOrderItemsEditor({
  sentences,
  sentenceOrderItems,
  onChange,
}: Props) {
  const [builderState, setBuilderState] = useState<Record<string, BuilderState>>({});

  const sentenceMap = useMemo(
    () => new Map(sentences.map((sentence) => [sentence.id, sentence])),
    [sentences],
  );

  const sentenceOptions = useMemo(
    () =>
      sentences.map((sentence) => ({
        id: sentence.id,
        label: `${sentence.id} · ${sentence.text}`,
      })),
    [sentences],
  );

  function getState(itemId: string): BuilderState {
    return (
      builderState[itemId] ?? {
        selectedSentenceIds: [],
        selectedLeadSentenceIds: [],
      }
    );
  }

  function patchState(itemId: string, next: Partial<BuilderState>) {
    setBuilderState((prev) => ({
      ...prev,
      [itemId]: {
        ...getState(itemId),
        ...next,
      },
    }));
  }

  function commitItem(
    itemId: string,
    updater: (item: SentenceOrderAuthoringItem) => SentenceOrderAuthoringItem,
  ) {
    onChange(updateItem(sentenceOrderItems, itemId, updater));
  }

  function handleAddItem() {
    onChange([...(sentenceOrderItems ?? []), createEmptyItem()]);
  }

  function handleAppendSelectedSentences(item: SentenceOrderAuthoringItem) {
    const selectedIds = getState(item.id).selectedSentenceIds;
    if (selectedIds.length === 0) return;

    const newUnits = selectedIds
      .map((id) => sentenceMap.get(id))
      .filter((sentence): sentence is PassageSentence => !!sentence)
      .map((sentence, index) => createUnitFromSentence(sentence, item.reorderUnits.length + index));

    commitItem(item.id, (current) => ({
      ...current,
      reorderUnits: renumberLabels([...current.reorderUnits, ...newUnits]),
      correctOrder: [...current.correctOrder, ...newUnits.map((unit) => unit.id)],
    }));
  }

  function handleAppendSelectedBundle(item: SentenceOrderAuthoringItem) {
    const selectedIds = getState(item.id).selectedSentenceIds;
    if (selectedIds.length === 0) return;

    const bundle = createBundleFromSentenceIds(selectedIds, sentenceMap, item.reorderUnits.length);

    commitItem(item.id, (current) => ({
      ...current,
      reorderUnits: renumberLabels([...current.reorderUnits, bundle]),
      correctOrder: [...current.correctOrder, bundle.id],
    }));
  }

  function handleFillLeadFromSelection(item: SentenceOrderAuthoringItem) {
    const selectedIds = getState(item.id).selectedLeadSentenceIds;
    if (selectedIds.length === 0) return;

    commitItem(item.id, (current) => ({
      ...current,
      fixedLead: {
        id: current.fixedLead?.id ?? createId("lead"),
        type: "part",
        label: current.fixedLead?.label?.trim() ? current.fixedLead.label : "Lead",
        text: joinSentenceTexts(selectedIds, sentenceMap),
        sourceSentenceIds: selectedIds,
      },
    }));
  }

  function handleAutoFillCorrectOrder(item: SentenceOrderAuthoringItem) {
    commitItem(item.id, (current) => ({
      ...current,
      correctOrder: current.reorderUnits.map((unit) => unit.id),
    }));
  }

  function handleAutoRelabel(item: SentenceOrderAuthoringItem) {
    commitItem(item.id, (current) => ({
      ...current,
      reorderUnits: current.reorderUnits.map((unit, index) => ({
        ...unit,
        label: createLabel(index),
      })),
    }));
  }

  function handleMoveUnit(item: SentenceOrderAuthoringItem, unitIndex: number, direction: -1 | 1) {
    const nextIndex = unitIndex + direction;
    if (nextIndex < 0 || nextIndex >= item.reorderUnits.length) return;

    commitItem(item.id, (current) => ({
      ...current,
      reorderUnits: renumberLabels(reorderArray(current.reorderUnits, unitIndex, nextIndex)),
    }));
  }

  function handleMoveCorrectOrder(item: SentenceOrderAuthoringItem, unitId: string, direction: -1 | 1) {
    const currentIndex = item.correctOrder.findIndex((id) => id === unitId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= item.correctOrder.length) return;

    commitItem(item.id, (current) => ({
      ...current,
      correctOrder: reorderArray(current.correctOrder, currentIndex, nextIndex),
    }));
  }

  function handleRemoveUnit(item: SentenceOrderAuthoringItem, unitId: string) {
    commitItem(item.id, (current) => ({
      ...current,
      reorderUnits: renumberLabels(current.reorderUnits.filter((unit) => unit.id !== unitId)),
      correctOrder: current.correctOrder.filter((id) => id !== unitId),
    }));
  }

  return (
    <section className="space-y-4 rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-neutral-900">Sentence Order Items</div>
          <div className="mt-1 text-sm text-neutral-500">
            sentence_order stage용 authoring UI. 현재 schema의 <code>SentenceOrderAuthoringItem[]</code>
            에 맞춰 편집합니다.
          </div>
        </div>
        <button
          type="button"
          onClick={handleAddItem}
          className="rounded-2xl border px-4 py-2 text-sm font-medium text-neutral-700"
        >
          Item 추가
        </button>
      </div>

      {sentenceOrderItems.length === 0 ? (
        <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">
          아직 sentence order item이 없습니다.
        </div>
      ) : (
        <div className="space-y-5">
          {sentenceOrderItems.map((item, itemIndex) => {
            const uiState = getState(item.id);
            const correctUnits = getCorrectOrderUnits(item);
            const kindMeta = KIND_OPTIONS.find((option) => option.value === item.kind);

            return (
              <article key={item.id} className="space-y-4 rounded-3xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-neutral-900">
                      Item {itemIndex + 1}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">{kindMeta?.description}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange(sentenceOrderItems.filter((x) => x.id !== item.id))}
                    className="rounded-2xl border px-3 py-1.5 text-xs font-medium text-red-600"
                  >
                    삭제
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <div className="text-sm font-medium text-neutral-800">Title</div>
                    <input
                      value={item.title ?? ""}
                      onChange={(e) =>
                        commitItem(item.id, (current) => ({
                          ...current,
                          title: e.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border px-3 py-2 text-sm"
                      placeholder="예: 문장 배열 1"
                    />
                  </label>

                  <label className="space-y-2">
                    <div className="text-sm font-medium text-neutral-800">Kind</div>
                    <select
                      value={item.kind}
                      onChange={(e) =>
                        commitItem(item.id, (current) => ({
                          ...current,
                          kind: e.target.value as SentenceOrderKind,
                        }))
                      }
                      className="w-full rounded-2xl border px-3 py-2 text-sm"
                    >
                      {KIND_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block space-y-2">
                  <div className="text-sm font-medium text-neutral-800">Instructions</div>
                  <textarea
                    value={item.instructions ?? ""}
                    onChange={(e) =>
                      commitItem(item.id, (current) => ({
                        ...current,
                        instructions: e.target.value,
                      }))
                    }
                    className="min-h-[84px] w-full rounded-2xl border px-3 py-2 text-sm"
                    placeholder="예: 다음 글의 문장 순서를 올바르게 배열하시오."
                  />
                </label>

                <div className="rounded-2xl border bg-neutral-50 p-4">
                  <div className="mb-3 text-sm font-semibold text-neutral-900">빠른 생성</div>
                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="space-y-3 rounded-2xl bg-white p-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                        Passage sentence picker
                      </div>
                      <select
                        multiple
                        value={uiState.selectedSentenceIds}
                        onChange={(e) =>
                          patchState(item.id, {
                            selectedSentenceIds: Array.from(e.target.selectedOptions).map(
                              (option) => option.value,
                            ),
                          })
                        }
                        className="min-h-[180px] w-full rounded-2xl border px-3 py-2 text-sm"
                      >
                        {sentenceOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleAppendSelectedSentences(item)}
                          className="rounded-2xl border px-3 py-1.5 text-xs font-medium text-neutral-700"
                        >
                          선택 문장 1개씩 추가
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAppendSelectedBundle(item)}
                          className="rounded-2xl border px-3 py-1.5 text-xs font-medium text-neutral-700"
                        >
                          선택 문장 묶음 1개 추가
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-2xl bg-white p-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                        Quick actions
                      </div>
                      <div className="space-y-2 text-sm text-neutral-600">
                        <p>• 내신형: 발췌 문장들을 units로 만들고 정답 순서를 조정</p>
                        <p>• 모의고사형: fixed lead를 먼저 채우고 뒤쪽 파트 순서를 조정</p>
                        <p>• 전체 원문은 노출하지 않고, 필요한 문장/부분만 끌어와서 구성</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleAutoFillCorrectOrder(item)}
                          className="rounded-2xl border px-3 py-1.5 text-xs font-medium text-neutral-700"
                        >
                          정답 순서 자동 채우기
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAutoRelabel(item)}
                          className="rounded-2xl border px-3 py-1.5 text-xs font-medium text-neutral-700"
                        >
                          라벨 자동 재정렬
                        </button>
                      </div>

                      {item.kind === "mock_fixed_lead_reorder" ? (
                        <div className="space-y-3 rounded-2xl border p-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                            Fixed lead builder
                          </div>
                          <select
                            multiple
                            value={uiState.selectedLeadSentenceIds}
                            onChange={(e) =>
                              patchState(item.id, {
                                selectedLeadSentenceIds: Array.from(
                                  e.target.selectedOptions,
                                ).map((option) => option.value),
                              })
                            }
                            className="min-h-[120px] w-full rounded-2xl border px-3 py-2 text-sm"
                          >
                            {sentenceOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleFillLeadFromSelection(item)}
                            className="rounded-2xl border px-3 py-1.5 text-xs font-medium text-neutral-700"
                          >
                            선택 문장으로 fixed lead 채우기
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {item.kind === "mock_fixed_lead_reorder" ? (
                  <div className="space-y-3 rounded-2xl border p-4">
                    <div className="text-sm font-semibold text-neutral-900">Fixed Lead</div>
                    <div className="grid gap-3 md:grid-cols-[180px_1fr]">
                      <label className="space-y-2">
                        <div className="text-xs font-medium text-neutral-700">Label</div>
                        <input
                          value={item.fixedLead?.label ?? "Lead"}
                          onChange={(e) =>
                            commitItem(item.id, (current) => ({
                              ...current,
                              fixedLead: {
                                id: current.fixedLead?.id ?? createId("lead"),
                                type: current.fixedLead?.type ?? "part",
                                sourceSentenceIds: current.fixedLead?.sourceSentenceIds ?? [],
                                text: current.fixedLead?.text ?? "",
                                label: e.target.value,
                              },
                            }))
                          }
                          className="w-full rounded-2xl border px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="space-y-2">
                        <div className="text-xs font-medium text-neutral-700">Text</div>
                        <textarea
                          value={item.fixedLead?.text ?? ""}
                          onChange={(e) =>
                            commitItem(item.id, (current) => ({
                              ...current,
                              fixedLead: {
                                id: current.fixedLead?.id ?? createId("lead"),
                                type: current.fixedLead?.type ?? "part",
                                sourceSentenceIds: current.fixedLead?.sourceSentenceIds ?? [],
                                label: current.fixedLead?.label ?? "Lead",
                                text: e.target.value,
                              },
                            }))
                          }
                          className="min-h-[84px] w-full rounded-2xl border px-3 py-2 text-sm"
                          placeholder="고정으로 먼저 제시될 앞부분"
                        />
                      </label>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-3 rounded-2xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-neutral-900">Reorder Units</div>
                    <div className="text-xs text-neutral-500">
                      현재 {item.reorderUnits.length}개 unit / 정답 순서 {item.correctOrder.length}개
                    </div>
                  </div>

                  {item.reorderUnits.length === 0 ? (
                    <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">
                      아직 unit이 없습니다. 위의 빠른 생성에서 passage 문장을 골라 추가하세요.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {item.reorderUnits.map((unit, unitIndex) => (
                        <div key={unit.id} className="space-y-3 rounded-2xl bg-neutral-50 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700">
                                {unit.label || createLabel(unitIndex)}
                              </span>
                              <span className="text-xs uppercase tracking-[0.14em] text-neutral-500">
                                {unit.type}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleMoveUnit(item, unitIndex, -1)}
                                className="rounded-2xl border bg-white px-3 py-1 text-xs font-medium text-neutral-700"
                              >
                                위로
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveUnit(item, unitIndex, 1)}
                                className="rounded-2xl border bg-white px-3 py-1 text-xs font-medium text-neutral-700"
                              >
                                아래로
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveUnit(item, unit.id)}
                                className="rounded-2xl border bg-white px-3 py-1 text-xs font-medium text-red-600"
                              >
                                삭제
                              </button>
                            </div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-[150px_1fr]">
                            <label className="space-y-2">
                              <div className="text-xs font-medium text-neutral-700">Label</div>
                              <input
                                value={unit.label ?? ""}
                                onChange={(e) =>
                                  commitItem(item.id, (current) => ({
                                    ...current,
                                    reorderUnits: current.reorderUnits.map((target) =>
                                      target.id === unit.id
                                        ? { ...target, label: e.target.value }
                                        : target,
                                    ),
                                  }))
                                }
                                className="w-full rounded-2xl border bg-white px-3 py-2 text-sm"
                              />
                            </label>
                            <label className="space-y-2">
                              <div className="text-xs font-medium text-neutral-700">Text</div>
                              <textarea
                                value={unit.text}
                                onChange={(e) =>
                                  commitItem(item.id, (current) => ({
                                    ...current,
                                    reorderUnits: current.reorderUnits.map((target) =>
                                      target.id === unit.id
                                        ? { ...target, text: e.target.value }
                                        : target,
                                    ),
                                  }))
                                }
                                className="min-h-[78px] w-full rounded-2xl border bg-white px-3 py-2 text-sm"
                              />
                            </label>
                          </div>

                          <label className="block space-y-2">
                            <div className="text-xs font-medium text-neutral-700">
                              Source Sentence IDs
                            </div>
                            <select
                              multiple
                              value={unit.sourceSentenceIds ?? []}
                              onChange={(e) => {
                                const nextIds = Array.from(e.target.selectedOptions).map(
                                  (option) => option.value,
                                );
                                commitItem(item.id, (current) => ({
                                  ...current,
                                  reorderUnits: current.reorderUnits.map((target) =>
                                    target.id === unit.id
                                      ? {
                                          ...target,
                                          sourceSentenceIds: nextIds,
                                          text:
                                            nextIds.length > 0
                                              ? joinSentenceTexts(nextIds, sentenceMap)
                                              : target.text,
                                        }
                                      : target,
                                  ),
                                }));
                              }}
                              className="min-h-[120px] w-full rounded-2xl border bg-white px-3 py-2 text-sm"
                            >
                              {sentenceOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-2xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-neutral-900">정답 순서 편집</div>
                    <div className="text-xs text-neutral-500">정답으로 인정할 순서만 위아래로 정렬</div>
                  </div>

                  {correctUnits.length === 0 ? (
                    <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">
                      아직 정답 순서가 비어 있습니다. 자동 채우기 또는 개별 체크를 사용하세요.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {correctUnits.map((unit, orderIndex) => (
                        <div
                          key={`${item.id}-${unit.id}-answer`}
                          className="flex items-start justify-between gap-3 rounded-2xl bg-neutral-50 p-3"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                              Answer {orderIndex + 1} · {unit.label || "무라벨"}
                            </div>
                            <div className="mt-1 text-sm leading-6 text-neutral-800">{unit.text}</div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleMoveCorrectOrder(item, unit.id, -1)}
                              className="rounded-2xl border px-3 py-1 text-xs font-medium text-neutral-700"
                            >
                              위로
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveCorrectOrder(item, unit.id, 1)}
                              className="rounded-2xl border px-3 py-1 text-xs font-medium text-neutral-700"
                            >
                              아래로
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                commitItem(item.id, (current) => ({
                                  ...current,
                                  correctOrder: current.correctOrder.filter((id) => id !== unit.id),
                                }))
                              }
                              className="rounded-2xl border px-3 py-1 text-xs font-medium text-red-600"
                            >
                              제외
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {item.reorderUnits.length > 0 ? (
                    <div className="rounded-2xl border bg-white p-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                        정답 후보 추가
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.reorderUnits.map((unit) => {
                          const included = item.correctOrder.includes(unit.id);
                          return (
                            <button
                              key={`${item.id}-${unit.id}-toggle`}
                              type="button"
                              onClick={() =>
                                commitItem(item.id, (current) => ({
                                  ...current,
                                  correctOrder: included
                                    ? current.correctOrder.filter((id) => id !== unit.id)
                                    : [...current.correctOrder, unit.id],
                                }))
                              }
                              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                                included
                                  ? "bg-black text-white"
                                  : "border text-neutral-700"
                              }`}
                            >
                              {unit.label || unit.id}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2">
                    <div className="text-sm font-medium text-neutral-800">Explanation Summary</div>
                    <textarea
                      value={item.explanation?.summary ?? ""}
                      onChange={(e) =>
                        commitItem(item.id, (current) => ({
                          ...current,
                          explanation: {
                            ...current.explanation,
                            summary: e.target.value,
                          },
                        }))
                      }
                      className="min-h-[88px] w-full rounded-2xl border px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block space-y-2">
                    <div className="text-sm font-medium text-neutral-800">Korean Hint</div>
                    <textarea
                      value={item.explanation?.koreanHint ?? ""}
                      onChange={(e) =>
                        commitItem(item.id, (current) => ({
                          ...current,
                          explanation: {
                            ...current.explanation,
                            koreanHint: e.target.value,
                          },
                        }))
                      }
                      className="min-h-[88px] w-full rounded-2xl border px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                <div className="rounded-2xl bg-neutral-50 p-4">
                  <div className="mb-2 text-sm font-semibold text-neutral-900">Preview</div>
                  <div className="space-y-3 text-sm text-neutral-700">
                    <div>
                      <span className="font-medium text-neutral-900">출제 방식:</span>{" "}
                      {kindMeta?.label}
                    </div>
                    {item.fixedLead?.text ? (
                      <div>
                        <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                          Fixed Lead
                        </div>
                        <div className="rounded-2xl bg-white p-3 leading-6">{item.fixedLead.text}</div>
                      </div>
                    ) : null}
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                        Reorder Options
                      </div>
                      <div className="space-y-2">
                        {item.reorderUnits.map((unit) => (
                          <div key={`${item.id}-${unit.id}-preview`} className="rounded-2xl bg-white p-3">
                            <div className="text-xs font-semibold text-neutral-500">
                              {unit.label || unit.id}
                            </div>
                            <div className="mt-1 leading-6">{unit.text}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                        Answer Order
                      </div>
                      {correctUnits.length === 0 ? (
                        <div className="rounded-2xl bg-white p-3 text-neutral-500">정답 순서 없음</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {correctUnits.map((unit, index) => (
                            <div
                              key={`${item.id}-${unit.id}-answer-chip`}
                              className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-neutral-700"
                            >
                              {index + 1}. {unit.label || unit.id}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
