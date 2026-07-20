// apps/web/app/(protected)/admin/vocab/import/wiseword-actions.ts
"use server";

import { createClient } from "@supabase/supabase-js";

export type ImportWisewordWordsAndCreateSetFromJsonTextInput = {
  slug: string;
  title?: string | null;
  description?: string | null;
  track_id?: string | null;
  jsonText: string;
};

export type ImportWisewordWordsFromJsonTextInput = {
  jsonText: string;
};

export type ImportWisewordCsvActionResult =
  | {
      ok: true;
      setId?: string | null;
      insertedWords: number;
      existingWords: number;
      insertedSetItems?: number;
      totalRows: number;
      skippedRows: number;
      errors: string[];
      diag: any;
    }
  | {
      ok: false;
      error: string;
      errors?: string[];
      diag?: any;
    };

function cleanStr(v: unknown): string {
  return String(v ?? "").trim();
}

function toErrMsg(e: any): string {
  return cleanStr(e?.message ?? e?.error_description ?? e?.hint ?? e ?? "unknown error");
}

function splitToArr(v: any): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((x) => cleanStr(x)).filter(Boolean);
  const s = cleanStr(v);
  if (!s) return [];
  return s
    .split(/\s*(?:\/|,|;|\||·|\n)\s*/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseJsonRows(jsonText: string): any[] {
  const raw = cleanStr(jsonText);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") return [parsed];
  return [];
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseCsvRows(csvText: string): any[] {
  const lines = cleanStr(csvText).split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
  );
  if (!headers.length || !headers[0]) return [];
  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const values = parseCsvLine(line);
    const row: any = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }
  return rows;
}

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
  if (!service) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY (admin import requires service role)");
  return createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
}

type WordInsert = {
  text: string;
  lemma?: string | null;
  pos?: string | null;
  meanings_ko?: string[] | null;
  meanings_en_simple?: string[] | null;
  examples_easy?: any;
  examples_normal?: any;
  synonyms_en_simple?: string[] | null;
  notes?: string | null;
  collocations?: any;
};

function normalizeWordRow(r: any): WordInsert | null {
  const text = cleanStr(r?.text ?? r?.word ?? r?.term ?? "");
  if (!text) return null;

  const lemma = cleanStr(r?.lemma ?? "") || null;
  const pos = cleanStr(r?.pos ?? r?.base_pos ?? "") || null;

  const meanings_ko = splitToArr(r?.meanings_ko ?? r?.meaning_ko ?? r?.ko ?? r?.meaningsKo);
  const meanings_en_simple = splitToArr(r?.meanings_en_simple ?? r?.meaning_en ?? r?.en ?? r?.meaningsEn);

  const synonyms_en_simple = splitToArr(r?.synonyms_en_simple ?? r?.synonyms ?? r?.syns);

  const examples_easy = r?.examples_easy ?? r?.example_en ?? r?.example ?? null;
  const examples_normal = r?.examples_normal ?? null;

  const notes = cleanStr(r?.notes ?? "") || null;

  // collocations: keep as-is if it looks like JSON array/object, else null
  let collocations: any = null;
  const c = r?.collocations;
  if (c && typeof c === "object") collocations = c;
  if (typeof c === "string") {
    const s = c.trim();
    if (s.startsWith("[") || s.startsWith("{")) {
      try {
        collocations = JSON.parse(s);
      } catch {
        collocations = null;
      }
    }
  }

  return {
    text,
    lemma,
    pos,
    meanings_ko: meanings_ko.length ? meanings_ko : null,
    meanings_en_simple: meanings_en_simple.length ? meanings_en_simple : null,
    examples_easy,
    examples_normal,
    synonyms_en_simple: synonyms_en_simple.length ? synonyms_en_simple : null,
    notes,
    collocations,
  };
}

function chunk<T>(arr: T[], n: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function ensureWords(admin: any, rows: any[]) {
  const errors: string[] = [];
  const normalized: WordInsert[] = [];
  let skippedRows = 0;

  for (const r of rows) {
    const w = normalizeWordRow(r);
    if (!w) {
      skippedRows++;
      continue;
    }
    normalized.push(w);
  }

  const texts = Array.from(new Set(normalized.map((w) => w.text)));
  const textToId = new Map<string, string>();

  // 1) fetch existing
  for (const group of chunk(texts, 200)) {
    const { data, error } = await admin.from("words").select("id,text").in("text", group);
    if (error) {
      errors.push(`words select failed: ${toErrMsg(error)}`);
      continue;
    }
    for (const r of data ?? []) {
      if (r?.text && r?.id) textToId.set(String(r.text), String(r.id));
    }
  }
  const existingWords = textToId.size;

  // 2) insert missing
  const toInsert = normalized.filter((w) => !textToId.has(w.text));
  let insertedWords = 0;

  for (const group of chunk(toInsert, 200)) {
    if (group.length === 0) continue;
    const { error } = await admin.from("words").insert(group);
    if (error) {
      // tolerate duplicates/race: record and refetch
      errors.push(`words insert failed (tolerated): ${toErrMsg(error)}`);
    } else {
      insertedWords += group.length;
    }
  }

  // 3) refetch ids for all texts (to be sure)
  for (const group of chunk(texts, 200)) {
    const { data, error } = await admin.from("words").select("id,text").in("text", group);
    if (error) {
      errors.push(`words reselect failed: ${toErrMsg(error)}`);
      continue;
    }
    for (const r of data ?? []) {
      if (r?.text && r?.id) textToId.set(String(r.text), String(r.id));
    }
  }

  // 4) map back to ordered ids (keep input order, allow duplicates)
  const orderedWordIds: string[] = [];
  for (const w of normalized) {
    const id = textToId.get(w.text);
    if (id) orderedWordIds.push(id);
    else {
      skippedRows++;
      errors.push(`missing id after insert: ${w.text}`);
    }
  }

  return {
    orderedWordIds,
    insertedWords,
    existingWords,
    totalRows: rows.length,
    skippedRows,
    errors,
    diag: {
      uniqueTexts: texts.length,
      normalizedRows: normalized.length,
    },
  };
}

async function createOrGetSetId(admin: any, slug: string, title?: string | null, description?: string | null, track_id?: string | null) {
  // try select first
  const sel = await admin.from("vocab_sets").select("id,slug").eq("slug", slug).limit(1);
  if (!sel.error && Array.isArray(sel.data) && sel.data[0]?.id) {
    return String(sel.data[0].id);
  }

  // insert
  const ins = await admin
    .from("vocab_sets")
    .insert({
      slug,
      title: title ?? slug,
      description: description ?? null,
      track_id: track_id ?? null,
    })
    .select("id")
    .limit(1);

  if (!ins.error && Array.isArray(ins.data) && ins.data[0]?.id) {
    return String(ins.data[0].id);
  }

  // if insert failed (duplicate), retry select
  const sel2 = await admin.from("vocab_sets").select("id,slug").eq("slug", slug).limit(1);
  if (!sel2.error && Array.isArray(sel2.data) && sel2.data[0]?.id) {
    return String(sel2.data[0].id);
  }

  throw new Error(`createOrGetSetId failed: ${toErrMsg(ins.error ?? sel.error ?? sel2.error)}`);
}

export type ImportWisewordWordsFromCsvTextInput = { csvText: string };
export type ImportWisewordWordsAndCreateSetFromCsvTextInput = {
  slug: string;
  title?: string | null;
  description?: string | null;
  track_id?: string | null;
  csvText: string;
};

export async function importWisewordWordsFromCsvText(
  input: ImportWisewordWordsFromCsvTextInput,
): Promise<ImportWisewordCsvActionResult> {
  const diag: any = { kind: "CSV_WORDS_ONLY", steps: [] as any[] };
  try {
    const admin = getAdmin();
    const rows = parseCsvRows(input.csvText);
    diag.steps.push({ step: "parseCsv", rowCount: rows.length });
    const ensured = await ensureWords(admin, rows);
    diag.steps.push({ step: "ensureWords", ...ensured.diag });
    return {
      ok: true,
      insertedWords: ensured.insertedWords,
      existingWords: ensured.existingWords,
      totalRows: ensured.totalRows,
      skippedRows: ensured.skippedRows,
      errors: ensured.errors,
      diag,
    };
  } catch (e: any) {
    return { ok: false, error: toErrMsg(e), diag };
  }
}

export async function importWisewordWordsAndCreateSetFromCsvText(
  input: ImportWisewordWordsAndCreateSetFromCsvTextInput,
): Promise<ImportWisewordCsvActionResult> {
  const diag: any = { kind: "CSV_WORDS_AND_SET", steps: [] as any[] };
  try {
    const slug = cleanStr(input.slug);
    if (!slug) return { ok: false, error: "slug is required", diag };
    const admin = getAdmin();
    const rows = parseCsvRows(input.csvText);
    diag.steps.push({ step: "parseCsv", rowCount: rows.length });
    const ensured = await ensureWords(admin, rows);
    diag.steps.push({ step: "ensureWords", ...ensured.diag });
    const setId = await createOrGetSetId(admin, slug, input.title ?? null, input.description ?? null, input.track_id ?? null);
    diag.steps.push({ step: "setResolved", setId });
    const del = await admin.from("vocab_set_items").delete().eq("set_id", setId);
    diag.steps.push({ step: "deleteSetItems", ok: !del.error });
    const items = ensured.orderedWordIds.map((word_id, i) => ({ set_id: setId, word_id, sort: i + 1 }));
    let insertedSetItems = 0;
    for (const group of chunk(items, 200)) {
      const ins = await admin.from("vocab_set_items").insert(group);
      if (ins.error) ensured.errors.push(`set_items insert failed: ${toErrMsg(ins.error)}`);
      else insertedSetItems += group.length;
    }
    return {
      ok: true,
      setId,
      insertedWords: ensured.insertedWords,
      existingWords: ensured.existingWords,
      insertedSetItems,
      totalRows: ensured.totalRows,
      skippedRows: ensured.skippedRows,
      errors: ensured.errors,
      diag,
    };
  } catch (e: any) {
    return { ok: false, error: toErrMsg(e), diag };
  }
}

export async function importWisewordWordsFromJsonText(
  input: ImportWisewordWordsFromJsonTextInput,
): Promise<ImportWisewordCsvActionResult> {
  const diag: any = { kind: "WORDS_ONLY", steps: [] as any[] };
  try {
    const admin = getAdmin();
    const rows = parseJsonRows(input.jsonText);

    const ensured = await ensureWords(admin, rows);
    diag.steps.push({ step: "ensureWords", ...ensured.diag });

    return {
      ok: true,
      insertedWords: ensured.insertedWords,
      existingWords: ensured.existingWords,
      totalRows: ensured.totalRows,
      skippedRows: ensured.skippedRows,
      errors: ensured.errors,
      diag,
    };
  } catch (e: any) {
    return { ok: false, error: toErrMsg(e), diag };
  }
}

export async function importWisewordWordsAndCreateSetFromJsonText(
  input: ImportWisewordWordsAndCreateSetFromJsonTextInput,
): Promise<ImportWisewordCsvActionResult> {
  const diag: any = { kind: "WORDS_AND_SET", steps: [] as any[] };

  try {
    const slug = cleanStr(input.slug);
    if (!slug) return { ok: false, error: "slug is required", diag };

    const admin = getAdmin();
    const rows = parseJsonRows(input.jsonText);

    const ensured = await ensureWords(admin, rows);
    diag.steps.push({ step: "ensureWords", ...ensured.diag });

    const setId = await createOrGetSetId(admin, slug, input.title ?? null, input.description ?? null, input.track_id ?? null);
    diag.steps.push({ step: "setResolved", setId });

    // replace set items safely (avoid ON CONFLICT drama)
    const del = await admin.from("vocab_set_items").delete().eq("set_id", setId);
    diag.steps.push({ step: "deleteSetItems", ok: !del.error, err: del.error ? toErrMsg(del.error) : null });

    const items = ensured.orderedWordIds.map((word_id, i) => ({
      set_id: setId,
      word_id,
      sort: i + 1,
    }));

    let insertedSetItems = 0;
    for (const group of chunk(items, 200)) {
      const ins = await admin.from("vocab_set_items").insert(group);
      if (ins.error) {
        ensured.errors.push(`set_items insert failed: ${toErrMsg(ins.error)}`);
        diag.steps.push({ step: "insertSetItemsChunk", ok: false, err: toErrMsg(ins.error), n: group.length });
      } else {
        insertedSetItems += group.length;
        diag.steps.push({ step: "insertSetItemsChunk", ok: true, n: group.length });
      }
    }

    return {
      ok: true,
      setId,
      insertedWords: ensured.insertedWords,
      existingWords: ensured.existingWords,
      insertedSetItems,
      totalRows: ensured.totalRows,
      skippedRows: ensured.skippedRows,
      errors: ensured.errors,
      diag,
    };
  } catch (e: any) {
    return { ok: false, error: toErrMsg(e), diag };
  }
}
