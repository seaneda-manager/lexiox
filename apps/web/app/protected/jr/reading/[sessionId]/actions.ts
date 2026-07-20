"use server";

import { getServiceSupabase } from "@/lib/supabase/service";

export async function updateSessionProgressAction(
  sessionId: string,
  progress: {
    stage: string;
    sentenceIndex: number;
  }
) {
  try {
    const supabase = getServiceSupabase();
    await supabase
      .from("jr_reading_sessions")
      .update({
        stage: progress.stage,
        current_sentence_index: progress.sentenceIndex,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
    return { ok: true };
  } catch (e: any) {
    console.error("Failed to update session progress:", e);
    return { ok: false, error: e?.message };
  }
}

export async function completeSessionAction(sessionId: string) {
  try {
    const supabase = getServiceSupabase();
    await supabase
      .from("jr_reading_sessions")
      .update({
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
    return { ok: true };
  } catch (e: any) {
    console.error("Failed to complete session:", e);
    return { ok: false, error: e?.message };
  }
}

export async function saveVocabularyLogAction(
  sessionId: string,
  log: {
    sentenceIndex: number;
    wordId?: string;
    wordText: string;
    pos: string;
    meaning: string;
    interpretationTip: string;
  }
) {
  try {
    const supabase = getServiceSupabase();
    await supabase
      .from("jr_reading_vocab_logs")
      .insert([
        {
          session_id: sessionId,
          sentence_index: log.sentenceIndex,
          word_id: log.wordId,
          word_text: log.wordText,
          pos: log.pos,
          meaning: log.meaning,
          interpretation_tip: log.interpretationTip,
        },
      ]);
    return { ok: true };
  } catch (e: any) {
    console.error("Failed to save vocabulary log:", e);
    return { ok: false, error: e?.message };
  }
}

export async function saveGrammarLogAction(
  sessionId: string,
  log: {
    sentenceIndex: number;
    structureType: string;
    structureText: string;
    explanation: string;
  }
) {
  try {
    const supabase = getServiceSupabase();
    await supabase
      .from("jr_reading_grammar_logs")
      .insert([
        {
          session_id: sessionId,
          sentence_index: log.sentenceIndex,
          structure_type: log.structureType,
          structure_text: log.structureText,
          explanation: log.explanation,
          completed_at: new Date().toISOString(),
        },
      ]);
    return { ok: true };
  } catch (e: any) {
    console.error("Failed to save grammar log:", e);
    return { ok: false, error: e?.message };
  }
}

export async function saveTranslationLogAction(
  sessionId: string,
  log: {
    sentenceIndex: number;
    thoughtUnit: string;
    directTranslation: string;
    interpretation: string;
    interpretationType: "direct" | "direct_and_interpretation";
  }
) {
  try {
    const supabase = getServiceSupabase();
    await supabase
      .from("jr_reading_translation_logs")
      .insert([
        {
          session_id: sessionId,
          sentence_index: log.sentenceIndex,
          thought_unit: log.thoughtUnit,
          direct_translation: log.directTranslation,
          interpretation: log.interpretation,
          interpretation_type: log.interpretationType,
          completed_at: new Date().toISOString(),
        },
      ]);
    return { ok: true };
  } catch (e: any) {
    console.error("Failed to save translation log:", e);
    return { ok: false, error: e?.message };
  }
}

export async function saveComprehensionLogAction(
  sessionId: string,
  log: {
    problemId: string;
    problemType: string;
    studentAnswer: string;
    isCorrect: boolean;
    isHomework: boolean;
  }
) {
  try {
    const supabase = getServiceSupabase();
    await supabase
      .from("jr_reading_comprehension_logs")
      .insert([
        {
          session_id: sessionId,
          problem_id: log.problemId,
          problem_type: log.problemType,
          student_answer: log.studentAnswer,
          is_correct: log.isCorrect,
          is_homework: log.isHomework,
          attempted_at: new Date().toISOString(),
        },
      ]);
    return { ok: true };
  } catch (e: any) {
    console.error("Failed to save comprehension log:", e);
    return { ok: false, error: e?.message };
  }
}

export async function saveDiscussionLogAction(
  sessionId: string,
  log: {
    question: string;
    writtenAnswer: string;
    spokenAnswerUrl?: string;
  }
) {
  try {
    const supabase = getServiceSupabase();
    await supabase
      .from("jr_reading_discussion_logs")
      .insert([
        {
          session_id: sessionId,
          question: log.question,
          written_answer: log.writtenAnswer,
          spoken_answer_url: log.spokenAnswerUrl,
          completed_at: new Date().toISOString(),
        },
      ]);
    return { ok: true };
  } catch (e: any) {
    console.error("Failed to save discussion log:", e);
    return { ok: false, error: e?.message };
  }
}
