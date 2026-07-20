import type {
  AnswerRow,
  EvidenceLogRow,
  QuestionRow,
  SentenceAnalysisLogRow,
  UnknownWordLogRow,
  VocabLogRow,
} from "@/lib/reading-review/core/types";

type SupabaseServerClient = Awaited<
  ReturnType<typeof import("@/lib/supabase/server").getServerSupabase>
>;

type ActionOk<T extends object = {}> = { ok: true } & T;
type ActionFail = { ok: false; error: string };

export type NaesinSessionAnalysisData = {
  questions: QuestionRow[];
  answers: AnswerRow[];
  evidenceLogs: EvidenceLogRow[];
  unknownWordLogs: UnknownWordLogRow[];
  sentenceLogs: SentenceAnalysisLogRow[];
  vocabLogs: VocabLogRow[];
};

export async function loadNaesinSessionAnalysisData(
  supabase: SupabaseServerClient,
  input: {
    setId: string;
    sessionId: string;
  },
): Promise<ActionOk<{ data: NaesinSessionAnalysisData }> | ActionFail> {
  const setId = input.setId.trim();
  const sessionId = input.sessionId.trim();

  if (!setId) return { ok: false, error: "Invalid setId" };
  if (!sessionId) return { ok: false, error: "Invalid sessionId" };

  const { data: questionRows, error: questionError } = await supabase
    .from("naesin_reading_questions")
    .select("id, set_id, passage_id, type, score")
    .eq("set_id", setId);

  if (questionError) return { ok: false, error: questionError.message };

  const { data: answerRows, error: answerError } = await supabase
    .from("naesin_reading_answers")
    .select("question_id, is_correct, elapsed_sec, flagged, omitted, wrong_reason_tags")
    .eq("session_id", sessionId);

  if (answerError) return { ok: false, error: answerError.message };

  const { data: evidenceLogRows, error: evidenceLogError } = await supabase
    .from("naesin_reading_review_evidence_logs")
    .select("question_id, selected_evidence, matched")
    .eq("session_id", sessionId);

  if (evidenceLogError) return { ok: false, error: evidenceLogError.message };

  const { data: unknownWordRows, error: unknownWordError } = await supabase
    .from("naesin_reading_review_unknown_word_logs")
    .select("passage_id, words")
    .eq("session_id", sessionId);

  if (unknownWordError) return { ok: false, error: unknownWordError.message };

  const { data: sentenceAnalysisRows, error: sentenceAnalysisError } = await supabase
    .from("naesin_reading_review_sentence_analysis_logs")
    .select(
      "question_id, translation_ko, subject_text, verb_text, object_text, complement_text, modifier_text",
    )
    .eq("session_id", sessionId);

  if (sentenceAnalysisError) {
    return { ok: false, error: sentenceAnalysisError.message };
  }

  const { data: vocabLogRows, error: vocabLogError } = await supabase
    .from("naesin_reading_review_vocab_logs")
    .select("word, is_correct")
    .eq("session_id", sessionId);

  if (vocabLogError) return { ok: false, error: vocabLogError.message };

  return {
    ok: true,
    data: {
      questions: (questionRows ?? []) as QuestionRow[],
      answers: (answerRows ?? []) as AnswerRow[],
      evidenceLogs: (evidenceLogRows ?? []) as EvidenceLogRow[],
      unknownWordLogs: (unknownWordRows ?? []) as UnknownWordLogRow[],
      sentenceLogs: (sentenceAnalysisRows ?? []) as SentenceAnalysisLogRow[],
      vocabLogs: (vocabLogRows ?? []) as VocabLogRow[],
    },
  };
}
