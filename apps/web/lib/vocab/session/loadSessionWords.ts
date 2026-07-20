// apps/web/lib/vocab/session/loadSessionWords.ts
"use client";

import { createBrowserClient } from "@/lib/supabase/client";
import type { SessionWord, VocabExample, VocabCollocation } from "@/models/vocab/SessionWord";

type Params = {
  userId: string; // auth uid OR academy_students.id (tolerated) OR student_id(uuid)
  setId?: string | null; // optional: 이미 resolve 했으면 넘겨주기
};

function cleanStr(s: unknown): string {
  return String(s ?? "").trim();
}

/** local date (YYYY-MM-DD) */
function toISODateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function isUuidLike(s: string) {
  const t = cleanStr(s);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t);
}

function uniqKeepOrder(arr: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    const v = cleanStr(x);
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function pickWordId(row: any): string | null {
  return row?.word_id ?? row?.vocab_word_id ?? row?.vocab_item_id ?? row?.item_id ?? row?.wordId ?? null;
}

function isPlaceholderMeaning(s: string) {
  const t = cleanStr(s);
  if (!t) return true;
  const lowered = t.toLowerCase();
  return (
    t === "(뜻 미입력)" ||
    t === "뜻 미입력" ||
    t === "미입력" ||
    t === "없음" ||
    lowered === "n/a" ||
    lowered === "na" ||
    lowered === "none" ||
    lowered === "null" ||
    lowered === "undefined"
  );
}

function splitToArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v
      .map((x) => cleanStr(x))
      .filter(Boolean)
      .filter((x) => !isPlaceholderMeaning(x));
  }
  if (typeof v === "string") {
    const s = cleanStr(v);
    if (!s) return [];
    return s
      .split(/\s*(?:\/|,|;|\||·)\s*/g)
      .map((x) => cleanStr(x))
      .filter(Boolean)
      .filter((x) => !isPlaceholderMeaning(x));
  }
  return [];
}

/** ✅ examples are NOT meanings: allow commas inside sentence. */
function splitExamples(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => cleanStr(x)).filter(Boolean);
  if (typeof v === "string") {
    const s = cleanStr(v);
    if (!s) return [];
    const byNewline = s.split(/\r?\n+/).map((x) => cleanStr(x)).filter(Boolean);
    if (byNewline.length > 1) return byNewline;

    const byBar = s.split(/\s*\|\s*/g).map((x) => cleanStr(x)).filter(Boolean);
    if (byBar.length > 1) return byBar;

    const bySemi = s.split(/\s*;\s*/g).map((x) => cleanStr(x)).filter(Boolean);
    if (bySemi.length > 1) return bySemi;

    return [s];
  }
  return [];
}

function extractKoMeaningsFromRow(row: any): string[] {
  if (!row) return [];
  const candidates = [
    row.meanings_ko,
    row.meaning_ko,
    row.gloss_ko,
    row.definition_ko,
    row.definitions_ko,
    row.ko,
    row.korean,
    row.meaning,
  ];
  for (const c of candidates) {
    const arr = splitToArray(c);
    if (arr.length) return arr;
  }
  const nested = row.words ?? row.word ?? row.vocab_word ?? null;
  if (nested) return extractKoMeaningsFromRow(nested);
  return [];
}

function extractEnMeaningsFromRow(row: any): string[] {
  if (!row) return [];
  const candidates = [
    row.meanings_en_simple,
    row.meanings_en,
    row.meaning_en,
    row.gloss_en,
    row.definition_en,
    row.definitions_en,
    row.en,
    row.english,
  ];
  for (const c of candidates) {
    const arr = splitToArray(c);
    if (arr.length) return arr;
  }
  const nested = row.words ?? row.word ?? row.vocab_word ?? null;
  if (nested) return extractEnMeaningsFromRow(nested);
  return [];
}

function uniqKeepOrderStrings(arr: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    const v = cleanStr(x);
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

function uniqKeepOrderExamples(arr: VocabExample[]): VocabExample[] {
  const out: VocabExample[] = [];
  const seen = new Set<string>();
  for (const ex of arr) {
    const en = cleanStr(ex?.en);
    const ko = cleanStr(ex?.ko ?? "");
    if (!en) continue;
    const k = `${en.toLowerCase()}|${ko.toLowerCase()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ en, ko: ko || null });
  }
  return out;
}

function extractExamplesFromRow(row: any): VocabExample[] {
  if (!row) return [];

  const direct = row.examples ?? row.vocab_examples ?? null;
  if (Array.isArray(direct) && direct.length > 0) {
    const mapped = direct
      .map((x: any) => {
        const en = cleanStr(x?.en ?? x?.sentence_en ?? x?.example_en ?? x);
        const ko = cleanStr(x?.ko ?? x?.sentence_ko ?? x?.example_ko ?? "");
        if (!en) return null;
        return { en, ko: ko || null } as VocabExample;
      })
      .filter(Boolean) as VocabExample[];
    if (mapped.length) return uniqKeepOrderExamples(mapped);
  }

  const enCandidates = [row.examples_easy, row.examples_en, row.example_en, row.example, row.examples];
  const koCandidates = [row.examples_ko, row.example_ko];

  let ens: string[] = [];
  for (const c of enCandidates) {
    leading: {
      const arr = splitExamples(c);
      if (arr.length) {
        ens = arr;
        break leading;
      }
    }
  }

  let kos: string[] = [];
  for (const c of koCandidates) {
    leading2: {
      const arr = splitExamples(c);
      if (arr.length) {
        kos = arr;
        break leading2;
      }
    }
  }

  if (ens.length === 0) {
    const nested = row.words ?? row.word ?? row.vocab_word ?? null;
    if (nested) return extractExamplesFromRow(nested);
    return [];
  }

  ens = uniqKeepOrderStrings(ens);

  const out: VocabExample[] = [];
  for (let i = 0; i < ens.length; i++) {
    const en = cleanStr(ens[i]);
    if (!en) continue;
    const ko = kos[i] ? cleanStr(kos[i]) : "";
    out.push({ en, ko: ko || null });
  }
  return uniqKeepOrderExamples(out);
}

function extractSynonymsFromRow(row: any): string[] {
  if (!row) return [];
  const candidates = [
    row.synonyms_en_simple,
    row.synonyms,
    row.synonyms_en,
    row.synonym,
    row.synonym_en,
    row.thesaurus,
    row.thesaurus_en,
    row.similar_words,
    row.related_words,
  ];
  for (const c of candidates) {
    const arr = splitToArray(c);
    if (arr.length) return uniqKeepOrderStrings(arr);
  }
  const nested = row.words ?? row.word ?? row.vocab_word ?? null;
  if (nested) return extractSynonymsFromRow(nested);
  return [];
}

function extractAntonymsFromRow(row: any): string[] {
  if (!row) return [];
  const candidates = [
    row.antonyms_terms,
    row.antonyms,
    row.antonyms_en,
    row.antonym,
    row.antonym_en,
    row.opposites,
    row.opposite_words,
  ];
  for (const c of candidates) {
    const arr = splitToArray(c);
    if (arr.length) return uniqKeepOrderStrings(arr);
  }
  const nested = row.words ?? row.word ?? row.vocab_word ?? null;
  if (nested) return extractAntonymsFromRow(nested);
  return [];
}

/* ======================================================
 * Collocations
 * ==================================================== */

function hashId(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function splitCollocationPhrases(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => cleanStr(x)).filter(Boolean);
  if (typeof v === "string") {
    const s = cleanStr(v);
    if (!s) return [];
    const byNewline = s.split(/\r?\n+/).map(cleanStr).filter(Boolean);
    if (byNewline.length > 1) return byNewline;

    const bySemi = s.split(/\s*;\s*/g).map(cleanStr).filter(Boolean);
    if (bySemi.length > 1) return bySemi;

    return [s];
  }
  return [];
}

function uniqKeepOrderCollocations(arr: VocabCollocation[]): VocabCollocation[] {
  const out: VocabCollocation[] = [];
  const seen = new Set<string>();
  for (const c of arr ?? []) {
    const base = cleanStr(c?.base);
    const right = cleanStr(c?.right);
    if (!base || !right) continue;
    const k = `${base.toLowerCase()}|${right.toLowerCase()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({
      id: cleanStr(c?.id) || hashId(k),
      base,
      right,
      meaning_ko: c?.meaning_ko ?? null,
      source: c?.source ?? "db",
    });
  }
  return out;
}

function normalizeTokens(s: string): string[] {
  return cleanStr(s)
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/g)
    .map((x) => cleanStr(x))
    .filter(Boolean);
}

function stripArticles(s: string) {
  const t = cleanStr(s);
  if (!t) return "";
  return t.replace(/^(a|an|the)\s+/i, "").trim();
}

function extractCollocationsFromRow(row: any, baseWord: string): VocabCollocation[] {
  if (!row) return [];
  const base = cleanStr(baseWord);
  if (!base) return [];

  const direct = row.collocations ?? row.vocab_collocations ?? null;

  if (Array.isArray(direct) && direct.length > 0 && typeof direct[0] === "object") {
    const mapped = direct
      .map((x: any) => {
        if (!x) return null;
        const b = cleanStr(x.base ?? x.left ?? base);
        const r = cleanStr(x.right ?? x.collocate ?? x.phrase ?? "");
        if (!b || !r) return null;
        return {
          id: cleanStr(x.id) || hashId(`${b.toLowerCase()}|${r.toLowerCase()}`),
          base: b,
          right: r,
          meaning_ko: cleanStr(x.meaning_ko ?? x.meaningKo ?? "") || null,
          source: (x.source === "auto" ? "auto" : "db") as "db" | "auto",
        } as VocabCollocation;
      })
      .filter(Boolean) as VocabCollocation[];

    const uniq = uniqKeepOrderCollocations(mapped);
    if (uniq.length) return uniq;
  }

  if (direct && typeof direct === "object" && !Array.isArray(direct)) {
    const arr = (direct.pairs ?? direct.items ?? direct.list ?? null) as any;
    if (Array.isArray(arr) && arr.length > 0) {
      const mapped = arr
        .map((x: any) => {
          const b = cleanStr(x?.base ?? x?.left ?? base);
          const r = cleanStr(x?.right ?? x?.collocate ?? x?.phrase ?? "");
          if (!b || !r) return null;
          return {
            id: cleanStr(x?.id) || hashId(`${b.toLowerCase()}|${r.toLowerCase()}`),
            base: b,
            right: r,
            meaning_ko: cleanStr(x?.meaning_ko ?? "") || null,
            source: "db" as const,
          };
        })
        .filter(Boolean) as VocabCollocation[];
      const uniq = uniqKeepOrderCollocations(mapped);
      if (uniq.length) return uniq;
    }
  }

  const candidates = [row.collocations, row.collocations_en, row.collocation, row.collocation_en, row.phrases];

  let phrases: string[] = [];
  for (const c of candidates) {
    const arr = splitCollocationPhrases(c);
    if (arr.length) {
      phrases = arr;
      break;
    }
  }

  if (phrases.length === 0) {
    const nested = row.words ?? row.word ?? row.vocab_word ?? null;
    if (nested) return extractCollocationsFromRow(nested, baseWord);
    return [];
  }

  const out: VocabCollocation[] = [];
  const baseLower = base.toLowerCase();

  for (const raw of phrases) {
    const p = cleanStr(raw);
    if (!p) continue;

    if (p.includes("|")) {
      const parts = p.split("|").map(cleanStr).filter(Boolean);
      if (parts.length === 2) {
        const [a, b] = parts;
        if (a && b && a.toLowerCase() === baseLower) {
          out.push({ id: hashId(`${baseLower}|${b.toLowerCase()}`), base, right: stripArticles(b), source: "db" });
          continue;
        }
        if (a && b && b.toLowerCase() === baseLower) {
          out.push({ id: hashId(`${baseLower}|${a.toLowerCase()}`), base, right: stripArticles(a), source: "db" });
          continue;
        }
      }
    }

    const toks = normalizeTokens(p);
    const idx = toks.findIndex((t) => t.toLowerCase() === baseLower);
    if (idx < 0) continue;

    const left = toks.slice(0, idx).join(" ");
    const rightSide = toks.slice(idx + 1).join(" ");

    let right = rightSide ? rightSide : left;
    right = stripArticles(right);

    const rtoks = right.split(/\s+/g).filter(Boolean);
    if (rtoks.length > 3) right = rtoks.slice(0, 3).join(" ");
    if (!right) continue;

    out.push({ id: hashId(`${baseLower}|${right.toLowerCase()}`), base, right, source: "db" });
  }

  return uniqKeepOrderCollocations(out);
}

function sortLinkRows(rows: any[]): any[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    const ao =
      (typeof a?.sort_order === "number" ? a.sort_order : null) ??
      (typeof a?.order_no === "number" ? a.order_no : null) ??
      null;
    const bo =
      (typeof b?.sort_order === "number" ? b.sort_order : null) ??
      (typeof b?.order_no === "number" ? b.order_no : null) ??
      null;

    if (ao != null && bo != null) return ao - bo;
    if (ao != null) return -1;
    if (bo != null) return 1;

    const ac = String(a?.created_at ?? "");
    const bc = String(b?.created_at ?? "");
    if (ac && bc) return ac.localeCompare(bc);
    return 0;
  });
  return copy;
}

async function resolveStudentIdFromUserId(supabase: any, userId: string): Promise<string | null> {
  const key = cleanStr(userId);
  if (!key) return null;

  if (isUuidLike(key)) {
    try {
      const { data, error } = await supabase
        .from("student_vocab_assignments")
        .select("id")
        .eq("student_id", key)
        .limit(1);
      if (!error && (data?.length ?? 0) > 0) return key;
    } catch {
      // ignore
    }
  }

  try {
    const { data, error } = await supabase.from("academy_students").select("id").eq("id", key).maybeSingle();
    if (!error && data?.id) return String(data.id);
  } catch {}

  try {
    const { data, error } = await supabase.from("academy_students").select("id").eq("auth_user_id", key).maybeSingle();
    if (!error && data?.id) return String(data.id);
  } catch {}

  try {
    const { data, error } = await supabase.from("academy_students").select("id").eq("user_id", key).maybeSingle();
    if (!error && data?.id) return String(data.id);
  } catch {}

  try {
    const { data, error } = await supabase.from("academy_students").select("id").eq("profile_id", key).maybeSingle();
    if (!error && data?.id) return String(data.id);
  } catch {}

  return null;
}

async function fallbackWords(supabase: any): Promise<SessionWord[]> {
  const { data, error } = await supabase.from("words").select("*").order("frequency_score", { ascending: false }).limit(7);
  if (error || !data) return [];

  return (data ?? [])
    .map((w: any) => {
      const id = cleanStr(w?.id);
      const text = cleanStr(w?.text);
      if (!id || !text) return null;

      const meanings = extractKoMeaningsFromRow(w);
      const examples = extractExamplesFromRow(w).slice(0, 3);
      const synonyms = extractSynonymsFromRow(w).slice(0, 12);
      const antonyms = extractAntonymsFromRow(w).slice(0, 12);
      const collocations = extractCollocationsFromRow(w, text).slice(0, 16);

      return {
        id,
        text,
        meanings_ko: meanings.length ? meanings : ["(뜻 미입력)"],
        examples: examples.length ? examples : undefined,
        synonyms: synonyms.length ? synonyms : undefined,
        collocations: collocations.length ? collocations : undefined,
        antonyms: antonyms.length ? antonyms : undefined,
      } as any;
    })
    .filter(Boolean) as any;
}

export async function loadSessionWords(params: Params): Promise<SessionWord[]> {
  // ✅ 핵심: supabase client를 any로 끊어 deep type instantiation 방지
  const supabase: any = createBrowserClient() as any;

  const userId = cleanStr(params.userId);
  if (!userId) return [];

  const todayISO = toISODateLocal(new Date());

  const studentId = await resolveStudentIdFromUserId(supabase, userId);

  let setId: string | null = cleanStr(params.setId ?? "") || null;

  if (!setId) {
    if (!studentId) {
      console.warn("[loadSessionWords] student_id not resolved", { userId });
      return fallbackWords(supabase);
    }

    const { data: asgRows, error: asgErr } = await supabase
      .from("student_vocab_assignments")
      .select("id, set_id, available_at, assigned_at, day_index, completed_at, canceled_at")
      .eq("student_id", studentId)
      .is("completed_at", null)
      .is("canceled_at", null)
      .lte("available_at", todayISO)
      .order("available_at", { ascending: false })
      .order("day_index", { ascending: false })
      .limit(1);

    if (asgErr) {
      console.warn("[loadSessionWords] student_vocab_assignments query error", asgErr);
      return fallbackWords(supabase);
    }

    setId = (asgRows?.[0]?.set_id as string | undefined) ?? null;

    if (!setId) {
      const { data: ms, error: msErr } = await supabase
        .from("vocab_set_assignments")
        .select("id, set_id, assigned_at")
        .eq("student_id", studentId)
        .order("assigned_at", { ascending: false })
        .limit(1);

      if (!msErr) setId = (ms?.[0]?.set_id as string | undefined) ?? null;
    }

    if (!setId) {
      console.warn("[loadSessionWords] no assignment set found", { student_id: studentId, todayISO });
      return fallbackWords(supabase);
    }
  }

  const { data: linkRowsRaw, error: linkErr } = await supabase.from("vocab_set_items").select("*").eq("set_id", setId);

  if (linkErr) {
    console.warn("[loadSessionWords] vocab_set_items query error", linkErr);
    return fallbackWords(supabase);
  }

  const sorted = sortLinkRows(linkRowsRaw ?? []);
  const idsRaw = sorted
    .map((r: any) => pickWordId(r))
    .filter((v: any): v is string => typeof v === "string" && v.length > 0);

  const wordIds = uniqKeepOrder(idsRaw.filter((x) => isUuidLike(x)));

  if (wordIds.length === 0) {
    console.warn("[loadSessionWords] vocab_set_items returned 0 uuid word ids", {
      set_id: setId,
      rowCount: linkRowsRaw?.length ?? 0,
      firstRow: linkRowsRaw?.[0] ?? null,
    });
    return fallbackWords(supabase);
  }

  const linkRowByWordId = new Map<string, any>();
  for (const r of sorted) {
    const wid = pickWordId(r);
    if (wid && isUuidLike(wid) && !linkRowByWordId.has(wid)) linkRowByWordId.set(wid, r);
  }

  const { data: wordRows, error: wErr } = await supabase.from("words").select("*").in("id", wordIds);

  if (wErr) {
    console.warn("[loadSessionWords] words query error", wErr);
    return fallbackWords(supabase);
  }

  const wMap = new Map<string, any>();
  for (const w of wordRows ?? []) wMap.set(String((w as any).id), w);

  /* ======================================================
   * word_forms
   * ==================================================== */

  const wfSelect = `
    word_id,
    lemma,
    base_pos,
    noun_form, adj_form, adv_form, ed_adj_form,
    verb_3rd, verb_past, verb_pp, verb_ing,
    noun_meaning_ko, adj_meaning_ko, adv_meaning_ko, ed_adj_meaning_ko
  `;

  let wordFormRows: any[] = [];
  let wordFormLookup: "by_word_id" | "by_lemma_fallback" | "none" = "none";
  let wordFormError: any = null;

  {
    const { data, error } = await supabase.from("word_forms").select(wfSelect).in("word_id", wordIds);
    if (error) {
      wordFormError = error;
      console.warn("[loadSessionWords] word_forms by word_id error:", error);
    } else {
      wordFormRows = data ?? [];
      if (wordFormRows.length > 0) wordFormLookup = "by_word_id";
    }
  }

  if (wordFormRows.length === 0) {
    const lemmas = wordIds
      .map((id) => cleanStr(wMap.get(id)?.lemma ?? wMap.get(id)?.text ?? ""))
      .filter(Boolean);

    const uniqL = Array.from(new Set(lemmas));
    const uniqLower = Array.from(new Set(uniqL.map((x) => x.toLowerCase())));
    const q = Array.from(new Set([...uniqL, ...uniqLower])).filter(Boolean);

    if (q.length > 0) {
      const { data, error } = await supabase.from("word_forms").select(wfSelect).in("lemma", q);
      if (error) {
        wordFormError = error;
        console.warn("[loadSessionWords] word_forms by lemma error:", error);
      } else {
        wordFormRows = data ?? [];
        if (wordFormRows.length > 0) wordFormLookup = "by_lemma_fallback";
      }
    }
  }

  const wordFormByWordId = new Map<string, any>();
  const wordFormByLemmaLower = new Map<string, any>();

  for (const r of wordFormRows) {
    const wid = cleanStr((r as any)?.word_id);
    const lemma = cleanStr((r as any)?.lemma);
    if (wid) wordFormByWordId.set(wid, r);
    if (lemma) wordFormByLemmaLower.set(lemma.toLowerCase(), r);
  }

  console.log("[loadSessionWords] word_forms", {
    set_id: setId,
    wordIdCount: wordIds.length,
    wordFormRowCount: wordFormRows.length,
    wordFormLookup,
    wordFormError: wordFormError ? (wordFormError?.message ?? wordFormError) : null,
  });

  /* ======================================================
   * meanings supplement (vocab_lexicon)
   * ==================================================== */

  const missingIds: string[] = [];
  const missingTexts: string[] = [];

  for (const wid of wordIds) {
    const w = wMap.get(wid);
    const linkRow = linkRowByWordId.get(wid);

    const koFromWord = extractKoMeaningsFromRow(w);
    const koFromLink = extractKoMeaningsFromRow(linkRow);

    if (koFromWord.length === 0 && koFromLink.length === 0) {
      missingIds.push(wid);
      const t = cleanStr(w?.text);
      if (t) missingTexts.push(t);
    }
  }

  const lexById = new Map<string, { meanings_ko: string[] }>();
  const lexByText = new Map<string, { meanings_ko: string[] }>();

  if (missingIds.length > 0) {
    // 1) vocab_lexicon.word_id IN missingIds
    try {
      const res = (await supabase
        .from("vocab_lexicon")
        .select("word_id, meanings_ko")
        .in("word_id", missingIds)) as { data: any[] | null; error: any };

      for (const r of res.data ?? []) {
        const k = cleanStr((r as any).word_id);
        if (!k) continue;
        lexById.set(k, { meanings_ko: splitToArray((r as any).meanings_ko) });
      }
    } catch {}

    // 2) vocab_lexicon.id IN missingIds (schema tolerance)
    try {
      const res2 = (await supabase
        .from("vocab_lexicon")
        .select("id, meanings_ko")
        .in("id", missingIds)) as { data: any[] | null; error: any };

      for (const r of res2.data ?? []) {
        const k = cleanStr((r as any).id);
        if (!k) continue;
        lexById.set(k, { meanings_ko: splitToArray((r as any).meanings_ko) });
      }
    } catch {}

    // 3) match by text
    try {
      const uniqT = Array.from(new Set(missingTexts.map((t) => cleanStr(t)).filter(Boolean)));
      const q = Array.from(new Set([...uniqT, ...uniqT.map((t) => t.toLowerCase())])).filter(Boolean);

      if (q.length > 0) {
        const res3 = (await supabase
          .from("vocab_lexicon")
          .select("text, meanings_ko")
          .in("text", q)) as { data: any[] | null; error: any };

        const byText = new Map<string, string[]>();
        for (const r of res3.data ?? []) {
          const t = cleanStr((r as any).text).toLowerCase();
          if (!t) continue;
          const meanings = splitToArray((r as any).meanings_ko);
          if (meanings.length === 0) continue;
          byText.set(t, meanings);
          lexByText.set(t, { meanings_ko: meanings });
        }

        for (let i = 0; i < missingIds.length; i++) {
          const id = cleanStr(missingIds[i]);
          if (!id) continue;
          if (lexById.has(id)) continue;

          const t = cleanStr(missingTexts[i]).toLowerCase();
          const meanings = byText.get(t);
          if (!meanings || meanings.length === 0) continue;

          lexById.set(id, { meanings_ko: meanings });
        }
      }
    } catch {}
  }

  /* ======================================================
   * build SessionWord in original order
   * ==================================================== */

  const out: Array<SessionWord & { wordForm?: any; antonyms?: string[] }> = [];

  for (const wid of wordIds) {
    const w = wMap.get(wid);
    if (!w) continue;

    const text = cleanStr(w.text);
    if (!text) continue;

    const linkRow = linkRowByWordId.get(wid);

    let meanings = extractKoMeaningsFromRow(w);
    if (meanings.length === 0) meanings = extractKoMeaningsFromRow(linkRow);

    if (meanings.length === 0) {
      const byId = lexById.get(wid)?.meanings_ko ?? [];
      const byText = lexByText.get(text.toLowerCase())?.meanings_ko ?? [];
      meanings = byId.length > 0 ? byId : byText;
    }

    if (meanings.length === 0) {
      const en1 = extractEnMeaningsFromRow(w);
      const en2 = extractEnMeaningsFromRow(linkRow);
      const en = en1.length > 0 ? en1 : en2;
      if (en.length > 0) meanings = en.map((m) => `EN: ${m}`);
    }

    const ex1 = extractExamplesFromRow(w);
    const ex2 = extractExamplesFromRow(linkRow);
    const examples = (ex1.length > 0 ? ex1 : ex2).slice(0, 3);

    const syn1 = extractSynonymsFromRow(w);
    const syn2 = extractSynonymsFromRow(linkRow);
    const synonyms = uniqKeepOrderStrings((syn1.length > 0 ? syn1 : syn2).slice(0, 12));

    const ant1 = extractAntonymsFromRow(w);
    const ant2 = extractAntonymsFromRow(linkRow);
    const antonyms = uniqKeepOrderStrings((ant1.length > 0 ? ant1 : ant2).slice(0, 12));

    const c1 = extractCollocationsFromRow(w, text);
    const c2 = extractCollocationsFromRow(linkRow, text);
    const collocations = uniqKeepOrderCollocations((c1.length > 0 ? c1 : c2).slice(0, 16));

    const lemma = cleanStr(w?.lemma ?? "");
    const wf =
      wordFormByWordId.get(wid) ??
      (lemma ? wordFormByLemmaLower.get(lemma.toLowerCase()) : undefined) ??
      wordFormByLemmaLower.get(text.toLowerCase()) ??
      undefined;

    out.push({
      id: wid,
      text,
      meanings_ko: meanings.length > 0 ? meanings : ["(뜻 미입력)"],
      examples: examples.length ? examples : undefined,
      synonyms: synonyms.length ? synonyms : undefined,
      collocations: collocations.length ? collocations : undefined,
      antonyms: antonyms.length ? antonyms : undefined,
      wordForm: wf ?? undefined,
    });
  }

  console.log("[loadSessionWords] final", {
    set_id: setId,
    student_id: studentId,
    requested: wordIds.length,
    returned: out.length,
    missingMeaning: out.filter((x) => (x.meanings_ko?.[0] ?? "") === "(뜻 미입력)").length,
    withExamples: out.filter((x) => (x.examples?.length ?? 0) > 0).length,
    withSynonyms: out.filter((x) => (x.synonyms?.length ?? 0) > 0).length,
    withCollocations: out.filter((x) => (x.collocations?.length ?? 0) > 0).length,
    withAntonyms: out.filter((x) => ((x as any).antonyms?.length ?? 0) > 0).length,
    withWordForms: out.filter((x) => Boolean((x as any).wordForm)).length,
    wordFormLookup,
    first: out[0]?.text ?? null,
    firstMeaning: out[0]?.meanings_ko?.[0] ?? null,
    firstExample: out[0]?.examples?.[0]?.en ?? null,
    firstSynonym: out[0]?.synonyms?.[0] ?? null,
    firstCollocation: out[0]?.collocations?.[0]
      ? `${out[0]?.collocations?.[0]?.base} ${out[0]?.collocations?.[0]?.right}`
      : null,
  });

  return out as any;
}
