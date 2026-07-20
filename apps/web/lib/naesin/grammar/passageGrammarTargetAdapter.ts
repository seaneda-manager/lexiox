
// Drop-in adapter
// Suggested path:
// apps/web/lib/naesin/grammar/passageGrammarTargetAdapter.ts

import type {
  GrammarSuggestionCandidate,
  ScanSentenceForGrammarOutput,
} from "./ruleScanV1";

export type PassageGrammarTargetStatus =
  | "auto_detected"
  | "confirmed"
  | "edited"
  | "manual_added"
  | "rejected";

export type PassageGrammarTargetDetectionMode = "auto" | "manual";

export type PassageGrammarTargetAuthoringMode = "auto_lite" | "manual_deep";

export type PassageGrammarTargetInsertRow = {
  passage_id: string;
  sentence_id: string | null;
  grammar_unit_id: string;
  detection_mode: PassageGrammarTargetDetectionMode;
  status: PassageGrammarTargetStatus;
  is_primary: boolean;
  authoring_mode: PassageGrammarTargetAuthoringMode | null;
  option_payload: Record<string, unknown>;
  label_axes_payload: Array<Record<string, unknown>>;
  explanation_override: string | null;
  wrong_reason_notes: string[];
  note: string | null;
};

export type BuildInsertRowsParams = {
  passageId: string;
  scanResults: ScanSentenceForGrammarOutput[];
};

function buildDefaultOptionPayload(
  candidate: GrammarSuggestionCandidate,
): Record<string, unknown> {
  // v1에서는 기본 문항 payload를 아주 가볍게 둡니다.
  // auto_lite 문법은 나중에 보기 2개 자동 생성 로직을 붙일 수 있고,
  // manual_deep은 초안만 유지합니다.
  return {
    source: "rule_scan_v1",
    score: candidate.score,
    matchedSignals: candidate.matchedSignals.map((signal) => ({
      code: signal.code,
      label: signal.label,
      weight: signal.weight,
      matchedText: signal.matchedText ?? null,
    })),
    options: [],
  };
}

function buildDefaultLabelAxesPayload(
  candidate: GrammarSuggestionCandidate,
): Array<Record<string, unknown>> {
  return [
    {
      axisLabel: "탐지 근거",
      options: candidate.matchedSignals.map((signal) => signal.label),
    },
  ];
}

function candidateToInsertRow(params: {
  passageId: string;
  candidate: GrammarSuggestionCandidate;
}): PassageGrammarTargetInsertRow {
  const { passageId, candidate } = params;

  return {
    passage_id: passageId,
    sentence_id: candidate.sentenceId || null,
    grammar_unit_id: candidate.grammarUnitId,
    detection_mode: "auto",
    status: "auto_detected",
    is_primary: candidate.isPrimary,
    authoring_mode: candidate.authoringMode,
    option_payload: buildDefaultOptionPayload(candidate),
    label_axes_payload: buildDefaultLabelAxesPayload(candidate),
    explanation_override: null,
    wrong_reason_notes: [],
    note: candidate.note || null,
  };
}

export function buildPassageGrammarTargetInsertRows(
  params: BuildInsertRowsParams,
): PassageGrammarTargetInsertRow[] {
  const rows: PassageGrammarTargetInsertRow[] = [];

  for (const scanResult of params.scanResults) {
    for (const candidate of scanResult.candidates) {
      rows.push(
        candidateToInsertRow({
          passageId: params.passageId,
          candidate,
        }),
      );
    }
  }

  return rows;
}

export function dedupePassageGrammarTargetInsertRows(
  rows: PassageGrammarTargetInsertRow[],
): PassageGrammarTargetInsertRow[] {
  const seen = new Set<string>();

  return rows.filter((row) => {
    const key = [
      row.passage_id,
      row.sentence_id ?? "",
      row.grammar_unit_id,
    ].join("::");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildAndDedupePassageGrammarTargetInsertRows(
  params: BuildInsertRowsParams,
): PassageGrammarTargetInsertRow[] {
  const rows = buildPassageGrammarTargetInsertRows(params);
  return dedupePassageGrammarTargetInsertRows(rows);
}

// Example helper for Supabase insert
export async function insertPassageGrammarTargets(params: {
  supabase: {
    from: (table: string) => {
      insert: (rows: PassageGrammarTargetInsertRow[]) => {
        select: (columns: string) => Promise<{
          data: unknown;
          error: { message?: string } | null;
        }>;
      };
    };
  };
  rows: PassageGrammarTargetInsertRow[];
}) {
  if (params.rows.length === 0) {
    return {
      data: [],
      error: null,
    };
  }

  const result = await params.supabase
    .from("passage_grammar_targets")
    .insert(params.rows)
    .select("id, passage_id, sentence_id, grammar_unit_id, status");

  return result;
}
