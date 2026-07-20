// apps/web/app/(protected)/admin/vocab/words/new/actions.ts
"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { WordCreatePayload, GradeBand } from "@/models/vocab/index";

type SourceItem = WordCreatePayload["sources"][number];
type HintItem = WordCreatePayload["grammarHints"][number];

function normText(s: string) {
  return s.trim().toLowerCase();
}

/**
 * Admin – 새 단어 생성 액션
 * words + word_grade_bands + word_sources + word_grammar_hints + word_semantic_tags
 */
export async function createWordAction(payload: WordCreatePayload) {
  const supabase = await getServerSupabase();

  // ✅ 0) 서버에서 "진짜 로그인 유저" 확인
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) throw new Error("Not authenticated");

  // ✅ 0-1) admin 체크 (profiles.role 기반)
  const { data: profile, error: perr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userRes.user.id)
    .single();

  if (perr) {
    console.error(perr);
    throw new Error("권한 확인 실패 (profiles)");
  }
  if (profile?.role !== "admin") {
    throw new Error("Not authorized");
  }

  // ✅ 1) 실 저장은 service role로 (RLS 우회)
  const svc = getServiceSupabase();

  const text = payload.text?.trim() ?? "";
  if (!text) throw new Error("text is required");
  if (!payload.pos) throw new Error("pos is required");

  // wordId는 실패 시 cleanup을 위해 바깥에 둠
  let wordId: string | null = null;

  try {
    // 1) words insert
    const { data: word, error: insertWordError } = await svc
      .from("words")
      .insert({
        text,
        lemma: payload.lemma || text,
        pos: payload.pos,
        is_function_word: payload.is_function_word,

        meanings_ko: payload.meanings_ko ?? [],
        meanings_en_simple: payload.meanings_en_simple ?? [],

        examples_easy: payload.examples_easy ?? [],
        examples_normal: payload.examples_normal ?? [],

        derived_terms: payload.derived_terms ?? [],

        difficulty: payload.difficulty,
        frequency_score: payload.frequency_score,
        notes: payload.notes,
      })
      .select("id")
      .single();

    if (insertWordError || !word) {
      console.error(insertWordError);
      throw new Error("단어 저장 중 오류 발생 (words)");
    }

    wordId = word.id as string;

    // 2) 학년대 (gradeBands → word_grade_bands)
    if (payload.gradeBands?.length) {
      const gradeItems = payload.gradeBands
        .filter(Boolean)
        .map((band: GradeBand) => ({
          word_id: wordId,
          grade: band,
        }));

      const { error } = await svc.from("word_grade_bands").insert(gradeItems);
      if (error) {
        console.error(error);
        throw new Error(`학년대 저장 오류 (word_grade_bands): ${error.message ?? "unknown"}`);
      }
    }

    // 3) 출처 (sources → word_sources)
    if (payload.sources?.length) {
      const sourceItems = payload.sources.map((s: SourceItem) => ({
        word_id: wordId,
        source_type: s.sourceType,
        source_label: s.sourceLabel,
        exam_year: s.examYear,
        exam_month: s.examMonth,
        exam_round: s.examRound,
        grade: s.grade,
      }));

      const { error } = await svc.from("word_sources").insert(sourceItems);
      if (error) {
        console.error(error);
        throw new Error(`출처 저장 오류 (word_sources): ${error.message ?? "unknown"}`);
      }
    }

    // 4) 문법 힌트 (grammarHints → word_grammar_hints)
    if (payload.grammarHints?.length) {
      const grammarItems = payload.grammarHints.map((g: HintItem) => ({
        word_id: wordId,
        grammar_category: g.grammarCategory,
        short_tip_ko: g.shortTipKo,
        short_tip_en: g.shortTipEn,
        wrong_example: g.wrongExample,
        right_example: g.rightExample,
        show_until_grade: g.showUntilGrade,
        sort_order: g.sortOrder ?? 0,
      }));

      const { error } = await svc.from("word_grammar_hints").insert(grammarItems);
      if (error) {
        console.error(error);
        throw new Error(
          `문법 힌트 저장 오류 (word_grammar_hints): ${error.message ?? "unknown"}`,
        );
      }
    }

    // 5) semantic 태그 (semanticTagIds → word_semantic_tags)
    if (payload.semanticTagIds?.length) {
      const tagItems = payload.semanticTagIds
        .filter(Boolean)
        .map((tagId: string) => ({
          word_id: wordId,
          tag_id: tagId,
        }));

      const { error } = await svc.from("word_semantic_tags").insert(tagItems);
      if (error) {
        console.error(error);
        throw new Error(`semantic 태그 저장 오류 (word_semantic_tags): ${error.message ?? "unknown"}`);
      }
    }

    return { success: true, id: wordId, text_norm: normText(text) };
  } catch (e) {
    // ✅ cleanup: words는 만들어졌는데 중간 테이블에서 터진 경우 고아 방지
    if (wordId) {
      try {
        await svc.from("word_grade_bands").delete().eq("word_id", wordId);
        await svc.from("word_sources").delete().eq("word_id", wordId);
        await svc.from("word_grammar_hints").delete().eq("word_id", wordId);
        await svc.from("word_semantic_tags").delete().eq("word_id", wordId);
        await svc.from("words").delete().eq("id", wordId);
      } catch (cleanupErr) {
        console.error("cleanup failed:", cleanupErr);
      }
    }
    throw e;
  }
}
