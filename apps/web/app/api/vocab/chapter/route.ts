import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !serviceKey) {
    throw new Error("Supabase env missing");
  }

  return createClient(url, serviceKey);
}

/**
 * GET /api/vocab/chapter?chapterId=...
 * 특정 chapter의 모든 단어를 반환
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get("chapterId");

    if (!chapterId) {
      return NextResponse.json(
        { ok: false, error: "Missing chapterId" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Step 1: Get word IDs from vocab_set_items
    const { data: vocabItems, error: itemsError } = await supabase
      .from("vocab_set_items")
      .select("word_id")
      .eq("set_id", chapterId);

    if (itemsError) throw itemsError;

    const wordIds = (vocabItems ?? []).map((item: any) => item.word_id).filter(Boolean);

    if (wordIds.length === 0) {
      return NextResponse.json({
        ok: true,
        words: [],
      });
    }

    // Step 2: Get words from words table
    const { data: wordData, error: wordError } = await supabase
      .from("words")
      .select("id, text, lemma")
      .in("id", wordIds);

    if (wordError) throw wordError;

    const words = (wordData ?? []).map((w: any) => ({
      id: w.id,
      word: w.text ?? w.lemma ?? "",
      meaning: "",
      pos: undefined,
      example: undefined,
    }));

    return NextResponse.json({
      ok: true,
      words,
    });
  } catch (e: any) {
    console.error("[/api/vocab/chapter] GET error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
