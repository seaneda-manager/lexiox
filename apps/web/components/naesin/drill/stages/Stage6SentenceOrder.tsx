"use client";

import { useEffect, useMemo, useState } from "react";

type SentenceOrderPublicUnit = {
  id: string;
  type?: string;
  label?: string;
  text: string;
};

type LegacySentenceOrderItem = {
  id: string;
  mode?: "sentence_order" | "unit_order";
  title?: string;
  instructions?: string;
  anchorBlock?: {
    id: string;
    text: string;
  } | null;
  shuffledBlocks?: Array<{
    id: string;
    label?: string;
    text: string;
  }>;
  correctOrder?: string[];
  clue?: string;
  explanation?: string;
};

type NextSentenceOrderItem = {
  id: string;
  kind?: "naesin_excerpt_restore" | "mock_fixed_lead_reorder";
  title?: string;
  instructions?: string;
  exposeFullOriginal?: boolean;
  fixedLead?: {
    id: string;
    type?: string;
    text: string;
  } | null;
  reorderUnits?: SentenceOrderPublicUnit[];
  correctOrder?: string[];
  explanation?: {
    summary?: string;
    koreanHint?: string;
  } | string;
};

type CompatibleSentenceOrderItem = LegacySentenceOrderItem | NextSentenceOrderItem | null;

type CompatibleSentenceOrderLog = {
  itemIndex?: number;
  orderedUnitIds?: string[];
  selectedBlockIds?: string[];
  isCorrect?: boolean;
  completed?: boolean;
  checkedAt?: string;
  submittedAt?: string;
} | null;

type Props = {
  item: CompatibleSentenceOrderItem;
  log: CompatibleSentenceOrderLog;
  currentItemIndex: number;
  totalItems: number;
  onPrevItem: () => void;
  onNextItem: () => void;
  onPatchLog: (patch: any) => void;
};

function getFixedLead(item: CompatibleSentenceOrderItem) {
  if (!item) return null;

  if ("fixedLead" in item && item.fixedLead) {
    return item.fixedLead;
  }

  if ("anchorBlock" in item && item.anchorBlock) {
    return {
      id: item.anchorBlock.id,
      type: "part",
      text: item.anchorBlock.text,
    };
  }

  return null;
}

function getReorderUnits(item: CompatibleSentenceOrderItem): SentenceOrderPublicUnit[] {
  if (!item) return [];

  if ("reorderUnits" in item && Array.isArray(item.reorderUnits)) {
    return item.reorderUnits;
  }

  if ("shuffledBlocks" in item && Array.isArray(item.shuffledBlocks)) {
    return item.shuffledBlocks.map((block, index) => ({
      id: block.id,
      type: item.mode === "sentence_order" ? "sentence" : "part",
      label: block.label ?? String.fromCharCode(65 + index),
      text: block.text,
    }));
  }

  return [];
}

function getHintText(item: CompatibleSentenceOrderItem) {
  if (!item) return "";

  if (typeof item.explanation === "object" && item.explanation) {
    return item.explanation.koreanHint ?? "";
  }

  if ("clue" in item && typeof item.clue === "string") {
    return item.clue;
  }

  return "";
}

function getExplanationText(item: CompatibleSentenceOrderItem) {
  if (!item) return "";

  if (typeof item.explanation === "object" && item.explanation) {
    return item.explanation.summary ?? "";
  }

  if (typeof item.explanation === "string") {
    return item.explanation;
  }

  return "";
}

function arraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

export default function Stage6SentenceOrder({
  item,
  log,
  currentItemIndex,
  totalItems,
  onPrevItem,
  onNextItem,
  onPatchLog,
}: Props) {
  const fixedLead = useMemo(() => getFixedLead(item), [item]);
  const reorderUnits = useMemo(() => getReorderUnits(item), [item]);
  const blockMap = useMemo(
    () => new Map(reorderUnits.map((unit) => [unit.id, unit])),
    [reorderUnits],
  );

  const persistedOrder = useMemo(() => {
    if (!log) return [] as string[];
    if (Array.isArray(log.orderedUnitIds)) return log.orderedUnitIds;
    if (Array.isArray(log.selectedBlockIds)) return log.selectedBlockIds;
    return [] as string[];
  }, [log]);

  const [orderedIds, setOrderedIds] = useState<string[]>(persistedOrder);
  const [checked, setChecked] = useState<boolean>(Boolean(log?.checkedAt || log?.submittedAt));
  const [isCorrect, setIsCorrect] = useState<boolean>(Boolean(log?.isCorrect));

  useEffect(() => {
    setOrderedIds(persistedOrder);
    setChecked(Boolean(log?.checkedAt || log?.submittedAt));
    setIsCorrect(Boolean(log?.isCorrect));
  }, [log?.checkedAt, log?.isCorrect, log?.submittedAt, persistedOrder, item?.id]);

  const correctOrder = item?.correctOrder ?? [];
  const selectedSet = useMemo(() => new Set(orderedIds), [orderedIds]);

  const availableUnits = useMemo(
    () => reorderUnits.filter((unit) => !selectedSet.has(unit.id)),
    [reorderUnits, selectedSet],
  );

  const selectedUnits = useMemo(
    () => orderedIds.map((id) => blockMap.get(id)).filter(Boolean) as SentenceOrderPublicUnit[],
    [blockMap, orderedIds],
  );

  const saveOrder = (nextOrderedIds: string[], nextIsCorrect?: boolean) => {
    onPatchLog({
      orderedUnitIds: nextOrderedIds,
      selectedBlockIds: nextOrderedIds,
      isCorrect: typeof nextIsCorrect === "boolean" ? nextIsCorrect : log?.isCorrect ?? false,
      completed:
        typeof nextIsCorrect === "boolean"
          ? nextIsCorrect
          : log?.completed ?? false,
      checkedAt:
        typeof nextIsCorrect === "boolean"
          ? new Date().toISOString()
          : log?.checkedAt,
      submittedAt:
        typeof nextIsCorrect === "boolean"
          ? new Date().toISOString()
          : log?.submittedAt,
    });
  };

  const handleAdd = (unitId: string) => {
    if (selectedSet.has(unitId)) return;
    const next = [...orderedIds, unitId];
    setOrderedIds(next);
    setChecked(false);
    setIsCorrect(false);
    saveOrder(next);
  };

  const handleRemove = (unitId: string) => {
    const next = orderedIds.filter((id) => id !== unitId);
    setOrderedIds(next);
    setChecked(false);
    setIsCorrect(false);
    saveOrder(next);
  };

  const handleReset = () => {
    setOrderedIds([]);
    setChecked(false);
    setIsCorrect(false);
    saveOrder([]);
  };

  const handleCheck = () => {
    const nextIsCorrect = arraysEqual(orderedIds, correctOrder);
    setChecked(true);
    setIsCorrect(nextIsCorrect);
    saveOrder(orderedIds, nextIsCorrect);
  };

  if (!item) {
    return (
      <section className="rounded-2xl border bg-white p-6">
        <div className="text-lg font-semibold text-neutral-900">문장 순서</div>
        <p className="mt-2 text-sm text-neutral-500">sentence_order 데이터가 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
            Stage 6 · Sentence Order
          </div>
          <h2 className="mt-1 text-xl font-semibold text-neutral-900">
            {item.title ?? "문장 순서 배열"}
          </h2>
          {item.instructions ? (
            <p className="mt-2 text-sm leading-6 text-neutral-600">{item.instructions}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <span>
            {Math.min(currentItemIndex + 1, Math.max(totalItems, 1))} / {Math.max(totalItems, 1)}
          </span>
          <button
            type="button"
            onClick={onPrevItem}
            disabled={currentItemIndex <= 0}
            className="rounded-lg border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            이전
          </button>
          <button
            type="button"
            onClick={onNextItem}
            disabled={currentItemIndex >= totalItems - 1}
            className="rounded-lg border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            다음
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {fixedLead ? (
          <div className="rounded-2xl border bg-neutral-50 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
              고정 파트
            </div>
            <p className="text-sm leading-7 text-neutral-800">{fixedLead.text}</p>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-neutral-900">배열 후보</div>
              <div className="text-xs text-neutral-500">클릭해서 순서에 추가</div>
            </div>

            <div className="space-y-3">
              {availableUnits.length > 0 ? (
                availableUnits.map((unit) => (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => handleAdd(unit.id)}
                    className="block w-full rounded-xl border p-3 text-left transition hover:bg-neutral-50"
                  >
                    <div className="mb-1 text-xs font-semibold text-neutral-400">
                      {unit.label ?? unit.id}
                    </div>
                    <div className="text-sm leading-7 text-neutral-800">{unit.text}</div>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed p-4 text-sm text-neutral-500">
                  모든 후보를 순서 영역에 올렸습니다.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-neutral-900">내가 만든 순서</div>
              <div className="text-xs text-neutral-500">클릭해서 제거</div>
            </div>

            <div className="space-y-3">
              {selectedUnits.length > 0 ? (
                selectedUnits.map((unit, index) => (
                  <button
                    key={`${unit.id}-${index}`}
                    type="button"
                    onClick={() => handleRemove(unit.id)}
                    className="block w-full rounded-xl border p-3 text-left transition hover:bg-neutral-50"
                  >
                    <div className="mb-1 flex items-center justify-between text-xs font-semibold text-neutral-400">
                      <span>{index + 1}번 위치</span>
                      <span>{unit.label ?? unit.id}</span>
                    </div>
                    <div className="text-sm leading-7 text-neutral-800">{unit.text}</div>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed p-4 text-sm text-neutral-500">
                  아직 선택한 문장/파트가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl border px-4 py-2 text-sm font-medium"
          >
            배열 초기화
          </button>
          <button
            type="button"
            onClick={handleCheck}
            disabled={orderedIds.length !== correctOrder.length}
            className="rounded-xl border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            정답 확인
          </button>
        </div>

        <div className="rounded-2xl border bg-neutral-50 p-4">
          <div className="text-sm font-semibold text-neutral-900">상태</div>
          {!checked ? (
            <p className="mt-2 text-sm text-neutral-600">
              {orderedIds.length < correctOrder.length
                ? `아직 ${correctOrder.length - orderedIds.length}개가 남았습니다.`
                : "정답 확인 버튼으로 배열을 검사하세요."}
            </p>
          ) : isCorrect ? (
            <p className="mt-2 text-sm font-medium text-emerald-700">
              정답입니다. 흐름이 자연스럽게 이어집니다.
            </p>
          ) : (
            <p className="mt-2 text-sm font-medium text-rose-700">
              아직 어순이 맞지 않습니다. 연결 단서를 다시 보세요.
            </p>
          )}

          {getHintText(item) ? (
            <p className="mt-3 text-sm text-neutral-600">
              <span className="font-semibold text-neutral-800">힌트:</span> {getHintText(item)}
            </p>
          ) : null}

          {checked && getExplanationText(item) ? (
            <p className="mt-3 text-sm leading-6 text-neutral-700">
              <span className="font-semibold text-neutral-800">해설:</span> {getExplanationText(item)}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
