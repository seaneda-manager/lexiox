"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import type {
  NReadingAnswerKey,
  NReadingQuestion,
  NReadingQuestionType,
  WrongReasonTag,
} from "@/models/reading";
import {
  getNReadingSkillGroup,
  isCorrectNReadingAnswer,
} from "@/models/reading";
import { buildNReadingAnalytics } from "@/lib/reading/naesin-analytics";
import {
  summarizeNReadingGradedAnswers,
  type NReadingGradedAnswerRecord,
} from "@/lib/reading/naesin-grading";

type StartMode = "practice" | "test" | "review" | "clinic";

type StartNaesinReadingSessionInput = {
  setId?: string;
  mode?: string;
  profileId?: string;
};

type SubmitNaesinReadingAnswerInput = {
  sessionId: string;
  questionId: string;
  choiceId: string;
  elapsedMs?: number;
};

type FinishNaesinReadingSessionInput = {
  sessionId: string;
};

type ActionOk<T extends object = {}> = { ok: true } & T;
type ActionFail = { ok: false; error: string };

export async function startNaesinReadingSession(
  input: StartNaesinReadingSessionInput,
): Promise<ActionOk<{ sessionId: string }> | ActionFail> {
  try {
    const supabase = await getServerSupabase();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) return { ok: false, error: userError.message };
    if (!user) return { ok: false, error: "Authentication required" };
    if (!input.setId?.trim()) return { ok: false, error: "setId is required" };

    const mode = normalizeMode(input.mode);

    const { data, error } = await supabase
      .from("naesin_reading_sessions")
      .insert({
        student_id: user.id,
        set_id: input.setId,
        status: "started",
        mode,
        started_at: new Date().toISOString(),
        metadata: input.profileId ? { profileId: input.profileId } : {},
      })
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Failed to start session" };
    }

    return { ok: true, sessionId: String(data.id) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function submitNaesinReadingAnswer(
  input: SubmitNaesinReadingAnswerInput,
): Promise<ActionOk | ActionFail> {
  try {
    const supabase = await getServerSupabase();

    const { data: questionRow, error: questionError } = await supabase
      .from("naesin_reading_questions")
      .select("id, answer_key, score")
      .eq("id", input.questionId)
      .single();

    if (questionError || !questionRow) {
      return {
        ok: false,
        error: questionError?.message ?? "Question not found",
      };
    }

    const answerKey = questionRow.answer_key as NReadingAnswerKey;
    const rawChoiceIds =
      typeof input.choiceId === "string" && input.choiceId.includes("|")
        ? input.choiceId.split("|").map((v) => v.trim()).filter(Boolean)
        : [];

    const selectedChoiceId = rawChoiceIds.length === 0 ? input.choiceId : undefined;
    const selectedChoiceIds = rawChoiceIds.length > 0 ? rawChoiceIds : [];

    const isCorrect = isCorrectNReadingAnswer(answerKey, {
      selectedChoiceId,
      selectedChoiceIds,
      answerText: undefined,
      orderedValues: undefined,
      mappingPairs: undefined,
    });

    const maxScore = Number(questionRow.score ?? 1);
    const awardedScore = isCorrect ? maxScore : 0;

    const { error: upsertError } = await supabase
      .from("naesin_reading_answers")
      .upsert(
        {
          session_id: input.sessionId,
          question_id: input.questionId,
          selected_choice_id: selectedChoiceId ?? null,
          selected_choice_ids: selectedChoiceIds,
          answer_text: null,
          ordered_values: [],
          mapping_pairs: {},
          is_correct: isCorrect,
          elapsed_sec:
            typeof input.elapsedMs === "number"
              ? Math.max(0, Math.round(input.elapsedMs / 1000))
              : null,
          confidence: null,
          evidence_checked: false,
          flagged: false,
          wrong_reason_tags: [] as WrongReasonTag[],
          awarded_score: awardedScore,
          max_score: maxScore,
          omitted: false,
        },
        { onConflict: "session_id,question_id" },
      );

    if (upsertError) {
      return { ok: false, error: upsertError.message };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function finishNaesinReadingSession(
  input: FinishNaesinReadingSessionInput,
): Promise<ActionOk<{ sessionId: string }> | ActionFail> {
  try {
    const supabase = await getServerSupabase();

    const { data: sessionRow, error: sessionError } = await supabase
      .from("naesin_reading_sessions")
      .select("id, set_id")
      .eq("id", input.sessionId)
      .single();

    if (sessionError || !sessionRow) {
      return { ok: false, error: sessionError?.message ?? "Session not found" };
    }

    const setId = String(sessionRow.set_id);

    const { data: questionRows, error: questionError } = await supabase
      .from("naesin_reading_questions")
      .select(
        `
        id,
        passage_id,
        set_id,
        order_index,
        number_label,
        type,
        stem,
        answer_key,
        explanation,
        difficulty,
        score,
        metadata
      `,
      )
      .eq("set_id", setId)
      .order("order_index", { ascending: true });

    if (questionError) {
      return { ok: false, error: questionError.message };
    }

    const { data: answerRows, error: answerError } = await supabase
      .from("naesin_reading_answers")
      .select(
        `
        id,
        session_id,
        question_id,
        selected_choice_id,
        selected_choice_ids,
        answer_text,
        ordered_values,
        mapping_pairs,
        is_correct,
        elapsed_sec,
        confidence,
        evidence_checked,
        flagged,
        wrong_reason_tags,
        awarded_score,
        max_score,
        omitted
      `,
      )
      .eq("session_id", input.sessionId);

    if (answerError) {
      return { ok: false, error: answerError.message };
    }

    const questions: NReadingQuestion[] = (questionRows ?? []).map((q: any) => ({
      id: String(q.id),
      passageId: String(q.passage_id),
      setId: String(q.set_id),
      orderIndex: Number(q.order_index ?? 0),
      numberLabel: String(q.number_label ?? ""),
      type: q.type as NReadingQuestionType,
      stem: String(q.stem ?? ""),
      answer: q.answer_key as NReadingAnswerKey,
      difficulty: q.difficulty ?? undefined,
      score: Number(q.score ?? 1),
      metadata: q.metadata ?? {},
    }));

    const answerMap = new Map<string, any>();
    for (const row of answerRows ?? []) {
      answerMap.set(String((row as any).question_id), row);
    }

    const gradedAnswers: NReadingGradedAnswerRecord[] = questions.map((q) => {
      const row = answerMap.get(q.id);

      return {
        id: row?.id ? String(row.id) : `missing_${q.id}`,
        sessionId: input.sessionId,
        questionId: q.id,
        selectedChoiceId: row?.selected_choice_id ?? undefined,
        selectedChoiceIds: Array.isArray(row?.selected_choice_ids)
          ? row.selected_choice_ids.map(String)
          : undefined,
        answerText: row?.answer_text ?? undefined,
        orderedValues: Array.isArray(row?.ordered_values)
          ? row.ordered_values.map(String)
          : undefined,
        mappingPairs:
          row?.mapping_pairs && typeof row.mapping_pairs === "object"
            ? row.mapping_pairs
            : undefined,
        isCorrect: Boolean(row?.is_correct),
        elapsedSec:
          typeof row?.elapsed_sec === "number" ? Number(row.elapsed_sec) : undefined,
        confidence:
          typeof row?.confidence === "number"
            ? (row.confidence as 1 | 2 | 3 | 4 | 5)
            : undefined,
        evidenceChecked: Boolean(row?.evidence_checked),
        flagged: Boolean(row?.flagged),
        wrongReasonTags: Array.isArray(row?.wrong_reason_tags)
          ? (row.wrong_reason_tags as WrongReasonTag[])
          : undefined,
        passageId: q.passageId,
        setId: q.setId,
        questionType: q.type,
        skillGroup: getNReadingSkillGroup(q.type),
        questionOrderIndex: q.orderIndex,
        numberLabel: q.numberLabel,
        awardedScore:
          typeof row?.awarded_score === "number"
            ? Number(row.awarded_score)
            : 0,
        maxScore:
          typeof row?.max_score === "number"
            ? Number(row.max_score)
            : Number(q.score ?? 1),
        omitted: row ? Boolean(row.omitted) : true,
      };
    });

    const summary = summarizeNReadingGradedAnswers(gradedAnswers);
    const analytics = buildNReadingAnalytics({
      sessionId: input.sessionId,
      questions,
      gradedAnswers,
    });

    const totalElapsedSec = gradedAnswers.reduce(
      (sum, item) => sum + Number(item.elapsedSec ?? 0),
      0,
    );

    const { error: updateSessionError } = await supabase
      .from("naesin_reading_sessions")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        total_elapsed_sec: totalElapsedSec,
        score_raw: summary.awardedScore,
        score_percent: summary.scorePercent,
        analytics_snapshot: analytics,
      })
      .eq("id", input.sessionId);

    if (updateSessionError) {
      return { ok: false, error: updateSessionError.message };
    }

    const { error: snapshotError } = await supabase
      .from("naesin_reading_analytics_snapshots")
      .upsert(
        {
          session_id: input.sessionId,
          accuracy_overall: analytics.accuracyOverall,
          by_question_type: analytics.byQuestionType,
          by_skill_group: analytics.bySkillGroup,
          by_passage: analytics.byPassage,
          wrong_reason_breakdown: analytics.wrongReasonBreakdown,
          avg_elapsed_sec_by_type: analytics.avgElapsedSecByType ?? {},
          prescription_tags: analytics.prescriptionTags ?? [],
        },
        { onConflict: "session_id" },
      );

    if (snapshotError) {
      return { ok: false, error: snapshotError.message };
    }

    return { ok: true, sessionId: input.sessionId };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function normalizeMode(mode?: string): StartMode {
  switch (mode) {
    case "practice":
    case "clinic":
    case "review":
    case "test":
      return mode;
    case "study":
      return "practice";
    case "exam":
      return "test";
    default:
      return "test";
  }
}
