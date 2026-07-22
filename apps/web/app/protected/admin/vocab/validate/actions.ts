"use server";

import { createClient } from "@supabase/supabase-js";

function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !serviceKey) {
    throw new Error("Supabase env missing");
  }

  return createClient(url, serviceKey);
}

export type WordWithMeaning = {
  id: string;
  text: string;
  meanings_ko?: string;
};

export type VocabTrack = {
  id: string;
  title: string;
};

export type VocabSet = {
  id: string;
  title: string;
  order_index: number;
};

/**
 * Fetch all vocab tracks (courses)
 */
export async function fetchAllVocabTracks() {
  try {
    const supabase = createServiceRoleClient();

    const { data: tracks, error } = await supabase
      .from("vocab_tracks")
      .select("id, title")
      .order("title", { ascending: true });

    if (error) throw error;

    return {
      ok: true as const,
      tracks: (tracks ?? []) as VocabTrack[],
    };
  } catch (e: any) {
    console.error("[fetchAllVocabTracks] error:", e);
    return {
      ok: false as const,
      error: e?.message ?? String(e),
      tracks: [] as VocabTrack[],
    };
  }
}

/**
 * Fetch vocab sets (days) for a specific track
 */
export async function fetchVocabSetsByTrack(trackId: string) {
  try {
    const supabase = createServiceRoleClient();

    const { data: sets, error } = await supabase
      .from("vocab_sets")
      .select("id, title, order_index")
      .eq("track_id", trackId)
      .order("order_index", { ascending: true });

    if (error) throw error;

    return {
      ok: true as const,
      sets: (sets ?? []) as VocabSet[],
    };
  } catch (e: any) {
    console.error("[fetchVocabSetsByTrack] error:", e);
    return {
      ok: false as const,
      error: e?.message ?? String(e),
      sets: [] as VocabSet[],
    };
  }
}

/**
 * Fetch words for a specific vocab set
 */
export async function fetchWordsForVocabSet(setId: string) {
  try {
    const supabase = createServiceRoleClient();

    // Get word IDs from vocab_set_items
    const { data: items, error: itemsError } = await supabase
      .from("vocab_set_items")
      .select("word_id")
      .eq("set_id", setId);

    if (itemsError) throw itemsError;

    const wordIds = (items ?? []).map((item: any) => item.word_id).filter(Boolean);

    if (wordIds.length === 0) {
      return {
        ok: true as const,
        words: [] as WordWithMeaning[],
      };
    }

    // Get words from words table
    const { data: words, error: wordError } = await supabase
      .from("words")
      .select("id, text, meanings_ko")
      .in("id", wordIds);

    if (wordError) throw wordError;

    return {
      ok: true as const,
      words: (words ?? []) as WordWithMeaning[],
    };
  } catch (e: any) {
    console.error("[fetchWordsForVocabSet] error:", e);
    return {
      ok: false as const,
      error: e?.message ?? String(e),
      words: [] as WordWithMeaning[],
    };
  }
}
