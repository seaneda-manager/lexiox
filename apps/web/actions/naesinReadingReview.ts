"use server";

import { buildSessionAnalysisResult } from "@/lib/reading-review/core/session-analysis";
import {
  cleanOptionalText,
  evidenceMatches,
  uniqTextArray,
} from "@/lib/reading-review/core/text";
import {
  getOwnNaesinSessionContext,
  resolveNaesinPassageContext,
  resolveNaesinQuestionContext,
} from "@/lib/reading-review/adapters/naesin/context";
import { getOfficialNaesinEvidenceQuotes } from "@/lib/reading-review/adapters/naesin/evidence";
import { loadNaesinSessionAnalysisData } from "@/lib/reading-review/adapters/naesin/loader";
import { NAESIN_PRESCRIPTION_MAP } from "@/lib/reading-review/adapters/naesin/prescriptions";
import { saveNaesinSessionAnalysisSnapshot } from "@/lib/reading-review/adapters/naesin/snapshots";
import { NAESIN_READING_TAXONOMY } from "@/lib/reading-review/adapters/naesin/taxonomy";
import { rebuildNaesinStudentTendencySnapshot } from "@/lib/reading-review/adapters/naesin/tendency";

type ActionOk<T extends object = {}> = { ok: true } & T;
type ActionFail = { ok: false; error: string };

type SaveEvidenceInput = {
  sessionId: string;
  questionId: string;
  passageId: string;
  selectedEvidence: string[];
  note?: string;
};

type SaveUnknownWordsInput = {
  sessionId: string;
  passageId: string;
  words: string[];
};

type SaveSentenceAnalysisInput = {
  sessionId: string;
  questionId: string;
  passageId: string;
  targetSentence: string;
  translationKo?: string;
  subjectText?: string;
  verbText?: string;
  objectText?: string;
  complementText?: string;
  modifierText?: string;
  note?: string;
};

type SaveVocabLogInput = {
  sessionId: string;
  passageId: string;
  word: string;
  promptSentence?: string;
  clozeText?: string;
  userAnswer?: string;
  isCorrect: boolean;
  attemptNo?: number;
};

export async function saveNaesinReviewEvidenceLogAction(
  input: SaveEvidenceInput,
): Promise<ActionOk<{ matched: boolean }> | ActionFail> {
  try {
    const ctx = await resolveNaesinQuestionContext({
      sessionId: input.sessionId,
      questionId: input.questionId,
      passageId: input.passageId,
    });
    if (ctx.ok === false) return ctx;

    const official = await getOfficialNaesinEvidenceQuotes(ctx.supabase, {
      questionId: input.questionId,
    });
    if (official.ok === false) return official;

    const normalizedSelected = uniqTextArray(input.selectedEvidence);

    const matched =
      normalizedSelected.length > 0 &&
      normalizedSelected.some((picked) =>
        official.quotes.some((quote) => evidenceMatches(quote, picked)),
      );

    const { error } = await ctx.supabase
      .from("naesin_reading_review_evidence_logs")
      .upsert(
        {
          session_id: input.sessionId,
          question_id: input.questionId,
          passage_id: ctx.question.passage_id,
          selected_evidence: normalizedSelected,
          matched,
          note: cleanOptionalText(input.note),
        },
        { onConflict: "session_id,question_id" },
      );

    if (error) return { ok: false, error: error.message };

    return { ok: true, matched };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function saveNaesinReviewUnknownWordsLogAction(
  input: SaveUnknownWordsInput,
): Promise<ActionOk | ActionFail> {
  try {
    const ctx = await resolveNaesinPassageContext({
      sessionId: input.sessionId,
      passageId: input.passageId,
    });
    if (ctx.ok === false) return ctx;

    const { error } = await ctx.supabase
      .from("naesin_reading_review_unknown_word_logs")
      .upsert(
        {
          session_id: input.sessionId,
          passage_id: ctx.passageId,
          words: uniqTextArray(input.words),
        },
        { onConflict: "session_id,passage_id" },
      );

    if (error) return { ok: false, error: error.message };

    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function saveNaesinReviewSentenceAnalysisLogAction(
  input: SaveSentenceAnalysisInput,
): Promise<ActionOk | ActionFail> {
  try {
    const ctx = await resolveNaesinQuestionContext({
      sessionId: input.sessionId,
      questionId: input.questionId,
      passageId: input.passageId,
    });
    if (ctx.ok === false) return ctx;

    const targetSentence = input.targetSentence.trim();
    if (!targetSentence) {
      return { ok: false, error: "targetSentence is required" };
    }

    const { error } = await ctx.supabase
      .from("naesin_reading_review_sentence_analysis_logs")
      .upsert(
        {
          session_id: input.sessionId,
          question_id: input.questionId,
          passage_id: ctx.question.passage_id,
          target_sentence: targetSentence,
          translation_ko: cleanOptionalText(input.translationKo),
          subject_text: cleanOptionalText(input.subjectText),
          verb_text: cleanOptionalText(input.verbText),
          object_text: cleanOptionalText(input.objectText),
          complement_text: cleanOptionalText(input.complementText),
          modifier_text: cleanOptionalText(input.modifierText),
          note: cleanOptionalText(input.note),
        },
        { onConflict: "session_id,question_id" },
      );

    if (error) return { ok: false, error: error.message };

    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function saveNaesinReviewVocabLogAction(
  input: SaveVocabLogInput,
): Promise<ActionOk | ActionFail> {
  try {
    const ctx = await resolveNaesinPassageContext({
      sessionId: input.sessionId,
      passageId: input.passageId,
    });
    if (ctx.ok === false) return ctx;

    const word = input.word.trim();
    if (!word) {
      return { ok: false, error: "word is required" };
    }

    const { error } = await ctx.supabase
      .from("naesin_reading_review_vocab_logs")
      .upsert(
        {
          session_id: input.sessionId,
          passage_id: ctx.passageId,
          word,
          prompt_sentence: cleanOptionalText(input.promptSentence),
          cloze_text: cleanOptionalText(input.clozeText),
          user_answer: cleanOptionalText(input.userAnswer),
          is_correct: Boolean(input.isCorrect),
          attempt_no: Math.max(1, Number(input.attemptNo ?? 1)),
        },
        { onConflict: "session_id,passage_id,word,attempt_no" },
      );

    if (error) return { ok: false, error: error.message };

    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function rebuildNaesinSessionAnalysisAction(
  sessionId: string,
): Promise<
  ActionOk<{
    sessionId: string;
    weakTags: string[];
    prescriptions: string[];
  }> | ActionFail
> {
  try {
    const ctx = await getOwnNaesinSessionContext(sessionId);
    if (ctx.ok === false) return ctx;

    const { supabase, session } = ctx;

    const loaded = await loadNaesinSessionAnalysisData(supabase, {
      setId: session.set_id,
      sessionId,
    });
    if (loaded.ok === false) return loaded;

    const analysis = buildSessionAnalysisResult({
      ...loaded.data,
      taxonomy: NAESIN_READING_TAXONOMY,
      prescriptionMap: NAESIN_PRESCRIPTION_MAP,
    });

    const saved = await saveNaesinSessionAnalysisSnapshot(supabase, {
      sessionId,
      session,
      analysis,
    });
    if (saved.ok === false) return saved;

    const tendency5 = await rebuildNaesinStudentTendencySnapshot(
      supabase,
      session.student_id,
      5,
    );
    if (tendency5.ok === false) return tendency5;

    const tendency10 = await rebuildNaesinStudentTendencySnapshot(
      supabase,
      session.student_id,
      10,
    );
    if (tendency10.ok === false) return tendency10;

    return {
      ok: true,
      sessionId,
      weakTags: analysis.weakTags,
      prescriptions: analysis.prescriptions,
    };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
