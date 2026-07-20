// apps/web/app/(protected)/admin/vocab/sets/new/actions.ts
"use server";

import { getServerSupabase } from "@/lib/supabase/server";

function cleanStr(s: unknown): string {
  return String(s ?? "").trim();
}

function uniqKeepOrder(arr: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    const k = x.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

function isUuid(x: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
}

function chunkArr<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function getUserOrThrow(supabase: Awaited<ReturnType<typeof getServerSupabase>>) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Login required");
  return user;
}

async function trySelectWordsByColumn(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  col: string,
  values: string[],
) {
  // column이 없으면 42703로 떨어질 수 있음
  return await (supabase as any)
    .from("words")
    .select(`id, ${col}`)
    .in(col, values);
}

export async function createVocabSetFromRawAction(params: {
  title: string;
  description?: string | null;
  raw: string;
  strict?: boolean;
}): Promise<{ setId: string; missing: string[]; insertedCount: number }> {
  const supabase = await getServerSupabase();
  const user = await getUserOrThrow(supabase);

  const title = cleanStr(params.title);
  const description = cleanStr(params.description) || null;
  const strict = Boolean(params.strict ?? false);

  if (!title) throw new Error("title is required");

  const raw = cleanStr(params.raw);
  const tokens = uniqKeepOrder(
    raw
      .split(/\r?\n/g)
      .map((x) => cleanStr(x))
      .filter(Boolean),
  );

  if (tokens.length === 0) throw new Error("raw has no words");

  const uuidTokens = tokens.filter(isUuid);
  const textTokens = tokens.filter((t) => !isUuid(t));

  const idMap = new Map<string, string>(); // key(lower) -> word_id
  const missing: string[] = [];

  // (A) resolve UUID tokens
  if (uuidTokens.length) {
    for (const part of chunkArr(uuidTokens, 500)) {
      const r = await (supabase as any).from("words").select("id").in("id", part);
      if (r.error) throw new Error(`words lookup failed(by id): ${r.error.message ?? ""}`);
      for (const row of (r.data ?? []) as any[]) {
        const id = String(row?.id ?? "").trim();
        if (id) idMap.set(id.toLowerCase(), id);
      }
    }
  }

  // (B) resolve text tokens (try common columns)
  if (textTokens.length) {
    const colsToTry = ["lemma", "word", "text", "target"];
    let rows: any[] = [];

    for (const col of colsToTry) {
      try {
        rows = [];
        for (const part of chunkArr(textTokens, 500)) {
          const r = await trySelectWordsByColumn(supabase, col, part);
          const code = String((r.error as any)?.code ?? "");
          if (r.error) {
            // undefined column -> try next col
            if (code === "42703") throw Object.assign(new Error("NO_COL"), { _noCol: true });
            throw new Error(`words lookup failed(by ${col}): ${r.error.message ?? ""}`);
          }
          rows.push(...(r.data ?? []));
        }

        // success on this col
        for (const row of rows as any[]) {
          const id = String(row?.id ?? "").trim();
          const key = String(row?.[col] ?? "").trim().toLowerCase();
          if (id && key) idMap.set(key, id);
        }
        break;
      } catch (e: any) {
        if (e?._noCol) continue;
        throw e;
      }
    }

    // compute missing (text tokens)
    for (const t of textTokens) {
      const k = t.toLowerCase();
      if (!idMap.has(k)) missing.push(t);
    }
  }

  if (strict && missing.length) {
    throw new Error(`MISSING_WORDS: ${missing.slice(0, 20).join(", ")}${missing.length > 20 ? "..." : ""}`);
  }

  // (C) create vocab_set
  const { data: setRow, error: sErr } = await supabase
    .from("vocab_sets")
    .insert({ title, description } as any)
    .select("id")
    .single();

  if (sErr || !(setRow as any)?.id) {
    throw new Error(`vocab_sets insert failed: ${sErr?.message ?? ""}`);
  }

  const setId = String((setRow as any).id);

  // (D) insert items (preserve order)
  const foundWordIds: string[] = [];
  for (const t of tokens) {
    const k = isUuid(t) ? t.toLowerCase() : t.toLowerCase();
    const id = idMap.get(k);
    if (id) foundWordIds.push(id);
  }

  if (foundWordIds.length === 0) {
    // allow caller to delete empty set if they want
    return { setId, missing, insertedCount: 0 };
  }

  // first try with order_index (if column exists)
  const rowsWithOrder = foundWordIds.map((wid, idx) => ({
    set_id: setId,
    word_id: wid,
    order_index: idx + 1,
  }));

  for (const part of chunkArr(rowsWithOrder, 500)) {
    const r = await supabase.from("vocab_set_items").insert(part as any);
    if (!r.error) continue;

    const code = String((r.error as any)?.code ?? "");
    if (code === "42703") {
      // order_index column doesn't exist -> retry without it
      const rowsNoOrder = part.map((x: any) => ({ set_id: x.set_id, word_id: x.word_id }));
      const r2 = await supabase.from("vocab_set_items").insert(rowsNoOrder as any);
      if (r2.error) throw new Error(`vocab_set_items insert failed: ${r2.error.message ?? ""}`);
      continue;
    }

    throw new Error(`vocab_set_items insert failed: ${r.error.message ?? ""}`);
  }

  return { setId, missing, insertedCount: foundWordIds.length };
}
