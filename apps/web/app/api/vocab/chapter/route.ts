import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function createAuthedServerClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!url || !anon) {
    throw new Error("Supabase env missing");
  }

  return createServerClient(url, anon, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name, options) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
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

    const supabase = await createAuthedServerClient();

    // vocab_sets에서 해당 set의 모든 items(단어들) 조회
    const { data: vocabItems, error: itemsError } = await supabase
      .from("vocab_set_items")
      .select("word_id, words(id, base_word, meaning_en, base_pos, example_sentence)")
      .eq("set_id", chapterId)
      .order("order_index", { ascending: true });

    if (itemsError) throw itemsError;

    const words = (vocabItems ?? []).map((item: any) => ({
      id: item.word_id,
      word: item.words?.base_word ?? "",
      meaning: item.words?.meaning_en ?? "",
      pos: item.words?.base_pos ?? undefined,
      example: item.words?.example_sentence ?? undefined,
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
