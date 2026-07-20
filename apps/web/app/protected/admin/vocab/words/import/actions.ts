// apps/web/app/(protected)/admin/vocab/words/import/actions.ts
"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { parseRawToWordEntries } from "@/lib/vocab/parseRawWords";

function cleanStr(s: unknown): string {
  return String(s ?? "").trim();
}
function normText(s: string): string {
  return cleanStr(s).toLowerCase();
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function isEmptyJsonArray(v: any): boolean {
  if (!v) return true;
  if (Array.isArray(v)) return v.length === 0;
  try {
    if (typeof v === "string") {
      const t = v.trim();
      if (!t) return true;
      const parsed = JSON.parse(t);
      return Array.isArray(parsed) ? parsed.length === 0 : false;
    }
  } catch {}
  return false;
}

function asArrayOrEmpty(v: any): any[] {
  return Array.isArray(v) ? v : [];
}

function asArrayOrParsed(v: any): any[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return [];
    try {
      const parsed = JSON.parse(t);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function coerceSynonyms(v: any): string {
  if (Array.isArray(v)) return v.map((x) => cleanStr(x)).filter(Boolean).join("; ");
  return cleanStr(v);
}

type WordEntryLike = {
  text: string;
  meanings_ko?: any[];
  meanings_en_simple?: any[];
  examples_easy?: any[];
  examples_normal?: any[];
  derived_terms?: any[];
  difficulty?: any;
  frequency_score?: any;
  synonyms_en_simple?: any;
};

function normalizeJsonEntries(json: any): WordEntryLike[] {
  const base: any[] =
    Array.isArray(json)
      ? json
      : Array.isArray(json?.items)
        ? json.items
        : Array.isArray(json?.words)
          ? json.words
          : Array.isArray(json?.data)
            ? json.data
            : [];

  const out: WordEntryLike[] = [];
  for (const raw of base) {
    if (!raw) continue;

    const text = cleanStr(
      raw.text ?? raw.word ?? raw.lemma ?? raw.target ?? raw.term ?? raw.value
    );
    if (!text) continue;

    out.push({
      text,
      meanings_ko: asArrayOrParsed(
        raw.meanings_ko ?? raw.meaningsKo ?? raw.ko ?? raw.korean_meanings
      ),
      meanings_en_simple: asArrayOrParsed(
        raw.meanings_en_simple ?? raw.meaningsEnSimple ?? raw.en ?? raw.english_meanings
      ),
      examples_easy: asArrayOrParsed(raw.examples_easy ?? raw.examplesEasy ?? raw.examples),
      examples_normal: asArrayOrParsed(raw.examples_normal ?? raw.examplesNormal),
      derived_terms: asArrayOrParsed(raw.derived_terms ?? raw.derivedTerms),
      difficulty: raw.difficulty ?? null,
      frequency_score: raw.frequency_score ?? raw.frequencyScore ?? null,
      synonyms_en_simple: raw.synonyms_en_simple ?? raw.synonymsEnSimple ?? raw.synonyms ?? null,
    });
  }
  return out;
}

async function runImport(params: {
  entries: WordEntryLike[];
  sourceLabel?: string | null;
  note?: string | null;
  maxItems?: number;
  clearExisting?: boolean;
}) {
  const supabase = await getServerSupabase();

  const sourceLabel = params.sourceLabel ?? null;
  const note = params.note ?? null;
  const maxItems = Math.min(Math.max(params.maxItems ?? 500, 1), 5000);
  const clearExisting = params.clearExisting ?? false;

  // ✅ 기존 데이터 삭제 (sourceLabel 기반)
  if (clearExisting && sourceLabel) {
    console.log(`🗑️ Clearing existing words with sourceLabel: ${sourceLabel}`);
    const { error: deleteErr } = await supabase
      .from("words")
      .delete()
      .like("notes", `import:${sourceLabel}%`);

    if (deleteErr) {
      console.error("기존 단어 삭제 실패:", deleteErr);
      throw new Error(`기존 단어 삭제 실패: ${deleteErr.message}`);
    }
  }

  const entriesAll = params.entries ?? [];
  const entries = entriesAll.slice(0, maxItems);

  const {
    data: { user },
    error: uerr,
  } = await supabase.auth.getUser();
  if (uerr || !user) throw new Error("로그인이 필요합니다.");

  const { data: batch, error: berr } = await supabase
    .from("vocab_import_batches")
    .insert({
      created_by: user.id,
      source_label: sourceLabel,
      total_lines: entries.length,
      note,
    })
    .select("id")
    .single();

  if (berr || !batch?.id) {
    console.error(berr);
    throw new Error("import batch 생성 실패");
  }

  const batchId: string = String(batch.id);

  if (entries.length === 0) {
    await supabase
      .from("vocab_import_batches")
      .update({ inserted_count: 0, skipped_count: 0 })
      .eq("id", batchId);

    return {
      ok: true,
      batchId,
      total: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      insertedIds: [] as string[],
      updatedIds: [] as string[],
    };
  }

  const norms = entries.map((e) => normText(e.text)).filter(Boolean);

  type ExistingWordRow = {
    id: string;
    text_norm: string;
    meanings_ko: any;
    meanings_en_simple: any;
    examples_easy: any;
    examples_normal: any;
    derived_terms: any;
    synonyms_en_simple: any;
    notes: string | null;
  };

  const existingByNorm = new Map<string, ExistingWordRow>();

  for (const part of chunk(Array.from(new Set(norms)), 200)) {
    const { data: existingRows, error: exerr } = await supabase
      .from("words")
      .select(
        "id, text_norm, meanings_ko, meanings_en_simple, examples_easy, examples_normal, derived_terms, synonyms_en_simple, notes"
      )
      .in("text_norm", part);

    if (exerr) {
      console.error(exerr);
      throw new Error("기존 단어 조회 실패");
    }

    for (const r of (existingRows ?? []) as any[]) {
      const tn = String(r.text_norm ?? "");
      if (!tn) continue;
      existingByNorm.set(tn, {
        id: String(r.id),
        text_norm: tn,
        meanings_ko: r.meanings_ko,
        meanings_en_simple: r.meanings_en_simple,
        examples_easy: r.examples_easy,
        examples_normal: r.examples_normal,
        derived_terms: r.derived_terms,
        synonyms_en_simple: r.synonyms_en_simple,
        notes: (r.notes ?? null) as any,
      });
    }
  }

  const insertedIds: string[] = [];
  const updatedIds: string[] = [];

  let skipped = 0;
  let updated = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const text = cleanStr(entry.text);
    const text_norm = normText(text);

    if (!text_norm) {
      skipped++;
      continue;
    }

    const safeNotes =
      (sourceLabel ? `import:${sourceLabel}` : "import") + (note ? ` | ${note}` : "");

    const existing = existingByNorm.get(text_norm);

    if (existing) {
      const patch: Record<string, any> = {};

      const incomingKo = asArrayOrEmpty((entry as any).meanings_ko);
      if (isEmptyJsonArray(existing.meanings_ko) && incomingKo.length > 0) {
        patch.meanings_ko = incomingKo;
      }

      const incomingEn = asArrayOrEmpty((entry as any).meanings_en_simple);
      if (isEmptyJsonArray(existing.meanings_en_simple) && incomingEn.length > 0) {
        patch.meanings_en_simple = incomingEn;
      }

      const incomingEasy = asArrayOrEmpty((entry as any).examples_easy);
      if (isEmptyJsonArray(existing.examples_easy) && incomingEasy.length > 0) {
        patch.examples_easy = incomingEasy;
      }

      const incomingNormal = asArrayOrEmpty((entry as any).examples_normal);
      if (isEmptyJsonArray(existing.examples_normal) && incomingNormal.length > 0) {
        patch.examples_normal = incomingNormal;
      }

      const incomingDerived = asArrayOrEmpty((entry as any).derived_terms);
      if (isEmptyJsonArray(existing.derived_terms) && incomingDerived.length > 0) {
        patch.derived_terms = incomingDerived;
      }

      const incomingSyn = coerceSynonyms((entry as any).synonyms_en_simple);
      if (
        (!existing.synonyms_en_simple || String(existing.synonyms_en_simple).trim() === "") &&
        incomingSyn
      ) {
        patch.synonyms_en_simple = incomingSyn;
      }

      if (!existing.notes || !String(existing.notes).trim()) {
        patch.notes = safeNotes;
      }

      if (Object.keys(patch).length > 0) {
        const { error: uperr } = await supabase.from("words").update(patch).eq("id", existing.id);
        if (!uperr) {
          updated++;
          updatedIds.push(existing.id);
          existingByNorm.set(text_norm, { ...existing, ...patch } as any);
        }
      }

      skipped++;
      continue;
    }

    const { data: inserted, error: ierr } = await supabase
      .from("words")
      .insert({
        text,
        lemma: text,
        pos: "other",
        is_function_word: false,

        meanings_ko: asArrayOrEmpty((entry as any).meanings_ko),
        meanings_en_simple: asArrayOrEmpty((entry as any).meanings_en_simple),

        examples_easy: asArrayOrEmpty((entry as any).examples_easy),
        examples_normal: asArrayOrEmpty((entry as any).examples_normal),
        derived_terms: asArrayOrEmpty((entry as any).derived_terms),

        difficulty: (entry as any).difficulty ?? null,
        frequency_score: (entry as any).frequency_score ?? null,
        synonyms_en_simple: coerceSynonyms((entry as any).synonyms_en_simple) || null,
        notes: safeNotes,
      })
      .select("id, text_norm")
      .single();

    if (ierr || !inserted?.id) {
      skipped++;
      continue;
    }

    const wordId = String((inserted as any).id);
    insertedIds.push(wordId);

    const { error: logErr } = await supabase.from("vocab_import_batch_items").insert({
      batch_id: batchId,
      word_id: wordId,
      text_norm,
    });

    if (logErr) {
      console.error(logErr);
      throw new Error("import log 저장 실패 (vocab_import_batch_items)");
    }

    existingByNorm.set(text_norm, {
      id: wordId,
      text_norm,
      meanings_ko: asArrayOrEmpty((entry as any).meanings_ko),
      meanings_en_simple: asArrayOrEmpty((entry as any).meanings_en_simple),
      examples_easy: asArrayOrEmpty((entry as any).examples_easy),
      examples_normal: asArrayOrEmpty((entry as any).examples_normal),
      derived_terms: asArrayOrEmpty((entry as any).derived_terms),
      synonyms_en_simple: coerceSynonyms((entry as any).synonyms_en_simple) || null,
      notes: safeNotes,
    } as any);
  }

  const inserted = insertedIds.length;

  await supabase
    .from("vocab_import_batches")
    .update({ inserted_count: inserted, skipped_count: skipped })
    .eq("id", batchId);

  return {
    ok: true,
    batchId,
    total: entries.length,
    inserted,
    updated,
    skipped,
    insertedIds,
    updatedIds,
  };
}

export async function importVocabWordsListAction(params: {
  raw: string;
  sourceLabel?: string | null;
  note?: string | null;
  maxItems?: number;
}) {
  const raw = String(params.raw ?? "");
  const entriesAll = parseRawToWordEntries(raw) as any[];
  const entries = entriesAll.map((e: any) => ({
    text: cleanStr(e?.text ?? e?.word ?? e?.lemma ?? ""),
    meanings_ko: asArrayOrEmpty(e?.meanings_ko),
    meanings_en_simple: asArrayOrEmpty(e?.meanings_en_simple),
    examples_easy: asArrayOrEmpty(e?.examples_easy),
    examples_normal: asArrayOrEmpty(e?.examples_normal),
    derived_terms: asArrayOrEmpty(e?.derived_terms),
    difficulty: e?.difficulty ?? null,
    frequency_score: e?.frequency_score ?? null,
    synonyms_en_simple: e?.synonyms_en_simple ?? null,
  })) as WordEntryLike[];

  return runImport({
    entries,
    sourceLabel: params.sourceLabel ?? null,
    note: params.note ?? null,
    maxItems: params.maxItems,
  });
}

/**
 * ✅ Server Action for <form action=...>
 * canonical keys:
 * - file, json, raw, sourceLabel, note, maxItems
 * accepts legacy:
 * - jsonText, source_label, max_items, payload, data
 */
export async function importWordsFromJsonForm(...args: any[]) {
  const formData: FormData | undefined =
    args?.[0] instanceof FormData
      ? (args[0] as FormData)
      : args?.[1] instanceof FormData
        ? (args[1] as FormData)
        : undefined;

  if (!formData) {
    throw new Error("Invalid form submission (missing FormData).");
  }

  const sourceLabel =
    cleanStr(formData.get("sourceLabel") ?? formData.get("source_label") ?? formData.get("label")) ||
    null;

  const note = cleanStr(formData.get("note")) || null;

  const maxItemsRaw = cleanStr(formData.get("maxItems") ?? formData.get("max_items") ?? formData.get("limit"));
  const maxItems = maxItemsRaw ? Number.parseInt(maxItemsRaw, 10) : undefined;

  const clearExistingRaw = cleanStr(formData.get("clearExisting") ?? formData.get("clear_existing") ?? "");
  const clearExisting = clearExistingRaw === "on" || clearExistingRaw === "true" || clearExistingRaw === "1";

  // 1) file upload (most reliable)
  const fileAny = formData.get("file") as any;
  if (fileAny && typeof fileAny.text === "function" && typeof fileAny.size === "number" && fileAny.size > 0) {
    const text = await fileAny.text();
    const parsed = JSON.parse(text);
    const entries = normalizeJsonEntries(parsed);
    return runImport({ entries, sourceLabel, note, maxItems, clearExisting });
  }

  // 2) json textarea
  const jsonText = cleanStr(
    formData.get("json") ??
      formData.get("jsonText") ?? // legacy from older page.tsx
      formData.get("payload") ??
      formData.get("data")
  );

  if (jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      const entries = normalizeJsonEntries(parsed);
      return runImport({ entries, sourceLabel, note, maxItems, clearExisting });
    } catch {
      return importVocabWordsListAction({
        raw: jsonText,
        sourceLabel,
        note,
        maxItems,
      });
    }
  }

  // 3) raw fallback
  const raw = cleanStr(formData.get("raw"));
  return importVocabWordsListAction({
    raw,
    sourceLabel,
    note,
    maxItems,
  });
}
