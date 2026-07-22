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

/**
 * Fetch all words with meanings from database
 */
export async function fetchAllWordsForValidation() {
  try {
    const supabase = createServiceRoleClient();

    const { data: words, error } = await supabase
      .from("words")
      .select("id, text, meanings_ko")
      .order("text", { ascending: true });

    if (error) throw error;

    return {
      ok: true as const,
      words: (words ?? []) as WordWithMeaning[],
    };
  } catch (e: any) {
    console.error("[fetchAllWordsForValidation] error:", e);
    return {
      ok: false as const,
      error: e?.message ?? String(e),
      words: [] as WordWithMeaning[],
    };
  }
}
