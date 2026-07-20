"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  ModifierHeadLink,
  SentenceStructureLog,
} from "@/components/naesin/drill/types";

type StructureFieldKey = Exclude<
  keyof SentenceStructureLog,
  "sentenceIndex" | "modifierLinks"
>;

type LegacyModifierType =
  | "형용사구"
  | "형용사절"
  | "부사구"
  | "부사절"
  | "분사구문";

type ModifierSubtype =
  | "adjective_word"
  | "adverb_word"
  | "prepositional_phrase"
  | "infinitive_phrase"
  | "participial_phrase"
  | "participial_construction"
  | "relative_clause"
  | "adverb_clause"
  | "other";

type ModifierTargetType =
  | "head_noun"
  | "verb_phrase"
  | "adjective"
  | "adverb"
  | "main_clause"
  | "sentence";

type StructureFieldAnswer = {
  accepted: string[];
  label?: string;
};

type StructureModifierAnswer = {
  span: string;
  target: string;
  type?: LegacyModifierType;
  subtype?: ModifierSubtype;
  targetType?: ModifierTargetType;
};

type SentenceStructureAnswer = {
  subject?: StructureFieldAnswer;
  verb?: StructureFieldAnswer;
  object?: StructureFieldAnswer;
  complement?: StructureFieldAnswer;
  modifiers?: StructureModifierAnswer[];
};

type TokenItem =
  | { kind: "space"; text: string }
  | { kind: "punct"; text: string }
  | { kind: "word"; text: string; wordIndex: number };

type PosHint = "noun" | "verb" | "adjective" | "adverb" | "other";
type ValidationState = "idle" | "correct" | "wrong";
type FieldName = "subject" | "verb" | "object" | "complement" | "modifier";

type FieldFeedback = {
  state: ValidationState;
  message: string;
};

type MistakeItem = {
  id: string;
  sentenceIndex: number;
  part: FieldName;
  studentAnswer: string;
  message: string;
};

type PendingModifier = {
  spanText: string;
  subtype: ModifierSubtype;
  targetType: ModifierTargetType | null;
};

type Props = {
  sentenceText: string;
  answer?: SentenceStructureAnswer | null;
  currentSentenceIndex: number;
  totalSentences: number;
  log: SentenceStructureLog;
  mistakes?: MistakeItem[];
  onRecordMistake?: (input: Omit<MistakeItem, "sentenceIndex">) => void;
  onClearMistakes?: () => void;
  onPrevSentence: () => void;
  onNextSentence: () => void;
  onChangeField: (
    key: Exclude<keyof SentenceStructureLog, "sentenceIndex" | "modifierLinks">,
    value: string,
  ) => void;
  onAddModifierLink: () => void;
  onUpdateModifierLink: (
    linkId: string,
    patch: Partial<Pick<ModifierHeadLink, "modifier" | "head">>,
  ) => void;
  onRemoveModifierLink: (linkId: string) => void;
};

const MODIFIER_SUBTYPE_BUTTONS: ModifierSubtype[] = [
  "adjective_word",
  "adverb_word",
  "prepositional_phrase",
  "infinitive_phrase",
  "participial_phrase",
  "participial_construction",
  "relative_clause",
  "adverb_clause",
  "other",
];

const MODIFIER_SUBTYPE_LABEL: Record<ModifierSubtype, string> = {
  adjective_word: "형용사",
  adverb_word: "부사",
  prepositional_phrase: "전치사구",
  infinitive_phrase: "to부정사구",
  participial_phrase: "분사구",
  participial_construction: "분사구문",
  relative_clause: "형용사절",
  adverb_clause: "부사절",
  other: "기타",
};

const MODIFIER_TARGET_LABEL: Record<ModifierTargetType, string> = {
  head_noun: "명사(head noun)",
  verb_phrase: "서술부(verb phrase)",
  adjective: "형용사",
  adverb: "부사",
  main_clause: "주절(main clause)",
  sentence: "문장 전체(sentence)",
};

const MODIFIER_ALLOWED_TARGETS: Record<ModifierSubtype, ModifierTargetType[]> = {
  adjective_word: ["head_noun"],
  adverb_word: ["verb_phrase", "adjective", "adverb", "main_clause", "sentence"],
  prepositional_phrase: [
    "head_noun",
    "verb_phrase",
    "adjective",
    "adverb",
    "main_clause",
  ],
  infinitive_phrase: ["head_noun", "verb_phrase", "adjective"],
  participial_phrase: ["head_noun"],
  participial_construction: ["main_clause", "sentence", "verb_phrase"],
  relative_clause: ["head_noun"],
  adverb_clause: ["main_clause", "sentence", "verb_phrase"],
  other: [
    "head_noun",
    "verb_phrase",
    "adjective",
    "adverb",
    "main_clause",
    "sentence",
  ],
};

function createEmptyFeedbacks(): Record<FieldName, FieldFeedback> {
  return {
    subject: { state: "idle", message: "" },
    verb: { state: "idle", message: "" },
    object: { state: "idle", message: "" },
    complement: { state: "idle", message: "" },
    modifier: { state: "idle", message: "" },
  };
}

function normalizeModifierSubtype(
  item: StructureModifierAnswer,
): ModifierSubtype | null {
  if (item.subtype) return item.subtype;

  switch (item.type) {
    case "형용사구":
      return "prepositional_phrase";
    case "형용사절":
      return "relative_clause";
    case "부사구":
      return "prepositional_phrase";
    case "부사절":
      return "adverb_clause";
    case "분사구문":
      return "participial_construction";
    default:
      return null;
  }
}

function getSubtypeDisplayLabel(subtype: ModifierSubtype) {
  return MODIFIER_SUBTYPE_LABEL[subtype];
}

function targetNeedsClick(targetType: ModifierTargetType) {
  return !["main_clause", "sentence"].includes(targetType);
}

function inferTargetTypeFromLegacyText(
  targetText: string,
): ModifierTargetType | null {
  const norm = normalizeStructureText(targetText);

  if (
    norm.includes("주절") ||
    norm.includes("main clause") ||
    norm.includes("main_clause")
  ) {
    return "main_clause";
  }

  if (
    norm.includes("문장 전체") ||
    norm === "sentence" ||
    norm.includes("sentence")
  ) {
    return "sentence";
  }

  if (
    norm.includes("서술부") ||
    norm.includes("verb phrase") ||
    norm.includes("verb_phrase")
  ) {
    return "verb_phrase";
  }

  if (norm.includes("형용사") || norm === "adjective") {
    return "adjective";
  }

  if (norm.includes("부사") || norm === "adverb") {
    return "adverb";
  }

  if (
    norm.includes("head noun") ||
    norm.includes("명사") ||
    norm.includes("피수식")
  ) {
    return "head_noun";
  }

  return null;
}

function isTargetCompatible(
  item: StructureModifierAnswer,
  subtype: ModifierSubtype,
  targetType: ModifierTargetType,
  targetText: string,
) {
  const itemTargetNorm = normalizeStructureText(item.target);
  const targetNorm = normalizeStructureText(targetText);

  if (item.targetType) {
    if (item.targetType !== targetType) return false;
    if (targetNeedsClick(targetType)) {
      return itemTargetNorm === targetNorm;
    }
    return true;
  }

  const inferred = inferTargetTypeFromLegacyText(item.target);

  if (targetNeedsClick(targetType)) {
    if (itemTargetNorm === targetNorm) return true;

    if (
      subtype === "adverb_clause" &&
      (targetType === "main_clause" || targetType === "sentence") &&
      (inferred === "main_clause" || inferred === "sentence")
    ) {
      return true;
    }

    if (
      subtype === "participial_construction" &&
      targetType === "main_clause" &&
      (inferred === "main_clause" || inferred === "sentence")
    ) {
      return true;
    }

    return false;
  }

  if (inferred) {
    if (inferred === targetType) return true;

    if (
      subtype === "adverb_clause" &&
      (targetType === "main_clause" || targetType === "sentence") &&
      (inferred === "main_clause" || inferred === "sentence")
    ) {
      return true;
    }

    if (
      subtype === "participial_construction" &&
      targetType === "main_clause" &&
      (inferred === "main_clause" || inferred === "sentence")
    ) {
      return true;
    }
  }

  return (
    itemTargetNorm === normalizeStructureText(MODIFIER_TARGET_LABEL[targetType])
  );
}

function getModifierTargetDisplayLabel(
  item: StructureModifierAnswer,
  subtype: ModifierSubtype | null,
) {
  if (item.targetType) {
    return MODIFIER_TARGET_LABEL[item.targetType];
  }

  const inferred = inferTargetTypeFromLegacyText(item.target);
  if (subtype === "adverb_clause" && inferred === "sentence") {
    return MODIFIER_TARGET_LABEL.main_clause;
  }

  if (inferred) {
    return MODIFIER_TARGET_LABEL[inferred];
  }

  return item.target;
}

export default function Stage2StructureAnalysis({
  sentenceText,
  answer = null,
  currentSentenceIndex,
  totalSentences,
  log,
  mistakes = [],
  onRecordMistake,
  onClearMistakes,
  onPrevSentence,
  onNextSentence,
  onChangeField,
  onAddModifierLink,
  onUpdateModifierLink,
  onRemoveModifierLink,
}: Props) {
  const [showPosHints, setShowPosHints] = useState(true);
  const [selectionAnchor, setSelectionAnchor] = useState<number | null>(null);
  const [selectionFocus, setSelectionFocus] = useState<number | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [pendingModifier, setPendingModifier] = useState<PendingModifier | null>(
    null,
  );
  const [queuedLinkDraft, setQueuedLinkDraft] = useState<{
    modifier: string;
    head: string;
  } | null>(null);

  const [fieldFeedbacks, setFieldFeedbacks] =
    useState<Record<FieldName, FieldFeedback>>(createEmptyFeedbacks);

  const tokens = useMemo(() => tokenizeSentence(sentenceText), [sentenceText]);

  const wordTokens = useMemo(
    () =>
      tokens.filter(
        (token): token is Extract<TokenItem, { kind: "word" }> =>
          token.kind === "word",
      ),
    [tokens],
  );

  const selectedRange = useMemo(() => {
    if (selectionAnchor == null || selectionFocus == null) return null;
    return {
      start: Math.min(selectionAnchor, selectionFocus),
      end: Math.max(selectionAnchor, selectionFocus),
    };
  }, [selectionAnchor, selectionFocus]);

  const selectedWords = useMemo(() => {
    if (!selectedRange) return [];
    return wordTokens.slice(selectedRange.start, selectedRange.end + 1);
  }, [selectedRange, wordTokens]);

  const selectedText = selectedWords.map((token) => token.text).join(" ").trim();
  const currentMistakes = mistakes;

  useEffect(() => {
    function stopSelecting() {
      setIsSelecting(false);
    }

    window.addEventListener("pointerup", stopSelecting);
    return () => window.removeEventListener("pointerup", stopSelecting);
  }, []);

  useEffect(() => {
    setSelectionAnchor(null);
    setSelectionFocus(null);
    setIsSelecting(false);
    setPendingModifier(null);
    setQueuedLinkDraft(null);
    setFieldFeedbacks(createEmptyFeedbacks());
    onClearMistakes?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSentenceIndex]);

  useEffect(() => {
    if (!queuedLinkDraft) return;

    const emptyLink = log.modifierLinks.find(
      (link) => !link.modifier.trim() && !link.head.trim(),
    );

    if (!emptyLink) return;

    onUpdateModifierLink(emptyLink.id, queuedLinkDraft);
    setQueuedLinkDraft(null);
  }, [log.modifierLinks, onUpdateModifierLink, queuedLinkDraft]);

  function pushMistake(part: FieldName, studentAnswer: string, message: string) {
    onRecordMistake?.({
      id: `${part}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      part,
      studentAnswer,
      message,
    });
  }

  function clearSelection() {
    setSelectionAnchor(null);
    setSelectionFocus(null);
    setIsSelecting(false);
  }

  function setFeedback(part: FieldName, state: ValidationState, message: string) {
    setFieldFeedbacks((prev) => ({
      ...prev,
      [part]: { state, message },
    }));
  }

  function setFieldIfCorrect(
    part: "subject" | "verb" | "object" | "complement",
    fieldKey: Extract<
      StructureFieldKey,
      "subjectText" | "verbText" | "objectText" | "complementText"
    >,
  ) {
    if (!selectedText) return;

    const result = validateFieldAnswer(part, selectedText, answer);

    if (result.ok) {
      onChangeField(fieldKey, selectedText);
      setFeedback(part, "correct", result.message);
      clearSelection();
      return;
    }

    setFeedback(part, "wrong", result.message);
    pushMistake(part, selectedText, result.message);
  }

  function beginModifierClassification(subtype: ModifierSubtype) {
    if (!selectedText) return;

    setPendingModifier({
      spanText: selectedText,
      subtype,
      targetType: null,
    });

    setFeedback("modifier", "idle", "");
  }

  function appendModifierMemo(entry: string) {
    const prev = (log.modifierText ?? "").trim();
    const next = prev ? `${prev}\n${entry}` : entry;
    onChangeField("modifierText", next);
  }

  function commitModifierLink(modifier: string, head: string) {
    const emptyLink = log.modifierLinks.find(
      (link) => !link.modifier.trim() && !link.head.trim(),
    );

    if (emptyLink) {
      onUpdateModifierLink(emptyLink.id, { modifier, head });
      return;
    }

    setQueuedLinkDraft({ modifier, head });
    onAddModifierLink();
  }

  function finalizeModifier(
    targetType: ModifierTargetType,
    targetText: string,
  ) {
    if (!pendingModifier) return;

    const result = validateModifierAnswer(
      pendingModifier.spanText,
      pendingModifier.subtype,
      targetType,
      targetText,
      answer,
    );

    if (!result.ok) {
      setFeedback("modifier", "wrong", result.message);
      pushMistake(
        "modifier",
        `[${getSubtypeDisplayLabel(
          pendingModifier.subtype,
        )}] ${pendingModifier.spanText} -> ${MODIFIER_TARGET_LABEL[targetType]}${
          targetNeedsClick(targetType) ? `: ${targetText}` : ""
        }`,
        result.message,
      );

      if (result.reason === "type_mismatch") {
        setPendingModifier(null);
      }

      return;
    }

    const modifierValue = `[${getSubtypeDisplayLabel(
      pendingModifier.subtype,
    )}] ${pendingModifier.spanText}`;
    const targetValue = targetNeedsClick(targetType)
      ? `${MODIFIER_TARGET_LABEL[targetType]}: ${targetText}`
      : MODIFIER_TARGET_LABEL[targetType];

    appendModifierMemo(`${modifierValue} -> ${targetValue}`);
    commitModifierLink(modifierValue, targetValue);
    setFeedback("modifier", "correct", result.message);
    setPendingModifier(null);
    clearSelection();
  }

  function handleWordPointerDown(wordIndex: number, wordText: string) {
    if (pendingModifier) {
      if (!pendingModifier.targetType) return;

      if (targetNeedsClick(pendingModifier.targetType)) {
        finalizeModifier(pendingModifier.targetType, wordText);
      }
      return;
    }

    setSelectionAnchor(wordIndex);
    setSelectionFocus(wordIndex);
    setIsSelecting(true);
  }

  function handleWordPointerEnter(wordIndex: number) {
    if (!isSelecting || pendingModifier) return;
    setSelectionFocus(wordIndex);
  }

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-neutral-400">
            Stage 2
          </div>
          <div className="text-lg font-semibold text-neutral-900">구조 분석</div>
          <div className="mt-1 text-sm text-neutral-500">
            범위를 잡고 역할을 선택하면 바로 정오 판정합니다.
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
          <button
            type="button"
            onClick={onNextSentence}
            disabled={currentSentenceIndex >= totalSentences - 1}
            className="rounded-lg border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          >
            다음 문장
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border bg-emerald-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-emerald-700">
              문장 {currentSentenceIndex + 1} / {totalSentences}
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              먼저 단어를 클릭하거나 드래그해서 범위를 선택하세요.
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPosHints((prev) => !prev)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              showPosHints
                ? "bg-neutral-900 text-white"
                : "border bg-white text-neutral-700"
            }`}
          >
            {showPosHints ? "품사 힌트 ON" : "품사 힌트 OFF"}
          </button>
        </div>

        {showPosHints ? (
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <LegendChip label="명사" className="bg-blue-100 text-blue-700" />
            <LegendChip label="동사" className="bg-emerald-100 text-emerald-700" />
            <LegendChip label="형용사" className="bg-orange-100 text-orange-700" />
            <LegendChip label="부사" className="bg-yellow-100 text-yellow-800" />
          </div>
        ) : null}

        <div className="mt-4 rounded-xl border bg-white p-4">
          <div className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm leading-8 text-neutral-900">
            {tokens.map((token, index) => {
              if (token.kind === "space") {
                return <span key={`space-${index}`}>{token.text}</span>;
              }

              if (token.kind === "punct") {
                return (
                  <span key={`punct-${index}`} className="px-[1px]">
                    {token.text}
                  </span>
                );
              }

              const isSelected =
                selectedRange != null &&
                token.wordIndex >= selectedRange.start &&
                token.wordIndex <= selectedRange.end;

              const posHint = classifyToken(token.text);
              const hintClass = showPosHints ? getTokenHintClass(posHint) : "";
              const selectedClass = isSelected
                ? "ring-2 ring-violet-400 bg-violet-100 text-violet-900"
                : "";

              return (
                <button
                  key={`word-${index}-${token.text}`}
                  type="button"
                  onPointerDown={() =>
                    handleWordPointerDown(token.wordIndex, token.text)
                  }
                  onPointerEnter={() => handleWordPointerEnter(token.wordIndex)}
                  className={`rounded-md px-1.5 py-0.5 transition select-none ${hintClass} ${selectedClass}`}
                  title={
                    pendingModifier
                      ? "이 단어를 피수식어/수식 대상으로 선택"
                      : "클릭 또는 드래그로 범위 선택"
                  }
                >
                  {token.text}
                </button>
              );
            })}
          </div>
        </div>

        {selectedText ? (
          <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-violet-900">
                  선택 범위
                </div>
                <div className="mt-1 text-sm text-violet-800">{selectedText}</div>
              </div>

              <button
                type="button"
                onClick={clearSelection}
                className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs text-violet-700 hover:bg-violet-100"
              >
                선택 해제
              </button>
            </div>

            {!pendingModifier ? (
              <>
                <div className="mt-4">
                  <div className="text-xs font-semibold text-neutral-700">
                    기본 구조 버튼
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <ActionButton
                      onClick={() => setFieldIfCorrect("subject", "subjectText")}
                    >
                      Subject (S)
                    </ActionButton>
                    <ActionButton
                      onClick={() => setFieldIfCorrect("verb", "verbText")}
                    >
                      Verb (V)
                    </ActionButton>
                    <ActionButton
                      onClick={() => setFieldIfCorrect("object", "objectText")}
                    >
                      Object (O)
                    </ActionButton>
                    <ActionButton
                      onClick={() =>
                        setFieldIfCorrect("complement", "complementText")
                      }
                    >
                      Complement (C)
                    </ActionButton>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-xs font-semibold text-neutral-700">
                    Modifier 유형 선택
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {MODIFIER_SUBTYPE_BUTTONS.map((subtype) => (
                      <ActionButton
                        key={subtype}
                        onClick={() => beginModifierClassification(subtype)}
                      >
                        {MODIFIER_SUBTYPE_LABEL[subtype]}
                      </ActionButton>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-sm font-semibold text-amber-900">
                  [{MODIFIER_SUBTYPE_LABEL[pendingModifier.subtype]}] 선택 완료
                </div>

                {!pendingModifier.targetType ? (
                  <>
                    <div className="mt-1 text-sm text-amber-800">
                      이제 수식 대상을 어떤 종류로 볼지 먼저 고르세요.
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {MODIFIER_ALLOWED_TARGETS[pendingModifier.subtype].map(
                        (targetType) => (
                          <button
                            key={targetType}
                            type="button"
                            onClick={() =>
                              setPendingModifier((prev) =>
                                prev ? { ...prev, targetType } : prev,
                              )
                            }
                            className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                          >
                            {MODIFIER_TARGET_LABEL[targetType]}
                          </button>
                        ),
                      )}

                      <button
                        type="button"
                        onClick={() => setPendingModifier(null)}
                        className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                      >
                        유형 다시 선택
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mt-1 text-sm text-amber-800">
                      {targetNeedsClick(pendingModifier.targetType)
                        ? `${MODIFIER_TARGET_LABEL[pendingModifier.targetType]}에 해당하는 단어를 클릭하세요.`
                        : `${MODIFIER_TARGET_LABEL[pendingModifier.targetType]} 버튼을 눌러 확정하세요.`}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {!targetNeedsClick(pendingModifier.targetType) ? (
                        <button
                          type="button"
                          onClick={() =>
                            finalizeModifier(
                              pendingModifier.targetType!,
                              MODIFIER_TARGET_LABEL[pendingModifier.targetType!],
                            )
                          }
                          className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                        >
                          {MODIFIER_TARGET_LABEL[pendingModifier.targetType]}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() =>
                          setPendingModifier((prev) =>
                            prev ? { ...prev, targetType: null } : prev,
                          )
                        }
                        className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                      >
                        대상 종류 다시 선택
                      </button>

                      <button
                        type="button"
                        onClick={() => setPendingModifier(null)}
                        className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                      >
                        유형 다시 선택
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field
          label="Subject (S)"
          value={log.subjectText ?? ""}
          onChange={(value) => onChangeField("subjectText", value)}
          placeholder="주어"
          feedback={fieldFeedbacks.subject}
        />
        <Field
          label="Verb (V)"
          value={log.verbText ?? ""}
          onChange={(value) => onChangeField("verbText", value)}
          placeholder="동사"
          feedback={fieldFeedbacks.verb}
        />
        <Field
          label="Object (O)"
          value={log.objectText ?? ""}
          onChange={(value) => onChangeField("objectText", value)}
          placeholder="목적어"
          feedback={fieldFeedbacks.object}
        />
        <Field
          label="Complement (C)"
          value={log.complementText ?? ""}
          onChange={(value) => onChangeField("complementText", value)}
          placeholder="보어"
          feedback={fieldFeedbacks.complement}
        />
      </div>

      <div className="mt-3">
        <Field
          label="Modifier 메모"
          value={log.modifierText ?? ""}
          onChange={(value) => onChangeField("modifierText", value)}
          placeholder="[부사절] because ... -> 주절(main clause)"
          feedback={fieldFeedbacks.modifier}
          multiline
        />
      </div>

      <div className="mt-4 rounded-xl border bg-neutral-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-neutral-900">
              Modifier → Head 연결
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              맞은 modifier만 아래에 기록됩니다.
            </div>
          </div>

          <button
            type="button"
            onClick={onAddModifierLink}
            className="rounded-lg border px-3 py-2 text-xs hover:bg-white"
          >
            + 연결 추가
          </button>
        </div>

        <div className="mt-3 space-y-3">
          {log.modifierLinks.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-white p-3 text-sm text-neutral-500">
              아직 연결이 없습니다.
            </div>
          ) : (
            log.modifierLinks.map((link) => (
              <div
                key={link.id}
                className="grid gap-3 rounded-lg border bg-white p-3 md:grid-cols-[1fr_1fr_auto]"
              >
                <Field
                  label="Modifier"
                  value={link.modifier}
                  onChange={(value) =>
                    onUpdateModifierLink(link.id, { modifier: value })
                  }
                  placeholder="[부사절] because ..."
                />
                <Field
                  label="Head / Target"
                  value={link.head}
                  onChange={(value) =>
                    onUpdateModifierLink(link.id, { head: value })
                  }
                  placeholder="boy / gave / 주절(main clause)"
                />
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => onRemoveModifierLink(link.id)}
                    className="rounded-lg border px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-rose-900">오답 기록</div>
            <div className="mt-1 text-xs text-rose-700">
              현재 문장에서 틀린 선택들이 기록됩니다.
            </div>
          </div>
          <div className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs text-rose-700">
            {currentMistakes.length}개
          </div>
        </div>

        {currentMistakes.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed bg-white p-3 text-sm text-neutral-500">
            아직 오답이 없습니다.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {currentMistakes.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-rose-200 bg-white p-3"
              >
                <div className="text-xs font-semibold text-rose-700">
                  {item.part.toUpperCase()}
                </div>
                <div className="mt-1 text-sm font-medium text-neutral-900">
                  {item.studentAnswer}
                </div>
                <div className="mt-1 text-xs text-rose-700">{item.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function validateFieldAnswer(
  part: "subject" | "verb" | "object" | "complement",
  studentValue: string,
  answer: SentenceStructureAnswer | null,
): { ok: boolean; message: string } {
  const fieldAnswer =
    part === "subject"
      ? answer?.subject
      : part === "verb"
        ? answer?.verb
        : part === "object"
          ? answer?.object
          : answer?.complement;

  if (!fieldAnswer) {
    return {
      ok: false,
      message: "이 문장에는 아직 정답키가 없습니다.",
    };
  }

  const accepted = fieldAnswer.accepted ?? [];
  const studentNorm = normalizeStructureText(studentValue);

  if (accepted.length === 0) {
    return {
      ok: false,
      message: `${partLabel(part)} 자리가 없는 문장입니다.`,
    };
  }

  if (accepted.some((item) => normalizeStructureText(item) === studentNorm)) {
    return {
      ok: true,
      message: "정답",
    };
  }

  if (
    accepted.some((item) => {
      const norm = normalizeStructureText(item);
      return norm.includes(studentNorm) || studentNorm.includes(norm);
    })
  ) {
    return {
      ok: false,
      message: `${partLabel(part)} 범위가 정확하지 않습니다.`,
    };
  }

  const roleHint = detectOtherRole(studentValue, answer);
  if (roleHint) {
    return {
      ok: false,
      message: `${partLabel(part)}가 아니라 ${roleHint}입니다.`,
    };
  }

  return {
    ok: false,
    message: `${partLabel(part)} 자리에 맞는 성분이 아닙니다.`,
  };
}

function validateModifierAnswer(
  span: string,
  subtype: ModifierSubtype,
  targetType: ModifierTargetType,
  target: string,
  answer: SentenceStructureAnswer | null,
): { ok: boolean; message: string; reason?: string } {
  const modifiers = answer?.modifiers ?? [];
  if (modifiers.length === 0) {
    return {
      ok: false,
      message: "이 문장에는 아직 modifier 정답키가 없습니다.",
      reason: "unconfigured",
    };
  }

  const spanNorm = normalizeStructureText(span);

  const exact = modifiers.find((item) => {
    const itemSubtype = normalizeModifierSubtype(item);
    if (!itemSubtype) return false;
    if (normalizeStructureText(item.span) !== spanNorm) return false;
    if (itemSubtype !== subtype) return false;

    return isTargetCompatible(item, subtype, targetType, target);
  });

  if (exact) {
    return {
      ok: true,
      message: "정답",
    };
  }

  const sameSpan = modifiers.find(
    (item) => normalizeStructureText(item.span) === spanNorm,
  );

  if (sameSpan) {
    const sameSpanSubtype = normalizeModifierSubtype(sameSpan);

    if (sameSpanSubtype && sameSpanSubtype !== subtype) {
      return {
        ok: false,
        message: `이 범위는 ${getSubtypeDisplayLabel(
          subtype,
        )}이 아니라 ${getSubtypeDisplayLabel(sameSpanSubtype)}입니다.`,
        reason: "type_mismatch",
      };
    }

    if (sameSpanSubtype === subtype) {
      return {
        ok: false,
        message: `${getSubtypeDisplayLabel(
          subtype,
        )}의 수식 대상은 ${getModifierTargetDisplayLabel(
          sameSpan,
          sameSpanSubtype,
        )}입니다.`,
        reason: "target_mismatch",
      };
    }
  }

  const partialSpan = modifiers.find((item) => {
    const itemNorm = normalizeStructureText(item.span);
    return itemNorm.includes(spanNorm) || spanNorm.includes(itemNorm);
  });

  if (partialSpan) {
    return {
      ok: false,
      message: `범위를 다시 잡아야 합니다. 정답 구문은 "${partialSpan.span}" 쪽입니다.`,
      reason: "span_mismatch",
    };
  }

  return {
    ok: false,
    message: "선택한 범위가 정답 구문과 일치하지 않습니다.",
    reason: "span_mismatch",
  };
}

function detectOtherRole(
  studentValue: string,
  answer: SentenceStructureAnswer | null,
): string | null {
  const studentNorm = normalizeStructureText(studentValue);

  if (
    answer?.subject?.accepted?.some(
      (item) => normalizeStructureText(item) === studentNorm,
    )
  ) {
    return "주어";
  }

  if (
    answer?.verb?.accepted?.some(
      (item) => normalizeStructureText(item) === studentNorm,
    )
  ) {
    return "동사";
  }

  if (
    answer?.object?.accepted?.some(
      (item) => normalizeStructureText(item) === studentNorm,
    )
  ) {
    return "목적어";
  }

  if (
    answer?.complement?.accepted?.some(
      (item) => normalizeStructureText(item) === studentNorm,
    )
  ) {
    return "보어";
  }

  const mod = answer?.modifiers?.find(
    (item) => normalizeStructureText(item.span) === studentNorm,
  );

  if (mod) {
    const subtype = normalizeModifierSubtype(mod);
    if (subtype) return getSubtypeDisplayLabel(subtype);
    return mod.type ?? "수식어";
  }

  return null;
}

function partLabel(part: "subject" | "verb" | "object" | "complement") {
  switch (part) {
    case "subject":
      return "주어";
    case "verb":
      return "동사";
    case "object":
      return "목적어";
    case "complement":
      return "보어";
    default:
      return "";
  }
}

function normalizeStructureText(value: string) {
  return value
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\w\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ActionButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100"
    >
      {children}
    </button>
  );
}

function LegendChip({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span className={`rounded-full px-2 py-0.5 font-medium ${className}`}>
      {label}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  feedback,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  feedback?: FieldFeedback;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-neutral-700">{label}</label>
        {feedback?.state === "correct" ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700">
            {feedback.message || "정답"}
          </span>
        ) : feedback?.state === "wrong" ? (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] text-red-700">
            {feedback.message || "오답"}
          </span>
        ) : null}
      </div>

      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
        />
      )}
    </div>
  );
}

function tokenizeSentence(sentence: string): TokenItem[] {
  const raw =
    sentence.match(/[A-Za-z]+(?:['-][A-Za-z]+)*|\d+|\s+|[^\sA-Za-z\d]/g) ?? [];

  let wordIndex = 0;
  const result: TokenItem[] = [];

  for (const text of raw) {
    if (/^\s+$/.test(text)) {
      result.push({ kind: "space", text });
      continue;
    }

    if (/^[A-Za-z]+(?:['-][A-Za-z]+)*$/.test(text)) {
      result.push({
        kind: "word",
        text,
        wordIndex,
      });
      wordIndex += 1;
      continue;
    }

    result.push({ kind: "punct", text });
  }

  return result;
}

function classifyToken(token: string): PosHint {
  const word = token.toLowerCase();

  const pronouns = new Set([
    "i",
    "you",
    "he",
    "she",
    "it",
    "we",
    "they",
    "me",
    "him",
    "her",
    "us",
    "them",
    "my",
    "your",
    "his",
    "its",
    "our",
    "their",
    "this",
    "that",
    "these",
    "those",
    "someone",
    "everyone",
    "anything",
    "something",
    "nothing",
  ]);

  const verbWords = new Set([
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
    "have",
    "has",
    "had",
    "can",
    "could",
    "may",
    "might",
    "must",
    "shall",
    "should",
    "will",
    "would",
  ]);

  const adverbs = new Set([
    "not",
    "very",
    "quite",
    "rather",
    "too",
    "so",
    "almost",
    "often",
    "always",
    "never",
    "here",
    "there",
    "then",
    "now",
    "thus",
    "however",
    "therefore",
  ]);

  if (pronouns.has(word)) return "noun";
  if (verbWords.has(word)) return "verb";
  if (adverbs.has(word) || word.endsWith("ly")) return "adverb";

  if (
    word.endsWith("ous") ||
    word.endsWith("ful") ||
    word.endsWith("able") ||
    word.endsWith("ible") ||
    word.endsWith("al") ||
    word.endsWith("ive") ||
    word.endsWith("less") ||
    word.endsWith("ic") ||
    word.endsWith("ary") ||
    word.endsWith("ory") ||
    word.endsWith("ish")
  ) {
    return "adjective";
  }

  if (
    word.endsWith("ed") ||
    word.endsWith("ing") ||
    word.endsWith("en") ||
    word.endsWith("ize") ||
    word.endsWith("ise") ||
    word.endsWith("ify")
  ) {
    return "verb";
  }

  if (
    word.endsWith("tion") ||
    word.endsWith("sion") ||
    word.endsWith("ment") ||
    word.endsWith("ness") ||
    word.endsWith("ity") ||
    word.endsWith("ship") ||
    word.endsWith("age") ||
    word.endsWith("ance") ||
    word.endsWith("ence") ||
    word.endsWith("er") ||
    word.endsWith("or")
  ) {
    return "noun";
  }

  return "other";
}

function getTokenHintClass(pos: PosHint) {
  switch (pos) {
    case "noun":
      return "bg-blue-100 text-blue-700";
    case "verb":
      return "bg-emerald-100 text-emerald-700";
    case "adjective":
      return "bg-orange-100 text-orange-700";
    case "adverb":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-neutral-50 text-neutral-800";
  }
}
