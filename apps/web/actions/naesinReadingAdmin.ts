"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import type { NReadingAnswerKey } from "@/models/reading";
import {
  type NaesinReadingCreatePayload,
  normalizeNaesinReadingPayload,
} from "@/lib/reading/naesin-payload";

type CreateNaesinReadingSetResult =
  | {
    ok: true;
    setId: string;
    passageIds: string[];
    questionIds: string[];
    choiceIds: string[];
    evidenceIds: string[];
  }
  | {
    ok: false;
    error: string;
  };

type UpdateNaesinReadingSetResult = CreateNaesinReadingSetResult;

export async function createNaesinReadingSetAction(
  rawPayload: NaesinReadingCreatePayload,
): Promise<CreateNaesinReadingSetResult> {
  try {
    const payload = normalizeNaesinReadingPayload(rawPayload);
    const supabase = await getServerSupabase();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return { ok: false, error: userError.message };
    }

    if (!user) {
      return { ok: false, error: "Authentication required" };
    }

    const totalQuestions = payload.passages.reduce(
      (sum, bundle) => sum + bundle.questions.length,
      0,
    );

    const { data: setRow, error: setError } = await supabase
      .from("naesin_reading_sets")
      .insert({
        track: "lingo_x_naesin",
        curriculum_id: payload.set.curriculumId ?? null,
        title: payload.set.title,
        subtitle: payload.set.subtitle ?? null,
        source_type: payload.set.sourceType,
        exam_context: payload.set.examContext,
        grade_band: payload.set.gradeBand,
        difficulty: payload.set.difficulty,
        school_name: payload.set.schoolName ?? null,
        semester: payload.set.semester ?? null,
        book_name: payload.set.bookName ?? null,
        unit_range: payload.set.unitRange ?? null,
        total_questions: totalQuestions,
        estimated_minutes: payload.set.estimatedMinutes || null,
        tags: payload.set.tags,
        is_published: payload.set.isPublished,
        metadata: payload.set.metadata,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (setError || !setRow) {
      return { ok: false, error: setError?.message ?? "Failed to create set" };
    }

    const inserted = await insertNaesinSetChildren({
      supabase,
      setId: setRow.id as string,
      payload,
    });

    if (inserted.ok === false) {
      return inserted;
    }

    revalidateNaesinPaths(setRow.id as string);

    return inserted;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function updateNaesinReadingSetAction(
  setId: string,
  rawPayload: NaesinReadingCreatePayload,
): Promise<UpdateNaesinReadingSetResult> {
  try {
    if (!setId?.trim()) {
      return { ok: false, error: "setId is required" };
    }

    const payload = normalizeNaesinReadingPayload(rawPayload);
    const supabase = await getServerSupabase();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return { ok: false, error: userError.message };
    }

    if (!user) {
      return { ok: false, error: "Authentication required" };
    }

    const totalQuestions = payload.passages.reduce(
      (sum, bundle) => sum + bundle.questions.length,
      0,
    );

    const { data: existingSet, error: existingSetError } = await supabase
      .from("naesin_reading_sets")
      .select("id")
      .eq("id", setId)
      .single();

    if (existingSetError || !existingSet) {
      return {
        ok: false,
        error: existingSetError?.message ?? "Naesin set not found",
      };
    }

    const { error: updateSetError } = await supabase
      .from("naesin_reading_sets")
      .update({
        curriculum_id: payload.set.curriculumId ?? null,
        title: payload.set.title,
        subtitle: payload.set.subtitle ?? null,
        source_type: payload.set.sourceType,
        exam_context: payload.set.examContext,
        grade_band: payload.set.gradeBand,
        difficulty: payload.set.difficulty,
        school_name: payload.set.schoolName ?? null,
        semester: payload.set.semester ?? null,
        book_name: payload.set.bookName ?? null,
        unit_range: payload.set.unitRange ?? null,
        total_questions: totalQuestions,
        estimated_minutes: payload.set.estimatedMinutes || null,
        tags: payload.set.tags,
        is_published: payload.set.isPublished,
        metadata: payload.set.metadata,
      })
      .eq("id", setId);

    if (updateSetError) {
      return { ok: false, error: updateSetError.message };
    }

    const { error: deletePassagesError } = await supabase
      .from("naesin_reading_passages")
      .delete()
      .eq("set_id", setId);

    if (deletePassagesError) {
      return { ok: false, error: deletePassagesError.message };
    }

    const inserted = await insertNaesinSetChildren({
      supabase,
      setId,
      payload,
    });

    if (inserted.ok === false) {
      return inserted;
    }

    revalidateNaesinPaths(setId);

    return inserted;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function insertNaesinSetChildren(params: {
  supabase: Awaited<ReturnType<typeof getServerSupabase>>;
  setId: string;
  payload: ReturnType<typeof normalizeNaesinReadingPayload>;
}): Promise<CreateNaesinReadingSetResult> {
  const { supabase, setId, payload } = params;

  const passageIds: string[] = [];
  const questionIds: string[] = [];
  const choiceIds: string[] = [];
  const evidenceIds: string[] = [];

  for (const bundle of payload.passages) {
    const { data: passageRow, error: passageError } = await supabase
      .from("naesin_reading_passages")
      .insert({
        set_id: setId,
        order_index: bundle.passage.orderIndex,
        title: bundle.passage.title ?? null,
        source_type: bundle.passage.sourceType,
        exam_context: bundle.passage.examContext,
        grade_band: bundle.passage.gradeBand,
        difficulty: bundle.passage.difficulty,
        genre: bundle.passage.genre,
        text: bundle.passage.text,
        translation_ko: bundle.passage.translationKo ?? null,
        summary: bundle.passage.summary ?? null,
        vocab_focus: bundle.passage.vocabFocus,
        grammar_focus: bundle.passage.grammarFocus,
        tags: bundle.passage.tags,
        metadata: bundle.passage.metadata,
      })
      .select("id")
      .single();

    if (passageError || !passageRow) {
      return {
        ok: false,
        error: passageError?.message ?? "Failed to create passage",
      };
    }

    const passageId = passageRow.id as string;
    passageIds.push(passageId);

    for (const question of bundle.questions) {
      const { data: questionRow, error: questionError } = await supabase
        .from("naesin_reading_questions")
        .insert({
          passage_id: passageId,
          set_id: setId,
          order_index: question.orderIndex,
          number_label: question.numberLabel,
          type: question.type,
          stem: question.stem,
          prompt_ko: question.promptKo ?? null,
          answer_key: question.answer,
          explanation: question.explanation ?? null,
          skill_tags: question.skillTags,
          vocab_tags: question.vocabTags,
          grammar_tags: question.grammarTags,
          logic_tags: question.logicTags,
          difficulty: question.difficulty ?? null,
          score: question.score,
          metadata: question.metadata,
        })
        .select("id")
        .single();

      if (questionError || !questionRow) {
        return {
          ok: false,
          error: questionError?.message ?? "Failed to create question",
        };
      }

      const questionId = questionRow.id as string;
      questionIds.push(questionId);

      if (question.choices?.length) {
        const choiceRows = question.choices.map((choice, index) => ({
          question_id: questionId,
          order_index: index,
          label: choice.label,
          text: choice.text,
          is_correct:
            question.answer.kind === "single_choice"
              ? choice.id === question.answer.choiceId
              : question.answer.kind === "multi_choice"
                ? question.answer.choiceIds.includes(choice.id)
                : null,
        }));

        const { data: insertedChoices, error: choiceError } = await supabase
          .from("naesin_reading_choices")
          .insert(choiceRows)
          .select("id, order_index");

        if (choiceError) {
          return { ok: false, error: choiceError.message };
        }

        if (insertedChoices?.length) {
          choiceIds.push(...insertedChoices.map((row) => row.id as string));

          const remappedAnswerKey = remapChoiceAnswerKeyToDbIds({
            answerKey: question.answer,
            inputChoices: question.choices,
            insertedChoices: insertedChoices.map((row) => ({
              id: row.id as string,
              order_index: Number(row.order_index),
            })),
          });

          const { error: updateAnswerKeyError } = await supabase
            .from("naesin_reading_questions")
            .update({
              answer_key: remappedAnswerKey,
            })
            .eq("id", questionId);

          if (updateAnswerKeyError) {
            return { ok: false, error: updateAnswerKeyError.message };
          }
        }
      }

      if (question.evidence.length) {
        const evidenceRows = question.evidence.map((item, index) => ({
          question_id: questionId,
          order_index: Number(item.orderIndex ?? index),
          type: item.type,
          quote: item.quote ?? null,
          start_offset: item.startOffset ?? null,
          end_offset: item.endOffset ?? null,
          paragraph_label: item.paragraphLabel ?? null,
          note: item.note ?? null,
        }));

        const { data: insertedEvidence, error: evidenceError } = await supabase
          .from("naesin_reading_evidence")
          .insert(evidenceRows)
          .select("id");

        if (evidenceError) {
          return { ok: false, error: evidenceError.message };
        }

        if (insertedEvidence?.length) {
          evidenceIds.push(...insertedEvidence.map((row) => row.id as string));
        }
      }
    }
  }

  return {
    ok: true,
    setId,
    passageIds,
    questionIds,
    choiceIds,
    evidenceIds,
  };
}

function remapChoiceAnswerKeyToDbIds(params: {
  answerKey: NReadingAnswerKey;
  inputChoices: Array<{ id: string }>;
  insertedChoices: Array<{ id: string; order_index: number }>;
}): NReadingAnswerKey {
  const { answerKey, inputChoices, insertedChoices } = params;

  const sourceIdToDbId = new Map<string, string>();

  for (const row of insertedChoices) {
    const inputChoice = inputChoices[row.order_index];
    if (inputChoice?.id) {
      sourceIdToDbId.set(inputChoice.id, row.id);
    }
  }

  switch (answerKey.kind) {
    case "single_choice": {
      const dbChoiceId = sourceIdToDbId.get(answerKey.choiceId);
      if (!dbChoiceId) {
        throw new Error(
          `Failed to remap single_choice answer key: ${answerKey.choiceId}`,
        );
      }

      return {
        kind: "single_choice",
        choiceId: dbChoiceId,
      };
    }

    case "multi_choice": {
      const dbChoiceIds = answerKey.choiceIds.map((choiceId) => {
        const mapped = sourceIdToDbId.get(choiceId);
        if (!mapped) {
          throw new Error(
            `Failed to remap multi_choice answer key: ${choiceId}`,
          );
        }
        return mapped;
      });

      return {
        kind: "multi_choice",
        choiceIds: dbChoiceIds,
      };
    }

    case "short_text":
    case "ordered":
    case "mapping":
      return answerKey;

    default: {
      const _never: never = answerKey;
      return _never;
    }
  }
}

function revalidateNaesinPaths(setId: string) {
  revalidatePath("/admin/content");
  revalidatePath("/admin/content/list");
  revalidatePath("/admin/content/new");
  revalidatePath("/admin/content/new/json");
  revalidatePath(`/admin/content/new/json?setId=${setId}`);
  revalidatePath("/admin/content/reading/editor");
}
