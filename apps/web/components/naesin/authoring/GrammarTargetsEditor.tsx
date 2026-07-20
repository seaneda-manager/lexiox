"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type {
  PassageQuestionStyle,
  PassageSentence,
} from "@/components/naesin/authoring/passage_authoring_schema_v1";
import {
  confirmPassageGrammarTargetAction,
  createManualPassageGrammarTargetAction,
  deletePassageGrammarTargetAction,
  listPassageGrammarTargetsAction,
  rejectPassageGrammarTargetAction,
  runAutoSuggestPassageGrammarTargetsAction,
  updatePassageGrammarTargetAction,
  type PassageGrammarTargetRecord,
} from "@/app/protected/admin/naesin/passages/grammar-actions";
import type { GrammarUnitLite } from "@/lib/naesin/grammar/ruleScanV1";

const QUESTION_STYLE_OPTIONS: Array<{
  value: PassageQuestionStyle;
  label: string;
}> = [
  { value: "grammar", label: "어법" },
  { value: "blank_inference", label: "빈칸추론" },
  { value: "reference_inference", label: "지칭추론" },
  { value: "incorrect_word", label: "어휘 오류" },
  { value: "summary", label: "요약" },
  { value: "detail", label: "세부정보" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "auto_detected", label: "자동추천" },
  { value: "confirmed", label: "확정" },
  { value: "edited", label: "수정됨" },
  { value: "manual_added", label: "수동추가" },
  { value: "rejected", label: "제외" },
] as const;

const DETECTION_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "auto", label: "자동" },
  { value: "manual", label: "수동" },
] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number]["value"];
type DetectionFilter = (typeof DETECTION_OPTIONS)[number]["value"];

type MatchedSignal = {
  code: string;
  label: string;
  weight: number;
  matchedText?: string | null;
};

type EditorChoice = {
  id: string;
  text: string;
};

type EditorFactor = {
  id: string;
  text: string;
  isCore: boolean;
};

type EditorReason = {
  id: string;
  text: string;
};

type EditorLabelAxis = {
  key: string;
  label: string;
  options: string[];
  correctOptionIds: string[];
};

type EditorOptionPayload = {
  questionStyle: PassageQuestionStyle;
  blankVersion: string;
  choices: EditorChoice[];
  correctChoiceId: string;
  factorOptions: EditorFactor[];
  correctFactorIds: string[];
  wrongReasonOptions: EditorReason[];
  correctWrongReasonIds: string[];
  koreanHint: string;
  matchedSignals: MatchedSignal[];
  score: number | null;
  source: string | null;
};

type EditorDraft = {
  rowId: string;
  passageId: string;
  sentenceId: string;
  grammarUnitId: string;
  status: "auto_detected" | "confirmed" | "edited" | "manual_added" | "rejected";
  detectionMode: "auto" | "manual";
  isPrimary: boolean;
  authoringMode: "auto_lite" | "manual_deep" | "";
  note: string;
  explanationOverride: string;
  optionPayload: EditorOptionPayload;
  labelAxes: EditorLabelAxis[];
};

type ManualDraft = {
  sentenceId: string;
  grammarUnitId: string;
  authoringMode: "auto_lite" | "manual_deep";
};

function createChoiceId(index: number) {
  return `c${index + 1}`;
}

function createFactorId(index: number) {
  return `f${index + 1}`;
}

function createWrongReasonId(index: number) {
  return `wr${index + 1}`;
}

function createAxisKey(index: number) {
  return `axis_${index + 1}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item : "")).filter(Boolean);
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeGrammarQuery(value: string): string {
  return value.trim().toLowerCase();
}

function buildGrammarUnitLabel(unit: GrammarUnitLite): string {
  return `${unit.id} · ${unit.authoringMode}`;
}

function ensureUnitInList(
  units: GrammarUnitLite[],
  unitId: string,
): GrammarUnitLite[] {
  if (!unitId.trim()) return units;
  if (units.some((unit) => unit.id === unitId)) return units;
  return [{ id: unitId, authoringMode: "manual_deep" }, ...units];
}

function filterGrammarUnits(
  units: GrammarUnitLite[],
  query: string,
  selectedUnitId = "",
): GrammarUnitLite[] {
  const base = ensureUnitInList(units, selectedUnitId);
  const normalized = normalizeGrammarQuery(query);

  if (!normalized) return base.slice(0, 50);

  return base
    .filter((unit) => {
      const haystack = `${unit.id} ${unit.authoringMode}`.toLowerCase();
      return haystack.includes(normalized);
    })
    .slice(0, 50);
}

function parseMatchedSignals(value: unknown): MatchedSignal[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      return {
        code: asString(item.code),
        label: asString(item.label),
        weight: typeof item.weight === "number" ? item.weight : 0,
        matchedText:
          typeof item.matchedText === "string" && item.matchedText.trim()
            ? item.matchedText
            : null,
      };
    })
    .filter((item): item is MatchedSignal => !!item && !!item.code && !!item.label);
}

function createEmptyOptionPayload(): EditorOptionPayload {
  return {
    questionStyle: "grammar",
    blankVersion: "",
    choices: [
      { id: createChoiceId(0), text: "" },
      { id: createChoiceId(1), text: "" },
    ],
    correctChoiceId: "",
    factorOptions: [
      { id: createFactorId(0), text: "", isCore: true },
      { id: createFactorId(1), text: "", isCore: false },
    ],
    correctFactorIds: [],
    wrongReasonOptions: [{ id: createWrongReasonId(0), text: "" }],
    correctWrongReasonIds: [],
    koreanHint: "",
    matchedSignals: [],
    score: null,
    source: null,
  };
}

function normalizeOptionPayload(value: unknown): EditorOptionPayload {
  const base = createEmptyOptionPayload();
  if (!isRecord(value)) return base;

  const choices = Array.isArray(value.choices)
    ? value.choices
        .map((item, index) => {
          if (!isRecord(item)) return null;
          return {
            id: asString(item.id) || createChoiceId(index),
            text: asString(item.text),
          };
        })
        .filter((item): item is EditorChoice => !!item)
    : base.choices;

  const factorOptions = Array.isArray(value.factorOptions)
    ? value.factorOptions
        .map((item, index) => {
          if (!isRecord(item)) return null;
          return {
            id: asString(item.id) || createFactorId(index),
            text: asString(item.text),
            isCore: asBoolean(item.isCore, false),
          };
        })
        .filter((item): item is EditorFactor => !!item)
    : base.factorOptions;

  const wrongReasonOptions = Array.isArray(value.wrongReasonOptions)
    ? value.wrongReasonOptions
        .map((item, index) => {
          if (!isRecord(item)) return null;
          return {
            id: asString(item.id) || createWrongReasonId(index),
            text: asString(item.text),
          };
        })
        .filter((item): item is EditorReason => !!item)
    : base.wrongReasonOptions;

  return {
    questionStyle: QUESTION_STYLE_OPTIONS.some(
      (option) => option.value === value.questionStyle,
    )
      ? (value.questionStyle as PassageQuestionStyle)
      : base.questionStyle,
    blankVersion: asString(value.blankVersion),
    choices: choices.length > 0 ? choices : base.choices,
    correctChoiceId: asString(value.correctChoiceId),
    factorOptions: factorOptions.length > 0 ? factorOptions : base.factorOptions,
    correctFactorIds: asStringArray(value.correctFactorIds),
    wrongReasonOptions:
      wrongReasonOptions.length > 0 ? wrongReasonOptions : base.wrongReasonOptions,
    correctWrongReasonIds: asStringArray(value.correctWrongReasonIds),
    koreanHint: asString(value.koreanHint),
    matchedSignals: parseMatchedSignals(value.matchedSignals),
    score: asNumberOrNull(value.score),
    source: asString(value.source) || null,
  };
}

function normalizeLabelAxes(value: unknown): EditorLabelAxis[] {
  if (!Array.isArray(value)) {
    return [
      {
        key: createAxisKey(0),
        label: "문법 레이블",
        options: [""],
        correctOptionIds: [],
      },
    ];
  }

  const rows = value
    .map((item, index) => {
      if (!isRecord(item)) return null;
      return {
        key: asString(item.key) || createAxisKey(index),
        label: asString(item.label || item.axisLabel) || "문법 레이블",
        options: Array.isArray(item.options)
          ? item.options.map((option) => (typeof option === "string" ? option : ""))
          : [""],
        correctOptionIds: asStringArray(item.correctOptionIds),
      };
    })
    .filter((item): item is EditorLabelAxis => !!item);

  return rows.length > 0
    ? rows
    : [
        {
          key: createAxisKey(0),
          label: "문법 레이블",
          options: [""],
          correctOptionIds: [],
        },
      ];
}

function buildDraftFromRow(row: PassageGrammarTargetRecord): EditorDraft {
  const optionPayload = normalizeOptionPayload(row.optionPayload);
  const wrongReasonNotes = row.wrongReasonNotes;

  if (wrongReasonNotes.length > 0 && optionPayload.wrongReasonOptions.length > 0) {
    optionPayload.correctWrongReasonIds = optionPayload.wrongReasonOptions
      .filter((reason) => wrongReasonNotes.includes(reason.text))
      .map((reason) => reason.id);
  }

  return {
    rowId: row.id,
    passageId: row.passageId,
    sentenceId: row.sentenceId ?? "",
    grammarUnitId: row.grammarUnitId,
    status: row.status,
    detectionMode: row.detectionMode,
    isPrimary: row.isPrimary,
    authoringMode: row.authoringMode ?? "",
    note: row.note ?? "",
    explanationOverride: row.explanationOverride ?? "",
    optionPayload,
    labelAxes: normalizeLabelAxes(row.labelAxesPayload),
  };
}

function serializeLabelAxes(axes: EditorLabelAxis[]): Array<Record<string, unknown>> {
  return axes.map((axis) => ({
    key: axis.key,
    axisLabel: axis.label,
    label: axis.label,
    options: axis.options,
    correctOptionIds: axis.correctOptionIds,
  }));
}

function serializeOptionPayload(payload: EditorOptionPayload): Record<string, unknown> {
  return {
    source: payload.source,
    score: payload.score,
    matchedSignals: payload.matchedSignals,
    questionStyle: payload.questionStyle,
    blankVersion: payload.blankVersion,
    choices: payload.choices,
    correctChoiceId: payload.correctChoiceId,
    factorOptions: payload.factorOptions,
    correctFactorIds: payload.correctFactorIds,
    wrongReasonOptions: payload.wrongReasonOptions,
    correctWrongReasonIds: payload.correctWrongReasonIds,
    koreanHint: payload.koreanHint,
  };
}

function deriveWrongReasonNotes(payload: EditorOptionPayload): string[] {
  return payload.wrongReasonOptions
    .filter((reason) => payload.correctWrongReasonIds.includes(reason.id) && reason.text.trim())
    .map((reason) => reason.text.trim());
}

function toggleStringSelection(current: string[], value: string) {
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}

function statusBadgeClass(status: PassageGrammarTargetRecord["status"]) {
  switch (status) {
    case "confirmed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "edited":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "manual_added":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-700";
  }
}

export default function GrammarTargetsEditor({
  passageId,
  sentences,
  lessonGrammarUnits,
}: {
  passageId: string;
  sentences: PassageSentence[];
  lessonGrammarUnits: GrammarUnitLite[];
}) {
  const [rows, setRows] = useState<PassageGrammarTargetRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<EditorDraft | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [detectionFilter, setDetectionFilter] = useState<DetectionFilter>("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [manualDraft, setManualDraft] = useState<ManualDraft>({
    sentenceId: sentences[0]?.id ?? "",
    grammarUnitId: "",
    authoringMode: "manual_deep",
  });
  const [manualGrammarQuery, setManualGrammarQuery] = useState("");
  const [draftGrammarQuery, setDraftGrammarQuery] = useState("");

  const sentenceMap = useMemo(
    () => new Map(sentences.map((sentence) => [sentence.id, sentence.text])),
    [sentences],
  );

  const filteredManualGrammarUnits = useMemo(() => {
    return filterGrammarUnits(
      lessonGrammarUnits,
      manualGrammarQuery,
      manualDraft.grammarUnitId,
    );
  }, [lessonGrammarUnits, manualGrammarQuery, manualDraft.grammarUnitId]);

  const filteredDraftGrammarUnits = useMemo(() => {
    return filterGrammarUnits(
      lessonGrammarUnits,
      draftGrammarQuery,
      draft?.grammarUnitId ?? "",
    );
  }, [lessonGrammarUnits, draftGrammarQuery, draft?.grammarUnitId]);

  useEffect(() => {
    if (!manualDraft.sentenceId && sentences[0]?.id) {
      setManualDraft((prev) => ({
        ...prev,
        sentenceId: sentences[0].id,
      }));
    }
  }, [manualDraft.sentenceId, sentences]);

  async function loadRows(nextSelectedId?: string) {
    setError("");
    const result = await listPassageGrammarTargetsAction({
      passageId,
      status: statusFilter,
      detectionMode: detectionFilter,
      includeRejected: true,
    });

    if (result.ok === false) {
      setError(result.error);
      return;
    }

    setRows(result.rows);

    const candidateId = nextSelectedId ?? selectedId;
    const nextRow = result.rows.find((row) => row.id === candidateId) ?? result.rows[0] ?? null;

    if (!nextRow) {
      setSelectedId("");
      setDraft(null);
      setDraftGrammarQuery("");
      return;
    }

    setSelectedId(nextRow.id);
    setDraft(buildDraftFromRow(nextRow));
    setDraftGrammarQuery(nextRow.grammarUnitId);
  }

  useEffect(() => {
    void loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passageId, statusFilter, detectionFilter]);

  function selectRow(row: PassageGrammarTargetRecord) {
    setSelectedId(row.id);
    setDraft(buildDraftFromRow(row));
    setDraftGrammarQuery(row.grammarUnitId);
    setMessage("");
    setError("");
  }

  function patchDraft(patch: Partial<EditorDraft>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function patchOptionPayload(patch: Partial<EditorOptionPayload>) {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            optionPayload: {
              ...prev.optionPayload,
              ...patch,
            },
          }
        : prev,
    );
  }

  function handleSelectManualGrammarUnit(unitId: string) {
    const matched = lessonGrammarUnits.find((unit) => unit.id === unitId);

    setManualDraft((prev) => ({
      ...prev,
      grammarUnitId: unitId,
      authoringMode: matched?.authoringMode ?? prev.authoringMode,
    }));

    if (matched) {
      setManualGrammarQuery(matched.id);
    }
  }

  function handleSelectDraftGrammarUnit(unitId: string) {
    const matched = lessonGrammarUnits.find((unit) => unit.id === unitId);

    setDraft((prev) =>
      prev
        ? {
            ...prev,
            grammarUnitId: unitId,
            authoringMode: matched?.authoringMode ?? prev.authoringMode,
          }
        : prev,
    );

    if (matched) {
      setDraftGrammarQuery(matched.id);
    }
  }

  function patchChoice(choiceId: string, text: string) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        optionPayload: {
          ...prev.optionPayload,
          choices: prev.optionPayload.choices.map((choice) =>
            choice.id === choiceId ? { ...choice, text } : choice,
          ),
        },
      };
    });
  }

  function addChoice() {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        optionPayload: {
          ...prev.optionPayload,
          choices: [
            ...prev.optionPayload.choices,
            { id: createChoiceId(prev.optionPayload.choices.length), text: "" },
          ],
        },
      };
    });
  }

  function removeChoice(choiceId: string) {
    setDraft((prev) => {
      if (!prev) return prev;
      const nextChoices = prev.optionPayload.choices.filter((choice) => choice.id !== choiceId);
      return {
        ...prev,
        optionPayload: {
          ...prev.optionPayload,
          choices: nextChoices,
          correctChoiceId:
            prev.optionPayload.correctChoiceId === choiceId
              ? ""
              : prev.optionPayload.correctChoiceId,
        },
      };
    });
  }

  function patchAxis(axisKey: string, patch: Partial<EditorLabelAxis>) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        labelAxes: prev.labelAxes.map((axis) =>
          axis.key === axisKey ? { ...axis, ...patch } : axis,
        ),
      };
    });
  }

  function addAxis() {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        labelAxes: [
          ...prev.labelAxes,
          {
            key: createAxisKey(prev.labelAxes.length),
            label: "새 축",
            options: [""],
            correctOptionIds: [],
          },
        ],
      };
    });
  }

  function removeAxis(axisKey: string) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        labelAxes: prev.labelAxes.filter((axis) => axis.key !== axisKey),
      };
    });
  }

  function patchAxisOption(axisKey: string, optionIndex: number, text: string) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        labelAxes: prev.labelAxes.map((axis) => {
          if (axis.key !== axisKey) return axis;
          const options = [...axis.options];
          options[optionIndex] = text;
          return { ...axis, options };
        }),
      };
    });
  }

  function addAxisOption(axisKey: string) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        labelAxes: prev.labelAxes.map((axis) =>
          axis.key === axisKey ? { ...axis, options: [...axis.options, ""] } : axis,
        ),
      };
    });
  }

  function removeAxisOption(axisKey: string, optionIndex: number) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        labelAxes: prev.labelAxes.map((axis) => {
          if (axis.key !== axisKey) return axis;
          const optionValue = axis.options[optionIndex] ?? "";
          return {
            ...axis,
            options: axis.options.filter((_, index) => index !== optionIndex),
            correctOptionIds: axis.correctOptionIds.filter((id) => id !== optionValue),
          };
        }),
      };
    });
  }

  function toggleAxisCorrectOption(axisKey: string, optionValue: string) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        labelAxes: prev.labelAxes.map((axis) =>
          axis.key === axisKey
            ? {
                ...axis,
                correctOptionIds: toggleStringSelection(axis.correctOptionIds, optionValue),
              }
            : axis,
        ),
      };
    });
  }

  function patchFactor(factorId: string, patch: Partial<EditorFactor>) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        optionPayload: {
          ...prev.optionPayload,
          factorOptions: prev.optionPayload.factorOptions.map((factor) =>
            factor.id === factorId ? { ...factor, ...patch } : factor,
          ),
        },
      };
    });
  }

  function addFactor() {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        optionPayload: {
          ...prev.optionPayload,
          factorOptions: [
            ...prev.optionPayload.factorOptions,
            {
              id: createFactorId(prev.optionPayload.factorOptions.length),
              text: "",
              isCore: false,
            },
          ],
        },
      };
    });
  }

  function removeFactor(factorId: string) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        optionPayload: {
          ...prev.optionPayload,
          factorOptions: prev.optionPayload.factorOptions.filter((factor) => factor.id !== factorId),
          correctFactorIds: prev.optionPayload.correctFactorIds.filter((id) => id !== factorId),
        },
      };
    });
  }

  function toggleCorrectFactor(factorId: string) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        optionPayload: {
          ...prev.optionPayload,
          correctFactorIds: toggleStringSelection(prev.optionPayload.correctFactorIds, factorId),
        },
      };
    });
  }

  function patchWrongReason(reasonId: string, text: string) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        optionPayload: {
          ...prev.optionPayload,
          wrongReasonOptions: prev.optionPayload.wrongReasonOptions.map((reason) =>
            reason.id === reasonId ? { ...reason, text } : reason,
          ),
        },
      };
    });
  }

  function addWrongReason() {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        optionPayload: {
          ...prev.optionPayload,
          wrongReasonOptions: [
            ...prev.optionPayload.wrongReasonOptions,
            {
              id: createWrongReasonId(prev.optionPayload.wrongReasonOptions.length),
              text: "",
            },
          ],
        },
      };
    });
  }

  function removeWrongReason(reasonId: string) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        optionPayload: {
          ...prev.optionPayload,
          wrongReasonOptions: prev.optionPayload.wrongReasonOptions.filter(
            (reason) => reason.id !== reasonId,
          ),
          correctWrongReasonIds: prev.optionPayload.correctWrongReasonIds.filter(
            (id) => id !== reasonId,
          ),
        },
      };
    });
  }

  function toggleCorrectWrongReason(reasonId: string) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        optionPayload: {
          ...prev.optionPayload,
          correctWrongReasonIds: toggleStringSelection(
            prev.optionPayload.correctWrongReasonIds,
            reasonId,
          ),
        },
      };
    });
  }

  function handleAutoSuggest() {
    setMessage("");
    setError("");
    startTransition(async () => {
      const result = await runAutoSuggestPassageGrammarTargetsAction({
        passageId,
        lessonGrammarUnits,
        replaceExistingAutoDetected: true,
      });

      if (result.ok === false) {
        setError(result.error);
        return;
      }

      setMessage(
        `자동 추천 완료 · 문장 ${result.sentenceCount}개 · 후보 ${result.candidateCount}개 · 저장 ${result.insertedCount}개`,
      );
      await loadRows(result.rows[0]?.id);
    });
  }

  function handleManualAdd() {
    setMessage("");
    setError("");

    if (!manualDraft.grammarUnitId.trim()) {
      setError("수동 추가할 grammar unit을 선택하세요.");
      return;
    }

    startTransition(async () => {
      const result = await createManualPassageGrammarTargetAction({
        passageId,
        sentenceId: manualDraft.sentenceId || null,
        grammarUnitId: manualDraft.grammarUnitId.trim(),
        authoringMode: manualDraft.authoringMode,
        optionPayload: serializeOptionPayload(createEmptyOptionPayload()),
        labelAxesPayload: serializeLabelAxes(normalizeLabelAxes([])),
        explanationOverride: null,
        wrongReasonNotes: [],
        note: null,
        status: "manual_added",
      });

      if (result.ok === false) {
        setError(result.error);
        return;
      }

      setMessage("수동 타깃을 추가했습니다.");
      setManualDraft((prev) => ({ ...prev, grammarUnitId: "" }));
      setManualGrammarQuery("");
      await loadRows(result.row.id);
    });
  }

  function handleSave() {
    if (!draft) return;

    setMessage("");
    setError("");

    startTransition(async () => {
      const result = await updatePassageGrammarTargetAction({
        targetId: draft.rowId,
        patch: {
          sentenceId: draft.sentenceId || null,
          grammarUnitId: draft.grammarUnitId.trim(),
          isPrimary: draft.isPrimary,
          authoringMode: draft.authoringMode || null,
          status: draft.status,
          optionPayload: serializeOptionPayload(draft.optionPayload),
          labelAxesPayload: serializeLabelAxes(draft.labelAxes),
          explanationOverride: draft.explanationOverride.trim() || null,
          wrongReasonNotes: deriveWrongReasonNotes(draft.optionPayload),
          note: draft.note.trim() || null,
        },
      });

      if (result.ok === false) {
        setError(result.error);
        return;
      }

      setMessage("문법 타깃을 저장했습니다.");
      await loadRows(result.row.id);
    });
  }

  function handleConfirm() {
    if (!draft) return;
    setMessage("");
    setError("");

    startTransition(async () => {
      const result = await confirmPassageGrammarTargetAction({
        targetId: draft.rowId,
        note: draft.note.trim() || null,
      });

      if (result.ok === false) {
        setError(result.error);
        return;
      }

      setMessage("문법 타깃을 확정했습니다.");
      await loadRows(result.row.id);
    });
  }

  function handleReject() {
    if (!draft) return;
    setMessage("");
    setError("");

    startTransition(async () => {
      const result = await rejectPassageGrammarTargetAction({
        targetId: draft.rowId,
        note: draft.note.trim() || null,
      });

      if (result.ok === false) {
        setError(result.error);
        return;
      }

      setMessage("문법 타깃을 제외 처리했습니다.");
      await loadRows(result.row.id);
    });
  }

  function handleDelete() {
    if (!draft) return;
    setMessage("");
    setError("");

    startTransition(async () => {
      const result = await deletePassageGrammarTargetAction({
        targetId: draft.rowId,
      });

      if (result.ok === false) {
        setError(result.error);
        return;
      }

      setMessage("문법 타깃을 삭제했습니다.");
      await loadRows();
    });
  }

  return (
    <section className="space-y-4 rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-neutral-900">
            Grammar Targets Editor
          </div>
          <div className="mt-1 text-sm text-neutral-500">
            passage_grammar_targets 기반으로 자동추천, 수동추가, 확정/제외, 세부
            편집을 수행합니다.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleAutoSuggest}
            disabled={isPending || lessonGrammarUnits.length === 0}
            className="rounded-2xl border px-4 py-2 text-sm font-medium text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "실행 중..." : "문법 자동 추천 실행"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_1.6fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border p-4">
            <div className="text-sm font-semibold text-neutral-900">필터</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="space-y-2">
                <div className="text-sm text-neutral-700">Status</div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="w-full rounded-2xl border px-3 py-2 text-sm"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <div className="text-sm text-neutral-700">Detection</div>
                <select
                  value={detectionFilter}
                  onChange={(e) => setDetectionFilter(e.target.value as DetectionFilter)}
                  className="w-full rounded-2xl border px-3 py-2 text-sm"
                >
                  {DETECTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-3xl border p-4">
            <div className="text-sm font-semibold text-neutral-900">수동 추가</div>
            <div className="mt-3 space-y-3">
              <label className="space-y-2">
                <div className="text-sm text-neutral-700">Sentence</div>
                <select
                  value={manualDraft.sentenceId}
                  onChange={(e) =>
                    setManualDraft((prev) => ({ ...prev, sentenceId: e.target.value }))
                  }
                  className="w-full rounded-2xl border px-3 py-2 text-sm"
                >
                  <option value="">문장 선택 안 함</option>
                  {sentences.map((sentence) => (
                    <option key={sentence.id} value={sentence.id}>
                      {sentence.id} · {sentence.text}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <div className="text-sm text-neutral-700">Grammar Unit 검색</div>
                <input
                  value={manualGrammarQuery}
                  onChange={(e) => setManualGrammarQuery(e.target.value)}
                  className="w-full rounded-2xl border px-3 py-2 text-sm"
                  placeholder="예: sva / pastperfect / modifier"
                />
              </label>

              <label className="space-y-2">
                <div className="text-sm text-neutral-700">Grammar Unit 선택</div>
                <select
                  value={manualDraft.grammarUnitId}
                  onChange={(e) => handleSelectManualGrammarUnit(e.target.value)}
                  className="w-full rounded-2xl border px-3 py-2 text-sm"
                  disabled={lessonGrammarUnits.length === 0}
                >
                  <option value="">문법 유닛 선택</option>
                  {filteredManualGrammarUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {buildGrammarUnitLabel(unit)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-2xl bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
                {manualDraft.grammarUnitId
                  ? `선택됨: ${manualDraft.grammarUnitId}`
                  : lessonGrammarUnits.length === 0
                    ? "아직 불러온 taxonomy unit이 없습니다."
                    : "검색 후 문법 유닛을 선택하세요."}
              </div>

              <label className="space-y-2">
                <div className="text-sm text-neutral-700">Authoring Mode</div>
                <select
                  value={manualDraft.authoringMode}
                  onChange={(e) =>
                    setManualDraft((prev) => ({
                      ...prev,
                      authoringMode: e.target.value as ManualDraft["authoringMode"],
                    }))
                  }
                  className="w-full rounded-2xl border px-3 py-2 text-sm"
                >
                  <option value="manual_deep">manual_deep</option>
                  <option value="auto_lite">auto_lite</option>
                </select>
              </label>

              <button
                type="button"
                onClick={handleManualAdd}
                disabled={isPending || !manualDraft.grammarUnitId}
                className="w-full rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                수동 타깃 추가
              </button>
            </div>
          </div>

          <div className="rounded-3xl border p-4">
            <div className="mb-3 text-sm font-semibold text-neutral-900">
              Target 목록 ({rows.length})
            </div>
            <div className="space-y-3">
              {rows.length === 0 ? (
                <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">
                  조건에 맞는 grammar target이 없습니다.
                </div>
              ) : (
                rows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => selectRow(row)}
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      row.id === selectedId
                        ? "border-neutral-900 bg-neutral-50"
                        : "border-neutral-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-neutral-900">
                        {row.grammarUnitId}
                      </div>
                      <span
                        className={`rounded-full border px-2 py-1 text-xs font-medium ${statusBadgeClass(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-neutral-500">
                      {row.sentenceId || "문장 미지정"} · {row.detectionMode} · {row.authoringMode || "-"}
                    </div>
                    <div className="mt-2 line-clamp-2 text-sm text-neutral-700">
                      {row.sentenceId ? sentenceMap.get(row.sentenceId) : "문장이 연결되지 않았습니다."}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
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

          {!draft ? (
            <div className="rounded-3xl border bg-neutral-50 p-6 text-sm text-neutral-500">
              왼쪽 목록에서 grammar target을 선택하세요.
            </div>
          ) : (
            <div className="space-y-4 rounded-3xl border p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-neutral-400">
                    Selected Target
                  </div>
                  <div className="mt-1 text-lg font-semibold text-neutral-900">
                    {draft.rowId}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isPending}
                    className="rounded-2xl border px-4 py-2 text-sm font-medium text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isPending}
                    className="rounded-2xl border px-4 py-2 text-sm font-medium text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    확정
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={isPending}
                    className="rounded-2xl border px-4 py-2 text-sm font-medium text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    제외
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isPending}
                    className="rounded-2xl border px-4 py-2 text-sm font-medium text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    삭제
                  </button>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <label className="space-y-2">
                  <div className="text-sm font-medium text-neutral-800">Sentence</div>
                  <select
                    value={draft.sentenceId}
                    onChange={(e) => patchDraft({ sentenceId: e.target.value })}
                    className="w-full rounded-2xl border px-3 py-2 text-sm"
                  >
                    <option value="">문장 선택 안 함</option>
                    {sentences.map((sentence) => (
                      <option key={sentence.id} value={sentence.id}>
                        {sentence.id} · {sentence.text}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-neutral-800">Grammar Unit 검색</div>
                  <input
                    value={draftGrammarQuery}
                    onChange={(e) => setDraftGrammarQuery(e.target.value)}
                    className="w-full rounded-2xl border px-3 py-2 text-sm"
                    placeholder="예: sva / pastperfect / modifier"
                  />
                  <select
                    value={draft.grammarUnitId}
                    onChange={(e) => handleSelectDraftGrammarUnit(e.target.value)}
                    className="w-full rounded-2xl border px-3 py-2 text-sm"
                    disabled={lessonGrammarUnits.length === 0}
                  >
                    <option value="">문법 유닛 선택</option>
                    {filteredDraftGrammarUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {buildGrammarUnitLabel(unit)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-2xl bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
                {draft.grammarUnitId
                  ? `선택됨: ${draft.grammarUnitId}`
                  : lessonGrammarUnits.length === 0
                    ? "아직 불러온 taxonomy unit이 없습니다."
                    : "검색 후 문법 유닛을 선택하세요."}
              </div>

              <div className="grid gap-4 xl:grid-cols-4">
                <label className="space-y-2">
                  <div className="text-sm font-medium text-neutral-800">Status</div>
                  <select
                    value={draft.status}
                    onChange={(e) =>
                      patchDraft({
                        status: e.target.value as EditorDraft["status"],
                      })
                    }
                    className="w-full rounded-2xl border px-3 py-2 text-sm"
                  >
                    {STATUS_OPTIONS.filter((option) => option.value !== "all").map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <div className="text-sm font-medium text-neutral-800">Detection</div>
                  <input
                    value={draft.detectionMode}
                    readOnly
                    className="w-full rounded-2xl border bg-neutral-50 px-3 py-2 text-sm text-neutral-500"
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-sm font-medium text-neutral-800">Authoring Mode</div>
                  <select
                    value={draft.authoringMode}
                    onChange={(e) =>
                      patchDraft({
                        authoringMode: e.target.value as EditorDraft["authoringMode"],
                      })
                    }
                    className="w-full rounded-2xl border px-3 py-2 text-sm"
                  >
                    <option value="">선택 안 함</option>
                    <option value="auto_lite">auto_lite</option>
                    <option value="manual_deep">manual_deep</option>
                  </select>
                </label>

                <label className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={draft.isPrimary}
                    onChange={(e) => patchDraft({ isPrimary: e.target.checked })}
                  />
                  Primary
                </label>
              </div>

              <div className="rounded-2xl bg-neutral-50 p-3 text-sm text-neutral-700">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  Source Sentence
                </div>
                <div className="mt-2 leading-7">
                  {draft.sentenceId
                    ? sentenceMap.get(draft.sentenceId) ?? "문장 텍스트를 찾지 못했습니다."
                    : "문장이 연결되지 않았습니다."}
                </div>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="text-sm font-semibold text-neutral-900">탐지 근거</div>
                {draft.optionPayload.matchedSignals.length === 0 ? (
                  <div className="mt-2 text-sm text-neutral-500">표시할 자동 탐지 근거가 없습니다.</div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {draft.optionPayload.matchedSignals.map((signal) => (
                      <span
                        key={`${signal.code}-${signal.label}`}
                        className="rounded-full border bg-neutral-50 px-3 py-1 text-xs text-neutral-700"
                      >
                        {signal.label}
                        {signal.matchedText ? ` · ${signal.matchedText}` : ""}
                        {typeof signal.weight === "number" ? ` · ${signal.weight}` : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <label className="space-y-2">
                  <div className="text-sm font-medium text-neutral-800">Question Style</div>
                  <select
                    value={draft.optionPayload.questionStyle}
                    onChange={(e) =>
                      patchOptionPayload({
                        questionStyle: e.target.value as PassageQuestionStyle,
                      })
                    }
                    className="w-full rounded-2xl border px-3 py-2 text-sm"
                  >
                    {QUESTION_STYLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <div className="text-sm font-medium text-neutral-800">Korean Hint</div>
                  <input
                    value={draft.optionPayload.koreanHint}
                    onChange={(e) => patchOptionPayload({ koreanHint: e.target.value })}
                    className="w-full rounded-2xl border px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <label className="space-y-2">
                <div className="text-sm font-medium text-neutral-800">Blank Version</div>
                <textarea
                  value={draft.optionPayload.blankVersion}
                  onChange={(e) => patchOptionPayload({ blankVersion: e.target.value })}
                  className="min-h-[110px] w-full rounded-2xl border px-3 py-2 text-sm leading-7"
                />
              </label>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-neutral-900">Choices</div>
                  <button
                    type="button"
                    onClick={addChoice}
                    className="rounded-2xl border px-3 py-2 text-sm font-medium text-neutral-700"
                  >
                    Choice 추가
                  </button>
                </div>
                <div className="space-y-3">
                  {draft.optionPayload.choices.map((choice) => (
                    <div
                      key={choice.id}
                      className="grid gap-3 rounded-2xl border p-3 md:grid-cols-[auto_1fr_auto_auto] md:items-center"
                    >
                      <div className="text-sm font-semibold text-neutral-500">{choice.id}</div>
                      <input
                        value={choice.text}
                        onChange={(e) => patchChoice(choice.id, e.target.value)}
                        className="w-full rounded-2xl border px-3 py-2 text-sm"
                      />
                      <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
                        <input
                          type="radio"
                          name={`correct-choice-${draft.rowId}`}
                          checked={draft.optionPayload.correctChoiceId === choice.id}
                          onChange={() => patchOptionPayload({ correctChoiceId: choice.id })}
                        />
                        정답
                      </label>
                      <button
                        type="button"
                        onClick={() => removeChoice(choice.id)}
                        className="rounded-2xl border px-3 py-2 text-sm text-red-600"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-neutral-900">Label Axes</div>
                  <button
                    type="button"
                    onClick={addAxis}
                    className="rounded-2xl border px-3 py-2 text-sm font-medium text-neutral-700"
                  >
                    Label 축 추가
                  </button>
                </div>
                <div className="space-y-4">
                  {draft.labelAxes.map((axis) => (
                    <div key={axis.key} className="rounded-2xl border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm font-medium text-neutral-900">{axis.key}</div>
                        <button
                          type="button"
                          onClick={() => removeAxis(axis.key)}
                          className="rounded-2xl border px-3 py-2 text-sm text-red-600"
                        >
                          축 삭제
                        </button>
                      </div>

                      <div className="mt-3 grid gap-4 xl:grid-cols-[220px_1fr]">
                        <label className="space-y-2">
                          <div className="text-sm text-neutral-700">축 라벨</div>
                          <input
                            value={axis.label}
                            onChange={(e) => patchAxis(axis.key, { label: e.target.value })}
                            className="w-full rounded-2xl border px-3 py-2 text-sm"
                          />
                        </label>

                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="text-sm text-neutral-700">옵션</div>
                            <button
                              type="button"
                              onClick={() => addAxisOption(axis.key)}
                              className="rounded-2xl border px-3 py-2 text-sm text-neutral-700"
                            >
                              옵션 추가
                            </button>
                          </div>
                          <div className="space-y-2">
                            {axis.options.map((option, optionIndex) => (
                              <div
                                key={`${axis.key}-${optionIndex}`}
                                className="grid gap-3 rounded-2xl bg-neutral-50 p-3 md:grid-cols-[1fr_auto_auto] md:items-center"
                              >
                                <input
                                  value={option}
                                  onChange={(e) =>
                                    patchAxisOption(axis.key, optionIndex, e.target.value)
                                  }
                                  className="w-full rounded-2xl border px-3 py-2 text-sm"
                                />
                                <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
                                  <input
                                    type="checkbox"
                                    checked={!!option && axis.correctOptionIds.includes(option)}
                                    onChange={() =>
                                      option ? toggleAxisCorrectOption(axis.key, option) : undefined
                                    }
                                  />
                                  정답
                                </label>
                                <button
                                  type="button"
                                  onClick={() => removeAxisOption(axis.key, optionIndex)}
                                  className="rounded-2xl border px-3 py-2 text-sm text-red-600"
                                >
                                  삭제
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-neutral-900">Factor Options</div>
                  <button
                    type="button"
                    onClick={addFactor}
                    className="rounded-2xl border px-3 py-2 text-sm font-medium text-neutral-700"
                  >
                    Factor 추가
                  </button>
                </div>
                <div className="space-y-3">
                  {draft.optionPayload.factorOptions.map((factor) => (
                    <div
                      key={factor.id}
                      className="grid gap-3 rounded-2xl border p-3 md:grid-cols-[auto_1fr_auto_auto_auto] md:items-center"
                    >
                      <div className="text-sm font-semibold text-neutral-500">{factor.id}</div>
                      <input
                        value={factor.text}
                        onChange={(e) => patchFactor(factor.id, { text: e.target.value })}
                        className="w-full rounded-2xl border px-3 py-2 text-sm"
                      />
                      <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
                        <input
                          type="checkbox"
                          checked={factor.isCore}
                          onChange={(e) => patchFactor(factor.id, { isCore: e.target.checked })}
                        />
                        Core
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
                        <input
                          type="checkbox"
                          checked={draft.optionPayload.correctFactorIds.includes(factor.id)}
                          onChange={() => toggleCorrectFactor(factor.id)}
                        />
                        정답
                      </label>
                      <button
                        type="button"
                        onClick={() => removeFactor(factor.id)}
                        className="rounded-2xl border px-3 py-2 text-sm text-red-600"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-neutral-900">Wrong Reasons</div>
                  <button
                    type="button"
                    onClick={addWrongReason}
                    className="rounded-2xl border px-3 py-2 text-sm font-medium text-neutral-700"
                  >
                    Wrong Reason 추가
                  </button>
                </div>
                <div className="space-y-3">
                  {draft.optionPayload.wrongReasonOptions.map((reason) => (
                    <div
                      key={reason.id}
                      className="grid gap-3 rounded-2xl border p-3 md:grid-cols-[auto_1fr_auto_auto] md:items-center"
                    >
                      <div className="text-sm font-semibold text-neutral-500">{reason.id}</div>
                      <input
                        value={reason.text}
                        onChange={(e) => patchWrongReason(reason.id, e.target.value)}
                        className="w-full rounded-2xl border px-3 py-2 text-sm"
                      />
                      <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
                        <input
                          type="checkbox"
                          checked={draft.optionPayload.correctWrongReasonIds.includes(reason.id)}
                          onChange={() => toggleCorrectWrongReason(reason.id)}
                        />
                        정답
                      </label>
                      <button
                        type="button"
                        onClick={() => removeWrongReason(reason.id)}
                        className="rounded-2xl border px-3 py-2 text-sm text-red-600"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <label className="space-y-2">
                  <div className="text-sm font-medium text-neutral-800">Explanation Summary</div>
                  <textarea
                    value={draft.explanationOverride}
                    onChange={(e) => patchDraft({ explanationOverride: e.target.value })}
                    className="min-h-[90px] w-full rounded-2xl border px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-sm font-medium text-neutral-800">Note</div>
                  <textarea
                    value={draft.note}
                    onChange={(e) => patchDraft({ note: e.target.value })}
                    className="min-h-[90px] w-full rounded-2xl border px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
