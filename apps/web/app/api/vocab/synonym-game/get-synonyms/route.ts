import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

interface SynonymData {
  id: string;
  text: string;
  pos: string | null;
  difficulty: number | null;
}

/**
 * DB의 word_synonyms 테이블에서 동의어 조회
 * GET /api/vocab/synonym-game/get-synonyms?wordId=xxx&limit=10
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wordId = searchParams.get("wordId");
    const limit = searchParams.get("limit") || "10";

    if (!wordId) {
      return NextResponse.json(
        { error: "wordId parameter required" },
        { status: 400 }
      );
    }

    // Service Role Client (RLS 우회)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    // 동의어 조회 (tier 1만 - 정확한 동의어)
    const { data: synonymData, error } = await supabase
      .from("word_synonyms")
      .select(
        `
        synonym_word_id,
        words!word_synonyms_synonym_word_id_fkey(
          id, text, pos, difficulty
        )
      `
      )
      .eq("word_id", wordId)
      .eq("tier", 1)
      .limit(parseInt(limit));

    if (error) {
      console.error("DB error:", error);
      return NextResponse.json(
        { error: "Failed to fetch synonyms" },
        { status: 500 }
      );
    }

    const synonyms: SynonymData[] = synonymData
      .filter(item => item.words)
      .map((item) => ({
        id: item.words.id,
        text: item.words.text,
        pos: item.words.pos,
        difficulty: item.words.difficulty,
      }));

    return NextResponse.json({
      wordId,
      synonymCount: synonyms.length,
      synonyms,
    });
  } catch (error) {
    console.error("Error fetching synonyms:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
