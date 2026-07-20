"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  scanPassageSentencesForGrammar,
  type GrammarUnitLite,
} from "@/lib/naesin/grammar/ruleScanV1";
import {
  buildAndDedupePassageGrammarTargetInsertRows,
  type PassageGrammarTargetAuthoringMode,
  type PassageGrammarTargetDetectionMode,
  type PassageGrammarTargetStatus,
} from "@/lib/naesin/grammar/passageGrammarTargetAdapter";

type LooseRecord = Record<string, unknown>;

type ActionError = {
  ok: false;
  error: string;
};

export type PassageGrammarTargetRecord = {
  id: string;
  passageId: string;
  sentenceId: string | null;
  grammarUnitId: string;
  detectionMode: PassageGrammarTargetDetectionMode;
  status: PassageGrammarTargetStatus;
  isPrimary: boolean;
  authoringMode: PassageGrammarTargetAuthoringMode | null;
  optionPayload: Record<string, unknown>;
  labelAxesPayload: Array<Record<string, unknown>>;
  explanationOverride: string | null;
  wrongReasonNotes: string[];
  note: string | null;
};

export type AutoSuggestActionResult =
  | {
      ok: true;
      passageId: string;
      sentenceCount: number;
      candidateCount: number;
      insertedCount: number;
      rows: PassageGrammarTargetRecord[];
    }
  | ActionError;

export type ListPassageGrammarTargetsActionResult =
  | {
      ok: true;
      rows: PassageGrammarTargetRecord[];
      total: number;
    }
  | ActionError;

export type MutatePassageGrammarTargetActionResult =
  | {
      ok: true;
      row: PassageGrammarTargetRecord;
    }
  | ActionError;

export type DeletePassageGrammarTargetActionResult =
  | {
      ok: true;
      deletedId: string;
      passageId: string;
    }
  | ActionError;

export type UpdatePassageGrammarTargetPatch = {
  sentenceId?: string | null;
  grammarUnitId?: string;
  detectionMode?: PassageGrammarTargetDetectionMode;
  status?: PassageGrammarTargetStatus;
  isPrimary?: boolean;
  authoringMode?: PassageGrammarTargetAuthoringMode | null;
  optionPayload?: Record<string, unknown>;
  labelAxesPayload?: Array<Record<string, unknown>>;
  explanationOverride?: string | null;
  wrongReasonNotes?: string[];
  note?: string | null;
};

const PASSAGE_GRAMMAR_TARGET_SELECT = [
  "id",
  "passage_id",
  "sentence_id",
  "grammar_unit_id",
  "detection_mode",
  "status",
  "is_primary",
  "authoring_mode",
  "option_payload",
  "label_axes_payload",
  "explanation_override",
  "wrong_reason_notes",
  "note",
].join(", ");

function isRecord(value: unknown): value is LooseRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): LooseRecord | null {
  return isRecord(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parseJsonLike(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function asStringArray(value: unknown): string[] {
  const parsed = parseJsonLike(value);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  const parsed = parseJsonLike(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is Record<string, unknown> => isRecord(item));
}

function hasOwn<T extends object>(obj: T, key: keyof T): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function normalizePassageGrammarTargetRow(
  value: unknown,
): PassageGrammarTargetRecord | null {
  const row = asRecord(value);
  if (!row) return null;

  const id = asString(row.id);
  const passageId = asString(row.passage_id);
  const grammarUnitId = asString(row.grammar_unit_id);
  const detectionMode = asString(row.detection_mode) as
    | PassageGrammarTargetDetectionMode
    | null;
  const status = asString(row.status) as PassageGrammarTargetStatus | null;

  if (!id || !passageId || !grammarUnitId || !detectionMode || !status) {
    return null;
  }

  return {
    id,
    passageId,
    sentenceId: asString(row.sentence_id),
    grammarUnitId,
    detectionMode,
    status,
    isPrimary: asBoolean(row.is_primary, false),
    authoringMode:
      (asString(row.authoring_mode) as PassageGrammarTargetAuthoringMode | null) ??
      null,
    optionPayload: asRecord(parseJsonLike(row.option_payload)) ?? {},
    labelAxesPayload: asRecordArray(row.label_axes_payload),
    explanationOverride: asString(row.explanation_override),
    wrongReasonNotes: asStringArray(row.wrong_reason_notes),
    note: asString(row.note),
  };
}

function revalidatePassageGrammarPaths(passageId: string) {
  revalidatePath("/admin/naesin/passages");
  revalidatePath(`/admin/naesin/passages/${passageId}/edit`);
  revalidatePath(`/admin/naesin/passages/${passageId}/preview`);
}

function getPassageSentencesFromPayload(
  payload: LooseRecord,
): Array<{ id: string; text: string }> {
  const core = asRecord(payload.core) ?? {};
  const rawSentences = Array.isArray(core.sentences) ? core.sentences : [];

  return rawSentences
    .map((item) => {
      const row = asRecord(item);
      if (!row) return null;

      const id = asString(row.id);
      const text = asString(row.text);

      if (!id || !text) return null;

      return { id, text };
    })
    .filter((item): item is { id: string; text: string } => !!item);
}

async function getPassagePayloadById(passageId: string): Promise<
  | {
      ok: true;
      payload: LooseRecord;
      sentences: Array<{ id: string; text: string }>;
    }
  | ActionError
> {
  const supabase = await getServerSupabase();

  const { data: passageRow, error: passageError } = await supabase
    .from("naesin_passages")
    .select("id, payload")
    .eq("id", passageId)
    .maybeSingle();

  if (passageError || !passageRow) {
    return {
      ok: false,
      error: passageError?.message ?? "지문을 찾을 수 없습니다.",
    };
  }

  const payload = asRecord(parseJsonLike(passageRow.payload)) ?? {};
  const sentences = getPassageSentencesFromPayload(payload);

  return {
    ok: true,
    payload,
    sentences,
  };
}

export async function listPassageGrammarTargetsAction(params: {
  passageId: string;
  status?: PassageGrammarTargetStatus | "all";
  sentenceId?: string;
  detectionMode?: PassageGrammarTargetDetectionMode | "all";
  includeRejected?: boolean;
}): Promise<ListPassageGrammarTargetsActionResult> {
  try {
    const {
      passageId,
      status = "all",
      sentenceId,
      detectionMode = "all",
      includeRejected = true,
    } = params;

    if (!passageId) {
      return {
        ok: false,
        error: "passageId가 없습니다.",
      };
    }

    const supabase = await getServerSupabase();

    let query = supabase
      .from("passage_grammar_targets")
      .select(PASSAGE_GRAMMAR_TARGET_SELECT)
      .eq("passage_id", passageId);

    if (status !== "all") {
      query = query.eq("status", status);
    } else if (!includeRejected) {
      query = query.neq("status", "rejected");
    }

    if (sentenceId) {
      query = query.eq("sentence_id", sentenceId);
    }

    if (detectionMode !== "all") {
      query = query.eq("detection_mode", detectionMode);
    }

    const { data, error } = await query
      .order("sentence_id", { ascending: true })
      .order("is_primary", { ascending: false })
      .order("grammar_unit_id", { ascending: true });

    if (error) {
      return {
        ok: false,
        error: error.message ?? "문법 타깃 목록 조회 중 오류가 발생했습니다.",
      };
    }

    const rows = Array.isArray(data)
      ? data
          .map((row) => normalizePassageGrammarTargetRow(row))
          .filter((row): row is PassageGrammarTargetRecord => !!row)
      : [];

    return {
      ok: true,
      rows,
      total: rows.length,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

export async function getPassageGrammarTargetAction(params: {
  targetId: string;
}): Promise<MutatePassageGrammarTargetActionResult> {
  try {
    const { targetId } = params;

    if (!targetId) {
      return {
        ok: false,
        error: "targetId가 없습니다.",
      };
    }

    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from("passage_grammar_targets")
      .select(PASSAGE_GRAMMAR_TARGET_SELECT)
      .eq("id", targetId)
      .maybeSingle();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message ?? "문법 타깃을 찾을 수 없습니다.",
      };
    }

    const row = normalizePassageGrammarTargetRow(data);
    if (!row) {
      return {
        ok: false,
        error: "문법 타깃 데이터를 정규화하지 못했습니다.",
      };
    }

    return {
      ok: true,
      row,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

export async function runAutoSuggestPassageGrammarTargetsAction(params: {
  passageId: string;
  lessonGrammarUnits: GrammarUnitLite[];
  replaceExistingAutoDetected?: boolean;
}): Promise<AutoSuggestActionResult> {
  try {
    const {
      passageId,
      lessonGrammarUnits,
      replaceExistingAutoDetected = true,
    } = params;

    if (!passageId) {
      return {
        ok: false,
        error: "passageId가 없습니다.",
      };
    }

    if (!Array.isArray(lessonGrammarUnits) || lessonGrammarUnits.length === 0) {
      return {
        ok: false,
        error: "lessonGrammarUnits가 비어 있습니다.",
      };
    }

    const passageResult = await getPassagePayloadById(passageId);
    if (passageResult.ok === false) {
      return {
        ok: false,
        error: passageResult.error,
      };
    }

    const { sentences } = passageResult;

    if (sentences.length === 0) {
      return {
        ok: false,
        error: "지문에 sentence 데이터가 없습니다. 먼저 split/save를 확인하세요.",
      };
    }

    const scanResults = scanPassageSentencesForGrammar({
      sentences,
      lessonGrammarUnits,
    });

    const rows = buildAndDedupePassageGrammarTargetInsertRows({
      passageId,
      scanResults,
    });

    const supabase = await getServerSupabase();

    if (replaceExistingAutoDetected) {
      const { error: deleteError } = await supabase
        .from("passage_grammar_targets")
        .delete()
        .eq("passage_id", passageId)
        .eq("detection_mode", "auto")
        .eq("status", "auto_detected");

      if (deleteError) {
        return {
          ok: false,
          error:
            deleteError.message ??
            "기존 자동 추천 후보 삭제 중 오류가 발생했습니다.",
        };
      }
    }

    if (rows.length === 0) {
      revalidatePassageGrammarPaths(passageId);
      return {
        ok: true,
        passageId,
        sentenceCount: sentences.length,
        candidateCount: 0,
        insertedCount: 0,
        rows: [],
      };
    }

    const { data: insertedRows, error: insertError } = await supabase
      .from("passage_grammar_targets")
      .insert(rows)
      .select(PASSAGE_GRAMMAR_TARGET_SELECT);

    if (insertError) {
      return {
        ok: false,
        error:
          insertError.message ?? "자동 추천 후보 저장 중 오류가 발생했습니다.",
      };
    }

    const normalizedRows = Array.isArray(insertedRows)
      ? insertedRows
          .map((row) => normalizePassageGrammarTargetRow(row))
          .filter((row): row is PassageGrammarTargetRecord => !!row)
      : [];

    revalidatePassageGrammarPaths(passageId);

    return {
      ok: true,
      passageId,
      sentenceCount: sentences.length,
      candidateCount: rows.length,
      insertedCount: normalizedRows.length || rows.length,
      rows: normalizedRows,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

export async function createManualPassageGrammarTargetAction(params: {
  passageId: string;
  sentenceId?: string | null;
  grammarUnitId: string;
  isPrimary?: boolean;
  authoringMode?: PassageGrammarTargetAuthoringMode | null;
  optionPayload?: Record<string, unknown>;
  labelAxesPayload?: Array<Record<string, unknown>>;
  explanationOverride?: string | null;
  wrongReasonNotes?: string[];
  note?: string | null;
  status?: Extract<
    PassageGrammarTargetStatus,
    "manual_added" | "confirmed" | "edited"
  >;
}): Promise<MutatePassageGrammarTargetActionResult> {
  try {
    const {
      passageId,
      sentenceId = null,
      grammarUnitId,
      isPrimary = false,
      authoringMode = "manual_deep",
      optionPayload = {},
      labelAxesPayload = [],
      explanationOverride = null,
      wrongReasonNotes = [],
      note = null,
      status = "manual_added",
    } = params;

    if (!passageId) {
      return {
        ok: false,
        error: "passageId가 없습니다.",
      };
    }

    if (!grammarUnitId) {
      return {
        ok: false,
        error: "grammarUnitId가 없습니다.",
      };
    }

    const supabase = await getServerSupabase();

    const { data, error } = await supabase
      .from("passage_grammar_targets")
      .insert({
        passage_id: passageId,
        sentence_id: sentenceId,
        grammar_unit_id: grammarUnitId,
        detection_mode: "manual",
        status,
        is_primary: isPrimary,
        authoring_mode: authoringMode,
        option_payload: optionPayload,
        label_axes_payload: labelAxesPayload,
        explanation_override: explanationOverride,
        wrong_reason_notes: wrongReasonNotes,
        note,
      })
      .select(PASSAGE_GRAMMAR_TARGET_SELECT)
      .maybeSingle();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message ?? "수동 문법 타깃 추가 중 오류가 발생했습니다.",
      };
    }

    const row = normalizePassageGrammarTargetRow(data);
    if (!row) {
      return {
        ok: false,
        error: "수동 문법 타깃 데이터를 정규화하지 못했습니다.",
      };
    }

    revalidatePassageGrammarPaths(passageId);

    return {
      ok: true,
      row,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

export async function updatePassageGrammarTargetAction(params: {
  targetId: string;
  patch: UpdatePassageGrammarTargetPatch;
}): Promise<MutatePassageGrammarTargetActionResult> {
  try {
    const { targetId, patch } = params;

    if (!targetId) {
      return {
        ok: false,
        error: "targetId가 없습니다.",
      };
    }

    const currentResult = await getPassageGrammarTargetAction({ targetId });
    if (currentResult.ok === false) {
      return {
        ok: false,
        error: currentResult.error,
      };
    }

    const updatePayload: LooseRecord = {};

    if (hasOwn(patch, "sentenceId")) updatePayload.sentence_id = patch.sentenceId ?? null;
    if (hasOwn(patch, "grammarUnitId")) updatePayload.grammar_unit_id = patch.grammarUnitId;
    if (hasOwn(patch, "detectionMode")) updatePayload.detection_mode = patch.detectionMode;
    if (hasOwn(patch, "status")) updatePayload.status = patch.status;
    if (hasOwn(patch, "isPrimary")) updatePayload.is_primary = patch.isPrimary;
    if (hasOwn(patch, "authoringMode")) updatePayload.authoring_mode = patch.authoringMode;
    if (hasOwn(patch, "optionPayload")) updatePayload.option_payload = patch.optionPayload ?? {};
    if (hasOwn(patch, "labelAxesPayload")) {
      updatePayload.label_axes_payload = patch.labelAxesPayload ?? [];
    }
    if (hasOwn(patch, "explanationOverride")) {
      updatePayload.explanation_override = patch.explanationOverride ?? null;
    }
    if (hasOwn(patch, "wrongReasonNotes")) {
      updatePayload.wrong_reason_notes = patch.wrongReasonNotes ?? [];
    }
    if (hasOwn(patch, "note")) updatePayload.note = patch.note ?? null;

    const changedContent = [
      "sentenceId",
      "grammarUnitId",
      "isPrimary",
      "authoringMode",
      "optionPayload",
      "labelAxesPayload",
      "explanationOverride",
      "wrongReasonNotes",
      "note",
    ].some((key) => hasOwn(patch, key as keyof UpdatePassageGrammarTargetPatch));

    if (!hasOwn(patch, "status") && changedContent) {
      updatePayload.status = "edited";
    }

    if (Object.keys(updatePayload).length === 0) {
      return {
        ok: false,
        error: "업데이트할 내용이 없습니다.",
      };
    }

    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from("passage_grammar_targets")
      .update(updatePayload)
      .eq("id", targetId)
      .select(PASSAGE_GRAMMAR_TARGET_SELECT)
      .maybeSingle();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message ?? "문법 타깃 수정 중 오류가 발생했습니다.",
      };
    }

    const row = normalizePassageGrammarTargetRow(data);
    if (!row) {
      return {
        ok: false,
        error: "수정된 문법 타깃 데이터를 정규화하지 못했습니다.",
      };
    }

    revalidatePassageGrammarPaths(currentResult.row.passageId);

    return {
      ok: true,
      row,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

export async function setPassageGrammarTargetStatusAction(params: {
  targetId: string;
  status: PassageGrammarTargetStatus;
  note?: string | null;
}): Promise<MutatePassageGrammarTargetActionResult> {
  const patch: UpdatePassageGrammarTargetPatch = {
    status: params.status,
  };

  if (hasOwn(params, "note")) {
    patch.note = params.note ?? null;
  }

  return updatePassageGrammarTargetAction({
    targetId: params.targetId,
    patch,
  });
}

export async function confirmPassageGrammarTargetAction(params: {
  targetId: string;
  note?: string | null;
}): Promise<MutatePassageGrammarTargetActionResult> {
  return setPassageGrammarTargetStatusAction({
    targetId: params.targetId,
    status: "confirmed",
    note: params.note,
  });
}

export async function rejectPassageGrammarTargetAction(params: {
  targetId: string;
  note?: string | null;
}): Promise<MutatePassageGrammarTargetActionResult> {
  return setPassageGrammarTargetStatusAction({
    targetId: params.targetId,
    status: "rejected",
    note: params.note,
  });
}

export async function deletePassageGrammarTargetAction(params: {
  targetId: string;
}): Promise<DeletePassageGrammarTargetActionResult> {
  try {
    const { targetId } = params;

    if (!targetId) {
      return {
        ok: false,
        error: "targetId가 없습니다.",
      };
    }

    const currentResult = await getPassageGrammarTargetAction({ targetId });
    if (currentResult.ok === false) {
      return {
        ok: false,
        error: currentResult.error,
      };
    }

    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from("passage_grammar_targets")
      .delete()
      .eq("id", targetId)
      .select("id, passage_id")
      .maybeSingle();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message ?? "문법 타깃 삭제 중 오류가 발생했습니다.",
      };
    }

    const deletedId = asString((data as LooseRecord).id);
    const passageId = asString((data as LooseRecord).passage_id);

    if (!deletedId || !passageId) {
      return {
        ok: false,
        error: "삭제 결과를 해석하지 못했습니다.",
      };
    }

    revalidatePassageGrammarPaths(passageId);

    return {
      ok: true,
      deletedId,
      passageId,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}
