"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CompositionAnswer,
  SentenceCompositionLog,
  TranslationAnswer,
} from "@/components/naesin/drill/types";

type Props = {
  sentenceText: string;
  translationAnswer?: TranslationAnswer | null;
  compositionAnswer?: CompositionAnswer | null;
  currentSentenceIndex: number;
  totalSentences: number;
  log: SentenceCompositionLog;
  onPrevSentence: () => void;
  onNextSentence: () => void;
  onPatchLog: (patch: Partial<SentenceCompositionLog>) => void;
};

type KoChunkItem = {
  id: string;
  koText: string;
  enText: string;
  role: "subject" | "modifier" | "object" | "verb" | "adverb" | "place" | "other";
};

type EnSlotMode = "click" | "type";

type EnSlot = {
  id: string;
  chunkId: string;
  label: string;
  mode: EnSlotMode;
  answer: string;
  acceptedAnswers: string[];
};

const MAX_TYPING_ATTEMPTS = 2;

export default function Stage4Composition({
  sentenceText,
  translationAnswer = null,
  compositionAnswer = null,
  currentSentenceIndex,
  totalSentences,
  log,
  onPrevSentence,
  onNextSentence,
  onPatchLog,
}: Props) {
  const [dragChunkId, setDragChunkId] = useState<string | null>(null);
  const [slotAnswers, setSlotAnswers] = useState<Record<string, string>>({});
  const [slotChecked, setSlotChecked] = useState<Record<string, boolean>>({});
  const [slotCorrect, setSlotCorrect] = useState<Record<string, boolean>>({});
  const [slotFeedback, setSlotFeedback] = useState<Record<string, string>>({});

  const answer = useMemo(
    () =>
      compositionAnswer ??
      buildCompositionAnswerFromTranslation(sentenceText, translationAnswer),
    [compositionAnswer, sentenceText, translationAnswer],
  );

  const koChunks = useMemo(
    () => buildKoChunks(answer, translationAnswer),
    [answer, translationAnswer],
  );

  const koChunkMap = useMemo(
    () => new Map(koChunks.map((chunk) => [chunk.id, chunk])),
    [koChunks],
  );

  const slots = useMemo(() => buildEnSlots(koChunks), [koChunks]);

  useEffect(() => {
    if (!answer) return;

    const validIds = answer.chunks.map((chunk) => chunk.id);
    const needsInit =
      log.presentedChunkIds.length === 0 ||
      log.presentedChunkIds.length !== validIds.length ||
      validIds.some((id) => !log.presentedChunkIds.includes(id));

    if (!needsInit) return;

    onPatchLog({
      presentedChunkIds: shuffleWithSeed(validIds, currentSentenceIndex + 1),
      selectedChunkIds: [],
      arrangementAttempts: 0,
      arrangementPassed: false,
      typedEn: "",
      typingAttempts: 0,
      revealedReference: false,
      completed: false,
    });
  }, [answer, currentSentenceIndex, log.presentedChunkIds, onPatchLog]);

  useEffect(() => {
    setSlotAnswers({});
    setSlotChecked({});
    setSlotCorrect({});
    setSlotFeedback({});
  }, [currentSentenceIndex]);

  useEffect(() => {
    if (!log.arrangementPassed) {
      setSlotAnswers({});
      setSlotChecked({});
      setSlotCorrect({});
      setSlotFeedback({});
    }
  }, [log.arrangementPassed]);

  const selectedChunkIds = useMemo(() => {
    const validIds = new Set(koChunks.map((chunk) => chunk.id));
    return (log.selectedChunkIds ?? []).filter((id) => validIds.has(id));
  }, [koChunks, log.selectedChunkIds]);

  const presentedChunkIds = useMemo(() => {
    if (!answer) return [];
    const fallbackIds = answer.chunks.map((chunk) => chunk.id);
    if (log.presentedChunkIds.length === 0) return fallbackIds;
    return log.presentedChunkIds.filter((id) => koChunkMap.has(id));
  }, [answer, koChunkMap, log.presentedChunkIds]);

  const availableChunkIds = useMemo(() => {
    return presentedChunkIds.filter((id) => !selectedChunkIds.includes(id));
  }, [presentedChunkIds, selectedChunkIds]);

  const arrangementTargetIds = answer?.chunks.map((chunk) => chunk.id) ?? [];

  const allowedOrders = useMemo(() => {
    return buildAllowedChunkOrders(
      arrangementTargetIds,
      translationAnswer?.chunks ?? [],
    );
  }, [arrangementTargetIds, translationAnswer]);

  const arrangementReady =
    answer !== null && selectedChunkIds.length === arrangementTargetIds.length;

  const arrangementCorrect =
    arrangementReady &&
    allowedOrders.some((order) =>
      order.every((id, index) => selectedChunkIds[index] === id),
    );

  const canOpenEnglishStage = !!log.arrangementPassed;
  const isLastSentence = currentSentenceIndex === totalSentences - 1;
  const canFinishSentence = log.completed || log.revealedReference;

  const arrangementPreview = selectedChunkIds
    .map((id) => koChunkMap.get(id)?.koText ?? "")
    .filter(Boolean)
    .join(" / ");

  const clickSlots = useMemo(
    () => slots.filter((slot) => slot.mode === "click"),
    [slots],
  );

  function handleSelectChunk(chunkId: string) {
    if (!answer || log.arrangementPassed) return;
    if (selectedChunkIds.includes(chunkId)) return;

    onPatchLog({
      selectedChunkIds: [...selectedChunkIds, chunkId],
    });
  }

  function handleRemoveSelected(index: number) {
    if (!answer || log.arrangementPassed) return;

    onPatchLog({
      selectedChunkIds: selectedChunkIds.filter((_, i) => i !== index),
    });
  }

  function handleDropToSlot(slotIndex: number, chunkId: string) {
    if (!answer || log.arrangementPassed) return;

    const without = selectedChunkIds.filter((id) => id !== chunkId);
    without.splice(slotIndex, 0, chunkId);

    onPatchLog({
      selectedChunkIds: without.slice(0, arrangementTargetIds.length),
    });
  }

  function handleDropToBank(chunkId: string) {
    if (!answer || log.arrangementPassed) return;

    onPatchLog({
      selectedChunkIds: selectedChunkIds.filter((id) => id !== chunkId),
    });
  }

  function handleCheckArrangement() {
    if (!answer || !arrangementReady) return;

    onPatchLog({
      arrangementAttempts: log.arrangementAttempts + 1,
      arrangementPassed: arrangementCorrect,
      typedEn: arrangementCorrect ? log.typedEn : "",
      typingAttempts: arrangementCorrect ? log.typingAttempts : 0,
      revealedReference: arrangementCorrect ? log.revealedReference : false,
      completed: arrangementCorrect ? log.completed : false,
    });

    if (arrangementCorrect) {
      setSlotAnswers({});
      setSlotChecked({});
      setSlotCorrect({});
      setSlotFeedback({});
    }
  }

  function handleResetArrangement() {
    if (!answer || log.arrangementPassed) return;

    onPatchLog({
      selectedChunkIds: [],
      arrangementAttempts: 0,
    });

    setSlotAnswers({});
    setSlotChecked({});
    setSlotCorrect({});
    setSlotFeedback({});
  }

  function handleClickSlot(slotId: string, value: string) {
    if (!canOpenEnglishStage || log.completed) return;

    setSlotAnswers((prev) => ({
      ...prev,
      [slotId]: value,
    }));
  }

  function handleTypeSlot(slotId: string, value: string) {
    if (!canOpenEnglishStage || log.completed) return;

    setSlotAnswers((prev) => ({
      ...prev,
      [slotId]: value,
    }));
  }

  function handleCheckSlots() {
    if (!canOpenEnglishStage || slots.length === 0) return;

    const nextChecked: Record<string, boolean> = {};
    const nextCorrect: Record<string, boolean> = {};
    const nextFeedback: Record<string, string> = {};

    for (const slot of slots) {
      const rawValue = slotAnswers[slot.id] ?? "";
      const value = rawValue.trim();

      nextChecked[slot.id] = true;

      let isCorrect = false;

      if (slot.mode === "click") {
        isCorrect = normalizeEnglish(value) === normalizeEnglish(slot.answer);
      } else {
        isCorrect = slot.acceptedAnswers.some(
          (candidate) => normalizeEnglish(candidate) === normalizeEnglish(value),
        );
      }

      nextCorrect[slot.id] = isCorrect;

      if (!isCorrect) {
        nextFeedback[slot.id] = buildSlotFeedback(slot);
      }
    }

    setSlotChecked(nextChecked);
    setSlotCorrect(nextCorrect);
    setSlotFeedback(nextFeedback);

    const allCorrect =
      slots.length > 0 &&
      slots.every((slot) => nextCorrect[slot.id] === true);

    const nextAttempts = log.typingAttempts + 1;

    if (allCorrect) {
      onPatchLog({
        typingAttempts: nextAttempts,
        typedEn: buildFullSentenceFromSlots(slots, slotAnswers),
        completed: true,
        revealedReference: false,
      });
      return;
    }

    if (nextAttempts >= MAX_TYPING_ATTEMPTS) {
      onPatchLog({
        typingAttempts: nextAttempts,
        typedEn: buildFullSentenceFromSlots(slots, slotAnswers),
        revealedReference: true,
      });
      return;
    }

    onPatchLog({
      typingAttempts: nextAttempts,
    });
  }

  function moveNextSentence() {
    if (!canFinishSentence || isLastSentence) return;

    onPatchLog({
      completed: true,
    });

    onNextSentence();
  }

  function completeSentence() {
    if (!canFinishSentence) return;

    onPatchLog({
      completed: true,
    });
  }

  if (!answer) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <div className="text-lg font-semibold text-neutral-900">작문</div>
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          이 문장은 작문 데이터가 없어서 Stage 4를 진행할 수 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-neutral-400">
            Stage 4
          </div>
          <div className="text-lg font-semibold text-neutral-900">작문</div>
          <div className="mt-1 text-sm text-neutral-500">
            한글 생각청크를 영어 어순으로 먼저 맞춘 뒤, 쉬운 부분은 클릭하고 핵심 문법은 직접 입력합니다.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrevSentence}
            disabled={currentSentenceIndex <= 0}
            className="rounded-lg border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          >
            이전 문장
          </button>

          {!isLastSentence ? (
            <button
              type="button"
              onClick={moveNextSentence}
              disabled={!canFinishSentence}
              className="rounded-lg border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              다음 문장
            </button>
          ) : (
            <button
              type="button"
              onClick={completeSentence}
              disabled={!canFinishSentence}
              className="rounded-lg border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              완료
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border bg-emerald-50 p-4">
        <div className="text-xs font-semibold text-emerald-700">
          문장 {currentSentenceIndex + 1} / {totalSentences}
        </div>
        <div className="mt-2 text-sm font-medium text-neutral-900">
          {answer.promptKo}
        </div>
      </div>

      <div className="mt-4 rounded-xl border bg-neutral-50 p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-neutral-700">
            1단계 · 한글 생각청크 어순 맞추기
          </div>
          <div className="text-[11px] text-neutral-500">
            {selectedChunkIds.length}/{arrangementTargetIds.length}
          </div>
        </div>

        <div
          className="mt-3 rounded-xl border border-dashed bg-white p-3"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!dragChunkId) return;
            handleDropToBank(dragChunkId);
            setDragChunkId(null);
          }}
        >
          <div className="text-xs text-neutral-500">
            아래 한글 청크를 클릭하거나 드래그해서 영어 어순 기준으로 배열하세요.
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {availableChunkIds.map((chunkId) => {
              const chunk = koChunkMap.get(chunkId);
              if (!chunk) return null;

              return (
                <button
                  key={chunkId}
                  type="button"
                  draggable={!log.arrangementPassed}
                  onDragStart={() => setDragChunkId(chunkId)}
                  onDragEnd={() => setDragChunkId(null)}
                  onClick={() => handleSelectChunk(chunkId)}
                  disabled={log.arrangementPassed}
                  className="rounded-full border bg-white px-3 py-2 text-sm text-neutral-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {chunk.koText}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          {arrangementTargetIds.map((_, index) => {
            const selectedId = selectedChunkIds[index];
            const selectedChunk = selectedId ? koChunkMap.get(selectedId) : null;

            return (
              <div
                key={`slot-${index}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!dragChunkId) return;
                  handleDropToSlot(index, dragChunkId);
                  setDragChunkId(null);
                }}
                className={`flex min-h-[52px] items-center justify-between rounded-xl border px-3 py-2 ${
                  selectedChunk
                    ? "border-violet-200 bg-violet-50"
                    : "border-dashed border-neutral-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-neutral-400">
                    {index + 1}
                  </span>
                  <div
                    draggable={!!selectedChunk && !log.arrangementPassed}
                    onDragStart={() => selectedId && setDragChunkId(selectedId)}
                    onDragEnd={() => setDragChunkId(null)}
                    className="text-sm text-neutral-900"
                  >
                    {selectedChunk ? selectedChunk.koText : "여기에 한글 청크 놓기"}
                  </div>
                </div>

                {selectedChunk && !log.arrangementPassed ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveSelected(index)}
                    className="rounded-lg border px-2 py-1 text-[11px] text-neutral-600"
                  >
                    제거
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-lg border bg-white px-3 py-2">
          <div className="text-xs font-semibold text-neutral-600">
            현재 배열 미리보기
          </div>
          <div className="mt-1 text-sm text-neutral-900">
            {arrangementPreview || "아직 배열된 한글 청크가 없습니다."}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCheckArrangement}
            disabled={!arrangementReady || log.arrangementPassed}
            className="rounded-lg border px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            어순 확인
          </button>

          <button
            type="button"
            onClick={handleResetArrangement}
            disabled={selectedChunkIds.length === 0 || log.arrangementPassed}
            className="rounded-lg border px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            배열 초기화
          </button>
        </div>

        {log.arrangementPassed ? (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            어순이 맞았습니다. 이제 영어 슬롯을 완성하세요.
          </div>
        ) : log.arrangementAttempts > 0 ? (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            아직 어순이 맞지 않습니다. 주어, 서술부, 시간/장소 표현의 위치를 다시 보세요.
          </div>
        ) : null}
      </div>

      {canOpenEnglishStage ? (
        <div className="mt-4 rounded-xl border bg-neutral-50 p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-neutral-700">
              2단계 · 영어 슬롯 완성
            </div>
            <div className="text-[11px] text-neutral-500">
              제출 {log.typingAttempts}/{MAX_TYPING_ATTEMPTS}
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {slots.map((slot, index) => {
              const currentValue = slotAnswers[slot.id] ?? "";
              const checked = !!slotChecked[slot.id];
              const correct = !!slotCorrect[slot.id];

              return (
                <div
                  key={slot.id}
                  className={`rounded-xl border p-4 ${
                    checked
                      ? correct
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-rose-200 bg-rose-50"
                      : "bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-neutral-900">
                      Slot {index + 1}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      {slot.mode === "click" ? "클릭" : "직접 입력"}
                    </div>
                  </div>

                  <div className="mt-1 text-xs text-neutral-500">
                    {slot.label}
                  </div>

                  {slot.mode === "click" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {buildClickChoices(slot, clickSlots).map((choice) => {
                        const selected = currentValue === choice;

                        return (
                          <button
                            key={`${slot.id}-${choice}`}
                            type="button"
                            onClick={() => handleClickSlot(slot.id, choice)}
                            disabled={log.completed}
                            className={`rounded-full border px-3 py-2 text-sm ${
                              selected
                                ? "border-violet-300 bg-violet-50 text-violet-800"
                                : "bg-white text-neutral-800"
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            {choice}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      value={currentValue}
                      onChange={(e) => handleTypeSlot(slot.id, e.target.value)}
                      disabled={log.completed}
                      placeholder="핵심 문법 부분 직접 입력"
                      className="mt-3 w-full rounded-xl border bg-white px-3 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:bg-neutral-100"
                    />
                  )}

                  {checked && !correct ? (
                    <div className="mt-3 rounded-lg border border-white/70 bg-white px-3 py-2 text-sm text-rose-700">
                      {slotFeedback[slot.id] ?? "다시 확인하세요."}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCheckSlots}
              disabled={slots.length === 0 || log.completed}
              className="rounded-lg border px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              작문 확인
            </button>
          </div>

          {log.completed ? (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              정답입니다. 문장 작문을 완료했습니다.
            </div>
          ) : log.revealedReference ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              2회 시도 후 모범 문장을 공개합니다. 아래 문장을 확인하고 다음으로 진행하세요.
            </div>
          ) : log.typingAttempts > 0 ? (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              핵심 문법 type 슬롯부터 다시 확인하세요.
            </div>
          ) : null}
        </div>
      ) : null}

      {(log.completed || log.revealedReference) ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-900">
            모범 문장
          </div>
          <div className="mt-2 text-sm leading-6 text-neutral-900">
            {answer.referenceEn}
          </div>

          {answer.notes?.length ? (
            <ul className="mt-3 space-y-1 text-sm text-neutral-700">
              {answer.notes.map((note) => (
                <li key={note}>• {note}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function buildCompositionAnswerFromTranslation(
  sentenceText: string,
  translationAnswer: TranslationAnswer | null,
): CompositionAnswer | null {
  const promptKo = translationAnswer?.referenceKo?.trim() ?? "";
  const notes = translationAnswer?.notes ?? [];
  const chunksFromTranslation =
    translationAnswer?.chunks
      ?.filter((chunk) => !!chunk.sourceSpan?.trim())
      .map((chunk) => ({
        id: chunk.id,
        text: chunk.sourceSpan!.trim(),
      })) ?? [];

  const chunks =
    chunksFromTranslation.length > 0
      ? chunksFromTranslation
      : [
          {
            id: "composition-fallback-1",
            text: sentenceText.trim(),
          },
        ];

  if (!sentenceText.trim()) return null;

  return {
    promptKo: promptKo || "한글 해석이 아직 없습니다.",
    referenceEn: sentenceText.trim(),
    acceptedAnswers: [sentenceText.trim()],
    notes,
    chunks,
  };
}

function buildKoChunks(
  answer: CompositionAnswer | null,
  translationAnswer: TranslationAnswer | null,
): KoChunkItem[] {
  if (!answer) return [];

  // 레거시 폴백: 청크 자체에 textKo가 없는 옛 데이터는 translationAnswer 매칭으로 추정
  const koById = new Map(
    (translationAnswer?.chunks ?? []).map((chunk) => [
      chunk.id,
      chunk.acceptableAnswers[0]?.trim() || chunk.leadKo.trim(),
    ]),
  );

  return answer.chunks.map((chunk, index, arr) => {
    const koText = chunk.textKo?.trim() || koById.get(chunk.id) || chunk.text;
    return {
      id: chunk.id,
      koText,
      enText: chunk.text,
      role: guessChunkRole(chunk.text, index, arr.length),
    };
  });
}

function buildEnSlots(koChunks: KoChunkItem[]): EnSlot[] {
  return koChunks.map((chunk, index) => ({
    id: `slot-${chunk.id}`,
    chunkId: chunk.id,
    label: buildSlotLabel(chunk, index),
    mode: classifySlotMode(chunk.enText),
    answer: chunk.enText,
    acceptedAnswers: buildAcceptedAnswers(chunk.enText),
  }));
}

function classifySlotMode(enText: string): EnSlotMode {
  const value = enText.trim();

  if (
    /\b(who|which|that|whom|whose)\b/i.test(value) ||
    /\b(am|is|are|was|were|be|been|being)\s+\w+ing\b/i.test(value) ||
    /\b(am|is|are|was|were|be|been|being)\s+\w+(ed|en)\b/i.test(value) ||
    /\b(have|has|had)\s+\w+(ed|en)\b/i.test(value) ||
    looksVerbish(value)
  ) {
    return "type";
  }

  return "click";
}

function buildAcceptedAnswers(enText: string) {
  return [enText.trim()];
}

function buildSlotLabel(chunk: KoChunkItem, index: number) {
  if (classifySlotMode(chunk.enText) === "click") {
    return `${index + 1}번 청크 선택`;
  }

  if (/\b(who|which|that|whom|whose)\b/i.test(chunk.enText)) {
    return "관계절 핵심 직접 입력";
  }
  if (/\b(am|is|are|was|were|be|been|being)\s+\w+ing\b/i.test(chunk.enText)) {
    return "진행형 핵심 직접 입력";
  }
  if (/\b(am|is|are|was|were|be|been|being)\s+\w+(ed|en)\b/i.test(chunk.enText)) {
    return "수동태 핵심 직접 입력";
  }
  if (/\b(have|has|had)\s+\w+(ed|en)\b/i.test(chunk.enText)) {
    return "완료형 핵심 직접 입력";
  }
  if (chunk.role === "verb") {
    return "핵심 동사 직접 입력";
  }

  return "핵심 표현 직접 입력";
}

function buildAllowedChunkOrders(
  defaultOrderIds: string[],
  translationChunks: Array<{
    id: string;
    sourceSpan?: string;
  }>,
) {
  const orders: string[][] = [];

  if (defaultOrderIds.length === 0) return orders;

  orders.push(defaultOrderIds);

  const sourceMap = new Map(
    translationChunks.map((chunk) => [chunk.id, chunk.sourceSpan?.trim() ?? ""]),
  );

  const roles = defaultOrderIds.map((id) =>
    classifyChunkRoleFromSourceSpan(sourceMap.get(id) ?? ""),
  );

  const predicateIndex = roles.findIndex((role) => role === "predicate");
  const adverbialIndex = roles.findIndex(
    (role) => role === "time" || role === "place" || role === "adverbial",
  );

  if (
    predicateIndex >= 0 &&
    adverbialIndex >= 0 &&
    predicateIndex !== adverbialIndex
  ) {
    const swapped = [...defaultOrderIds];
    const temp = swapped[predicateIndex];
    swapped[predicateIndex] = swapped[adverbialIndex];
    swapped[adverbialIndex] = temp;
    orders.push(swapped);
  }

  return dedupeOrders(orders);
}

function classifyChunkRoleFromSourceSpan(sourceSpan: string) {
  const value = sourceSpan.trim().toLowerCase();

  if (!value) return "other";

  if (
    /^(am|is|are|was|were|be|been|being)\b/.test(value) ||
    /^(seem|seems|seemed|become|became|remain|remained|feel|felt|look|looked)\b/.test(
      value,
    )
  ) {
    return "predicate";
  }

  if (
    /^(during|before|after|while|when|as|since|until|throughout)\b/.test(value) ||
    /\b(next week|last week|today|tomorrow|yesterday)\b/.test(value)
  ) {
    return "time";
  }

  if (/^(to|into|in|at|on|from|toward|towards|near|inside|outside)\b/.test(value)) {
    return "place";
  }

  if (/ly\b/.test(value)) {
    return "adverbial";
  }

  return "other";
}

function dedupeOrders(orders: string[][]) {
  const seen = new Set<string>();

  return orders.filter((order) => {
    const key = order.join("||");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildClickChoices(slot: EnSlot, clickSlots: EnSlot[]) {
  const distractors = clickSlots
    .filter((item) => item.id !== slot.id)
    .map((item) => item.answer)
    .filter(Boolean)
    .slice(0, 2);

  return shuffleWithSeed(
    unique([slot.answer, ...distractors]).slice(0, 3),
    slot.answer.length + slot.id.length,
  );
}

function buildSlotFeedback(slot: EnSlot) {
  if (slot.mode === "click") {
    return "보기 선택을 다시 확인하세요.";
  }

  if (slot.label.includes("관계절")) {
    return "관계대명사절 형태를 다시 보세요. who / which / that, 동사 연결을 확인하세요.";
  }
  if (slot.label.includes("진행형")) {
    return "be동사 + -ing 형태를 다시 보세요.";
  }
  if (slot.label.includes("수동태")) {
    return "be동사 + p.p. 형태를 다시 보세요.";
  }
  if (slot.label.includes("완료형")) {
    return "have/has/had + p.p. 형태를 다시 보세요.";
  }
  if (slot.label.includes("핵심 동사")) {
    return "핵심 동사의 시제/형태를 다시 보세요.";
  }

  return "핵심 문법 표현을 다시 입력해 보세요.";
}

function buildFullSentenceFromSlots(
  slots: EnSlot[],
  answers: Record<string, string>,
) {
  return slots
    .map((slot) => answers[slot.id]?.trim() || "")
    .filter(Boolean)
    .join(" ");
}

function guessChunkRole(
  enText: string,
  index: number,
  total: number,
): "subject" | "modifier" | "object" | "verb" | "adverb" | "place" | "other" {
  const value = enText.trim().toLowerCase();

  if (index === 0) return "subject";
  if (/^to\s|^into\s|^in\s|^at\s|^on\s|^from\s|^toward\s|^towards\s/i.test(value)) {
    return "place";
  }
  if (/ly$/i.test(value) || /\bquickly\b|\bslowly\b|\bcarefully\b/i.test(value)) {
    return "adverb";
  }
  if (
    /\b(who|which|that|whom|whose)\b/i.test(value) ||
    /\b(am|is|are|was|were|be|been|being)\s+\w+ing\b/i.test(value)
  ) {
    return "modifier";
  }
  if (looksVerbish(value) || index === total - 1) {
    return "verb";
  }

  return "other";
}

function looksVerbish(value: string) {
  return (
    /\b(am|is|are|was|were|be|been|being|have|has|had|do|does|did)\b/i.test(value) ||
    /\b\w+ed\b/i.test(value) ||
    /\b\w+ing\b/i.test(value) ||
    COMMON_VERBS.has(value.toLowerCase())
  );
}

function normalizeEnglish(value: string) {
  return value
    .replace(/[.,!?;:"']/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function unique(items: string[]) {
  return Array.from(new Set(items));
}

function shuffleWithSeed<T>(items: T[], seed: number) {
  const result = [...items];
  let s = seed * 9973 + 17;

  for (let i = result.length - 1; i > 0; i -= 1) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

const COMMON_VERBS = new Set([
  "am",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "do",
  "does",
  "did",
  "done",
  "go",
  "goes",
  "went",
  "gone",
  "have",
  "has",
  "had",
  "make",
  "makes",
  "made",
  "see",
  "sees",
  "saw",
  "seen",
  "use",
  "uses",
  "used",
  "study",
  "studies",
  "studied",
  "work",
  "works",
  "worked",
  "play",
  "plays",
  "played",
  "want",
  "wants",
  "wanted",
  "run",
  "runs",
  "ran",
]);
