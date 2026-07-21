// apps/web/app/(protected)/vocab/session/actions.ts
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

import type { SessionWord, VocabExample, VocabCollocation } from "@/models/vocab/SessionWord";
import type { WordFormRowLike } from "@/lib/vocab/drill/buildBlockDrillTasksV1";
import { ensureCockedQueueAdminAction } from "@/app/protected/admin/vocab/Tracks/actions";

export type LoadSessionWordsActionInput = {
  /** Optional: force a specific setId (debug / admin / shortcut) */
  setId?: string | null;
  /** Optional: force a specific dayIndex for reviewing past days */
  dayIndex?: number | null;
};

export type LoadSessionWordsActionResult =
  | {
      ok: true;
      userId: string;
      academyStudentId: string | null;
      assignmentId: string | null;
      setId: string;
      assignedAt: string | null;
      words: SessionWord[];

      trackTitle?: string;
      dayIndex?: number;
      totalDays?: number;

      wordFormsByWordId?: Record<string, WordFormRowLike>;
      wordExamplesByWordId?: Record<string, any>;
      wordCollocationsByWordId?: Record<string, any>;

      note?: string;
      diag?: any;
    }
  | {
      ok: false;
      userId?: string;
      academyStudentId?: string | null;
      assignmentId?: string | null;
      setId?: string | null;
      assignedAt?: string | null;

      trackTitle?: string;
      dayIndex?: number;
      totalDays?: number;

      words?: SessionWord[];
      error?: string;
      note?: string;
      diag?: any;

      wordFormsByWordId?: Record<string, WordFormRowLike>;
      wordExamplesByWordId?: Record<string, any>;
      wordCollocationsByWordId?: Record<string, any>;
    };

function cleanStr(v: unknown): string {
  return String(v ?? "").trim();
}

function toErrMsg(e: any): string {
  return cleanStr(e?.message ?? e?.error_description ?? e?.hint ?? e ?? "unknown error");
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** ✅ KST local date (YYYY-MM-DD) to match available_at(date) expectation */
function todayISO_KST(): string {
  const k = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const y = k.getUTCFullYear();
  const m = pad2(k.getUTCMonth() + 1);
  const d = pad2(k.getUTCDate());
  return `${y}-${m}-${d}`;
}

function isUuidLike(s: unknown): boolean {
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

function normalizeStringArray(v: any): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(cleanStr).filter(Boolean);
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    return s
      .split(/\s*(?:\/|,|;|\||·|\n)\s*/g)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function pickDate(row: any): string | null {
  return cleanStr(row?.assigned_at) || cleanStr(row?.available_at) || cleanStr(row?.created_at) || null;
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

function reorderByIds<T extends { id?: string; word_id?: string }>(rows: T[], ids: string[]) {
  const map = new Map<string, T>();
  for (const r of rows) {
    const id = cleanStr((r as any)?.id ?? (r as any)?.word_id ?? "");
    if (id) map.set(id, r);
  }
  return ids.map((id) => map.get(id)).filter(Boolean) as T[];
}

const WORD_FORMS_SELECT = [
  "word_id",
  "lemma",
  "base_pos",
  "noun_form",
  "adj_form",
  "adv_form",
  "ed_adj_form",
  "verb_3rd",
  "verb_past",
  "verb_pp",
  "verb_ing",
  "noun_meaning_ko",
  "adj_meaning_ko",
  "adv_meaning_ko",
  "ed_adj_meaning_ko",
  "created_at",
  "updated_at",
].join(",");

async function trySelectManyIn(
  client: any,
  table: string,
  select: string,
  inCol: string,
  inValues: string[],
) {
  try {
    const { data, error } = await client.from(table).select(select).in(inCol, inValues);
    if (error) return { ok: false as const, error };
    return { ok: true as const, rows: Array.isArray(data) ? data : [] };
  } catch (e) {
    return { ok: false as const, error: e };
  }
}

/* ----------------------------
 * examples / collocations parsing (robust)
 * --------------------------- */

function splitExamples(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => cleanStr(x)).filter(Boolean);
  if (typeof v === "string") {
    const s = cleanStr(v);
    if (!s) return [];
    const byNewline = s.split(/\r?\n+/).map(cleanStr).filter(Boolean);
    if (byNewline.length > 1) return byNewline;

    const byBar = s.split(/\s*\|\s*/g).map(cleanStr).filter(Boolean);
    if (byBar.length > 1) return byBar;

    const bySemi = s.split(/\s*;\s*/g).map(cleanStr).filter(Boolean);
    if (bySemi.length > 1) return bySemi;

    return [s];
  }
  return [];
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
    const arr = splitExamples(c);
    if (arr.length) {
      ens = arr;
      break;
    }
  }

  let kos: string[] = [];
  for (const c of koCandidates) {
    const arr = splitExamples(c);
    if (arr.length) {
      kos = arr;
      break;
    }
  }

  if (ens.length === 0) return [];

  const out: VocabExample[] = [];
  for (let i = 0; i < ens.length; i++) {
    const en = cleanStr(ens[i]);
    if (!en) continue;
    const ko = kos[i] ? cleanStr(kos[i]) : "";
    out.push({ en, ko: ko || null });
  }
  return uniqKeepOrderExamples(out);
}

function hashId(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function uniqKeepOrderCollocations(arr: VocabCollocation[]): VocabCollocation[] {
  const out: VocabCollocation[] = [];
  const seen = new Set<string>();
  for (const c of arr ?? []) {
    const base = cleanStr((c as any)?.base);
    const right = cleanStr((c as any)?.right);
    if (!base || !right) continue;
    const k = `${base.toLowerCase()}|${right.toLowerCase()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({
      id: cleanStr((c as any)?.id) || hashId(k),
      base,
      right,
      meaning_ko: (c as any)?.meaning_ko ?? null,
      source: (c as any)?.source ?? "db",
    } as any);
  }
  return out;
}

function extractCollocationsFromRow(row: any, baseWord: string): VocabCollocation[] {
  if (!row) return [];
  const base = cleanStr(baseWord);
  if (!base) return [];

  const direct = row.collocations ?? row.vocab_collocations ?? null;

  // array of objects
  if (Array.isArray(direct) && direct.length > 0 && typeof direct[0] === "object") {
    const mapped = direct
      .map((x: any) => {
        const b = cleanStr(x?.base ?? x?.left ?? base);
        const r = cleanStr(x?.right ?? x?.collocate ?? x?.phrase ?? "");
        if (!b || !r) return null;
        return {
          id: cleanStr(x?.id) || hashId(`${b.toLowerCase()}|${r.toLowerCase()}`),
          base: b,
          right: r,
          meaning_ko: cleanStr(x?.meaning_ko ?? "") || null,
          source: (x?.source === "auto" ? "auto" : "db") as any,
        } as VocabCollocation;
      })
      .filter(Boolean) as VocabCollocation[];

    const uniq = uniqKeepOrderCollocations(mapped);
    if (uniq.length) return uniq;
  }

  // jsonb object: {pairs/items/list: [...]}
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
            source: "db" as any,
          } as VocabCollocation;
        })
        .filter(Boolean) as VocabCollocation[];
      const uniq = uniqKeepOrderCollocations(mapped);
      if (uniq.length) return uniq;
    }
  }

  // string/array-of-strings
  if (typeof direct === "string" || Array.isArray(direct)) {
    const raw = Array.isArray(direct) ? direct : direct.split(/\r?\n|;/g);
    const out: VocabCollocation[] = [];
    for (const line of raw) {
      const p = cleanStr(line);
      if (!p) continue;
      // naive: "base right..."
      out.push({
        id: hashId(`${base.toLowerCase()}|${p.toLowerCase()}`),
        base,
        right: p,
        source: "db",
      } as any);
    }
    return uniqKeepOrderCollocations(out);
  }

  return [];
}

/* ----------------------------
 * Supabase clients
 * --------------------------- */

async function createAuthedServerClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!url || !anon) {
    throw new Error("Supabase env missing: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
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

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url) throw new Error("Supabase env missing: NEXT_PUBLIC_SUPABASE_URL");
  if (!service) return null;

  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * ✅ DB-true resolver:
 * - auth userId -> academy_students.id
 * - latest OPEN assignment: student_vocab_assignments (available + not completed/canceled)
 *   fallback: vocab_set_assignments (manual)
 * - set words: vocab_set_items (SSOT)
 * - words: words_with_meaning view, fallback words table
 * - word_forms optional
 */
export async function loadSessionWordsAction(
  input: LoadSessionWordsActionInput,
): Promise<LoadSessionWordsActionResult> {
  const diag: any = { steps: [] as any[] };

  try {
    const authed = await createAuthedServerClient();
    const admin = createAdminClient();
    const client = admin ?? authed;

    // 1) auth user
    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return {
        ok: false,
        error: "NOT_LOGGED_IN",
        note: "auth.getUser() failed or empty",
        diag: { ...diag, userErr: toErrMsg(userErr) },
      };
    }
    const userId = userData.user.id;

    const todayISO = todayISO_KST();
    diag.todayISO = todayISO;

    // 2) resolve academyStudentId (academy_students.id)
    let academyStudentId: string | null = null;

    // 2-0) if userId is already a student uuid and exists, accept
    if (isUuidLike(userId)) {
      try {
        const { data, error } = await client.from("academy_students").select("id").eq("id", userId).maybeSingle();
        diag.steps.push({ kind: "resolveAcademyStudent", by: "id", ok: !error, err: error ? toErrMsg(error) : null });
        if (!error && data?.id) academyStudentId = cleanStr(data.id) || null;
      } catch (e) {
        diag.steps.push({ kind: "resolveAcademyStudent", by: "id", ok: false, err: toErrMsg(e) });
      }
    }

    // 2-1) auth_user_id
    if (!academyStudentId) {
      try {
        const { data, error } = await client
          .from("academy_students")
          .select("id")
          .eq("auth_user_id", userId)
          .maybeSingle();

        diag.steps.push({
          kind: "resolveAcademyStudent",
          by: "auth_user_id",
          ok: !error,
          err: error ? toErrMsg(error) : null,
        });

        if (!error && data?.id) academyStudentId = cleanStr(data.id) || null;
      } catch (e) {
        diag.steps.push({ kind: "resolveAcademyStudent", by: "auth_user_id", ok: false, err: toErrMsg(e) });
      }
    }

    // 2-2) legacy: user_id / profile_id
    if (!academyStudentId) {
      const tries: Array<{ col: string; label: string }> = [
        { col: "user_id", label: "user_id" },
        { col: "profile_id", label: "profile_id" },
      ];

      for (const t of tries) {
        if (academyStudentId) break;
        try {
          const { data, error } = await client.from("academy_students").select("id").eq(t.col, userId).maybeSingle();

          diag.steps.push({
            kind: "resolveAcademyStudent",
            by: t.label,
            ok: !error,
            err: error ? toErrMsg(error) : null,
          });

          if (!error && data?.id) academyStudentId = cleanStr(data.id) || null;
        } catch (e) {
          diag.steps.push({ kind: "resolveAcademyStudent", by: t.label, ok: false, err: toErrMsg(e) });
        }
      }
    }

    // 3) resolve setId / assignment
    let resolvedSetId = cleanStr(input?.setId ?? "");
    let assignmentId: string | null = null;
    let assignedAt: string | null = null;
    let dayIndex: number | null = null;

    if (!resolvedSetId) {
      if (!academyStudentId) {
        return {
          ok: false,
          userId,
          academyStudentId: null,
          assignmentId: null,
          setId: null,
          assignedAt: null,
          error: "SET_ID_NOT_RESOLVED",
          note:
            "academy_students row not found for this user. Check academy_students.auth_user_id mapping or pass setId explicitly.",
          diag,
        };
      }

      // A) student_vocab_assignments: OPEN + available today (or specific dayIndex for review)
      {
        let query = client
          .from("student_vocab_assignments")
          .select("id,set_id,available_at,assigned_at,day_index,completed_at,canceled_at")
          .eq("student_id", academyStudentId)
          .is("canceled_at", null);

        // If dayIndex is specified (review mode), allow any assignment
        // Otherwise, only allow available assignments
        if (!input?.dayIndex) {
          query = query
            .is("completed_at", null)
            .lte("available_at", todayISO)
            .order("available_at", { ascending: false })
            .order("day_index", { ascending: false })
            .order("assigned_at", { ascending: false });
        } else {
          // Review mode: find the specific dayIndex
          query = query
            .eq("day_index", input.dayIndex)
            .order("assigned_at", { ascending: false });
        }

        const { data, error } = await query.limit(1);

        diag.steps.push({
          kind: "resolveAssignment",
          table: "student_vocab_assignments",
          ok: !error,
          err: error ? toErrMsg(error) : null,
          rows: Array.isArray(data) ? data.length : 0,
          mode: input?.dayIndex ? `review(dayIndex=${input.dayIndex})` : "auto",
        });

        const row = Array.isArray(data) ? data[0] : null;
        if (!error && row?.set_id) {
          assignmentId = cleanStr(row.id) || null;
          resolvedSetId = cleanStr(row.set_id) || "";
          assignedAt = pickDate(row);
          dayIndex = typeof row.day_index === "number" ? row.day_index : null;
          diag.assignmentSource = input?.dayIndex
            ? `student_vocab_assignments(review, dayIndex=${input.dayIndex})`
            : "student_vocab_assignments(open)";
        }
      }

      // B) fallback: vocab_set_assignments (manual)
      if (!resolvedSetId) {
        const { data, error } = await client
          .from("vocab_set_assignments")
          .select("id,set_id,assigned_at")
          .eq("student_id", academyStudentId)
          .order("assigned_at", { ascending: false })
          .limit(1);

        diag.steps.push({
          kind: "resolveAssignment",
          table: "vocab_set_assignments",
          ok: !error,
          err: error ? toErrMsg(error) : null,
          rows: Array.isArray(data) ? data.length : 0,
        });

        const row = Array.isArray(data) ? data[0] : null;
        if (!error && row?.set_id) {
          assignmentId = cleanStr(row.id) || null;
          resolvedSetId = cleanStr(row.set_id) || "";
          assignedAt = pickDate(row);
          diag.assignmentSource = "vocab_set_assignments(latest)";
        }
      }

      if (!resolvedSetId) diag.assignmentSource = "none";
    } else {
      diag.assignmentSource = "forcedSetId";
    }

    if (!resolvedSetId) {
      return {
        ok: false,
        userId,
        academyStudentId,
        assignmentId,
        setId: null,
        assignedAt,
        error: "SET_ID_NOT_RESOLVED",
        note: "No setId provided and no open assignment row found.",
        diag,
      };
    }

    // 4) load word ids from vocab_set_items (SSOT)
    let wordIds: string[] = [];
    try {
      const { data, error } = await client
        .from("vocab_set_items")
        .select("set_id,word_id,sort_order,order_no,created_at")
        .eq("set_id", resolvedSetId)
        .limit(5000);

      diag.steps.push({
        kind: "loadSetWordIds",
        table: "vocab_set_items",
        ok: !error,
        err: error ? toErrMsg(error) : null,
        rows: Array.isArray(data) ? data.length : 0,
      });

      if (error) {
        return {
          ok: false,
          userId,
          academyStudentId,
          assignmentId,
          setId: resolvedSetId,
          assignedAt,
          error: "SET_WORDS_LOOKUP_FAILED",
          note: "vocab_set_items query failed.",
          diag,
        };
      }

      const sorted = sortLinkRows(Array.isArray(data) ? data : []);
      const raw = sorted.map((r: any) => cleanStr(r?.word_id)).filter(Boolean);
      wordIds = uniqKeepOrder(raw.filter((x) => isUuidLike(x)));
      diag.linkTable = "vocab_set_items";
      diag.wordIdCount = wordIds.length;
    } catch (e) {
      diag.steps.push({ kind: "loadSetWordIds", table: "vocab_set_items", ok: false, err: toErrMsg(e) });
      return {
        ok: false,
        userId,
        academyStudentId,
        assignmentId,
        setId: resolvedSetId,
        assignedAt,
        error: "SET_WORDS_LOOKUP_FAILED",
        note: toErrMsg(e),
        diag,
      };
    }

    if (wordIds.length === 0) {
      return {
        ok: false,
        userId,
        academyStudentId,
        assignmentId,
        setId: resolvedSetId,
        assignedAt,
        error: "SET_HAS_0_WORDS",
        note: "vocab_set_items returned 0 uuid word ids. Check set items data.",
        diag,
      };
    }

    // 5) resolve words (prefer words_with_meaning view)
    const preferred = await trySelectManyIn(
      client,
      "words_with_meaning",
      [
        "id",
        "text",
        "lemma",
        "pos",
        "meanings_ko",
        "meanings_en_simple",
        "examples_easy",
        "examples_normal",
        "synonyms_en_simple",
        "collocations",
        "antonyms_terms",
        "derived_terms",
        "notes",
      ].join(","),
      "id",
      wordIds,
    );

    diag.steps.push({
      kind: "resolveWords",
      table: "words_with_meaning",
      ok: preferred.ok,
      err: preferred.ok ? null : toErrMsg((preferred as any).error),
      rows: preferred.ok ? preferred.rows.length : 0,
    });

    let wordRows: any[] = [];

    if (preferred.ok && preferred.rows.length > 0) {
      wordRows = reorderByIds(preferred.rows, wordIds);
    } else {
      const fallback = await trySelectManyIn(
        client,
        "words",
        [
          "id",
          "text",
          "lemma",
          "pos",
          "meanings_ko",
          "meanings_en_simple",
          "examples_easy",
          "examples_normal",
          "synonyms_en_simple",
          "collocations",
          "antonyms_terms",
          "notes",
        ].join(","),
        "id",
        wordIds,
      );

      diag.steps.push({
        kind: "resolveWords",
        table: "words",
        ok: fallback.ok,
        err: fallback.ok ? null : toErrMsg((fallback as any).error),
        rows: fallback.ok ? fallback.rows.length : 0,
      });

      if (!fallback.ok) {
        return {
          ok: false,
          userId,
          academyStudentId,
          assignmentId,
          setId: resolvedSetId,
          assignedAt,
          error: "WORDS_LOOKUP_FAILED",
          note: "Failed to load words from words_with_meaning and words.",
          diag,
        };
      }

      wordRows = reorderByIds(fallback.rows, wordIds);
    }

    // 6) optional word_forms
    const wfMap: Record<string, WordFormRowLike> = {};
    {
      const wf = await trySelectManyIn(client, "word_forms", WORD_FORMS_SELECT, "word_id", wordIds);
      diag.steps.push({
        kind: "loadWordForms",
        table: "word_forms",
        ok: wf.ok,
        err: wf.ok ? null : toErrMsg((wf as any).error),
        rows: wf.ok ? wf.rows.length : 0,
      });

      if (wf.ok && wf.rows.length > 0) {
        for (const r of wf.rows as any[]) {
          const wid = cleanStr(r?.word_id);
          if (!wid) continue;
          wfMap[wid] = r as any;
        }
      }
    }

    // 7) build SessionWord[] + convenience maps
    const wordExamplesByWordId: Record<string, any> = {};
    const wordCollocationsByWordId: Record<string, any> = {};

    const words: SessionWord[] = wordRows
      .map((r: any) => {
        const id = cleanStr(r?.id);
        const text = cleanStr(r?.text);
        if (!id || !text) return null;

        const meanings_ko = normalizeStringArray(r?.meanings_ko);
        const synonyms = normalizeStringArray(r?.synonyms_en_simple);
        const antonyms = normalizeStringArray(r?.antonyms_terms);

        const examples = extractExamplesFromRow(r).slice(0, 3);
        const collocations = uniqKeepOrderCollocations(extractCollocationsFromRow(r, text)).slice(0, 16);

        const wf = wfMap[id];

        wordExamplesByWordId[id] = r?.examples_easy ?? r?.examples_normal ?? null;
        wordCollocationsByWordId[id] = r?.collocations ?? null;

        return {
          id,
          text,
          lemma: cleanStr(r?.lemma) || null,
          pos: cleanStr(r?.pos) || null,
          meanings_ko: meanings_ko.length ? meanings_ko : ["(뜻 미입력)"],
          // 아래 4개는 SessionWord SSOT에서 쓰는 필드들
          examples: examples.length ? examples : undefined,
          synonyms: synonyms.length ? synonyms.slice(0, 12) : undefined,
          antonyms: antonyms.length ? antonyms.slice(0, 12) : undefined,
          collocations: collocations.length ? collocations : undefined,
          // drill builder가 쓰는 보너스
          wordForm: wf ?? undefined,
          notes: cleanStr(r?.notes) || null,
        } as any;
      })
      .filter(Boolean) as SessionWord[];

    // 8) 트랙 정보 조회 (Day 표시를 위함)
    let trackTitle: string | null = null;
    let totalDays: number | null = null;

    {
      try {
        // vocab_sets → track_id 찾기
        const { data: setData } = await client
          .from("vocab_sets")
          .select("track_id")
          .eq("id", resolvedSetId)
          .maybeSingle();

        if (setData?.track_id) {
          const trackId = cleanStr(setData.track_id);

          // vocab_tracks → title, total_days 찾기
          const { data: trackData } = await client
            .from("vocab_tracks")
            .select("title, total_days")
            .eq("id", trackId)
            .maybeSingle();

          if (trackData) {
            trackTitle = cleanStr(trackData.title) || null;
            totalDays = typeof trackData.total_days === "number" ? trackData.total_days : null;
          }

          // student_vocab_plans에서 cursor_day_index 조회
          if (academyStudentId) {
            try {
              const { data: planData } = await client
                .from("student_vocab_plans")
                .select("cursor_day_index")
                .eq("student_id", academyStudentId)
                .eq("track_id", trackId)
                .maybeSingle();

              if (planData && typeof planData.cursor_day_index === "number") {
                dayIndex = planData.cursor_day_index;
              }
            } catch (e) {
              // 이 쿼리 실패는 무시 (trackTitle/totalDays는 이미 있음)
            }
          }
        }
      } catch (e) {
        diag.steps.push({ kind: "loadTrackInfo", ok: false, err: toErrMsg(e) });
      }
    }

    return {
      ok: true,
      userId,
      academyStudentId,
      assignmentId,
      setId: resolvedSetId,
      assignedAt,
      trackTitle,
      dayIndex,
      totalDays,
      words,
      wordFormsByWordId: wfMap,
      wordExamplesByWordId,
      wordCollocationsByWordId,
      note: input?.setId ? "loaded via forced setId" : `loaded via ${diag.assignmentSource}`,
      diag,
    };
  } catch (e: any) {
    return {
      ok: false,
      error: "ACTION_EXCEPTION",
      note: toErrMsg(e),
      diag: { steps: diag.steps, exception: toErrMsg(e) },
    };
  }
}

/* =========================================================
 * ✅ Day 완료 처리
 * - speed 최종점검 통과 시 호출
 * - 해당 set의 열린 assignment 에 completed_at 기록
 * - 큐 정렬(다음 Day 오픈)까지 수행
 * ======================================================= */
export type CompleteVocabDayResult = {
  ok: boolean;
  completedAssignmentId: string | null;
  dayIndex: number | null;
  nextOpened: number;
  error?: string;
  note?: string;
};

async function resolveAcademyStudentId(
  client: any,
  userId: string,
): Promise<string | null> {
  // id -> auth_user_id -> user_id -> profile_id
  if (isUuidLike(userId)) {
    const { data } = await client.from("academy_students").select("id").eq("id", userId).maybeSingle();
    if (data?.id) return cleanStr(data.id) || null;
  }
  for (const col of ["auth_user_id", "user_id", "profile_id"]) {
    const { data } = await client.from("academy_students").select("id").eq(col, userId).maybeSingle();
    if (data?.id) return cleanStr(data.id) || null;
  }
  return null;
}

export async function completeVocabDayAction(input: {
  setId: string;
}): Promise<CompleteVocabDayResult> {
  const empty: CompleteVocabDayResult = {
    ok: false,
    completedAssignmentId: null,
    dayIndex: null,
    nextOpened: 0,
  };

  try {
    const authed = await createAuthedServerClient();
    const admin = createAdminClient();
    const client = admin ?? authed;

    const setId = cleanStr(input?.setId);
    if (!setId) return { ...empty, error: "SET_ID_REQUIRED" };

    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData?.user?.id) return { ...empty, error: "NOT_LOGGED_IN" };
    const userId = userData.user.id;

    const academyStudentId = await resolveAcademyStudentId(client, userId);
    if (!academyStudentId) return { ...empty, error: "STUDENT_NOT_FOUND" };

    // 이 set 의 "열린" 할당 찾기 (미완료·미취소)
    const { data: rows, error } = await client
      .from("student_vocab_assignments")
      .select("id, track_id, day_index")
      .eq("student_id", academyStudentId)
      .eq("set_id", setId)
      .is("completed_at", null)
      .is("canceled_at", null)
      .order("day_index", { ascending: true })
      .limit(1);

    if (error) return { ...empty, error: "ASSIGNMENT_LOOKUP_FAILED", note: toErrMsg(error) };

    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row?.id) {
      // 이미 완료됐거나 배정이 없음 — 학습 자체는 성공이므로 ok로 취급
      return { ...empty, ok: true, note: "NO_OPEN_ASSIGNMENT (already completed or none)" };
    }

    const nowISO = new Date().toISOString();
    const { error: updErr } = await client
      .from("student_vocab_assignments")
      .update({ completed_at: nowISO } as any)
      .eq("id", row.id);

    if (updErr) return { ...empty, error: "UPDATE_FAILED", note: toErrMsg(updErr) };

    // 다음 Day 오픈 (큐 정렬) — 실패해도 완료 자체는 성공 처리
    let nextOpened = 0;
    try {
      const ensure: any = await ensureCockedQueueAdminAction({
        studentId: academyStudentId,
        trackId: cleanStr(row.track_id),
      } as any);
      nextOpened = Number(ensure?.assignedCount ?? 0);
    } catch {
      /* non-fatal */
    }

    return {
      ok: true,
      completedAssignmentId: cleanStr(row.id),
      dayIndex: typeof row.day_index === "number" ? row.day_index : null,
      nextOpened,
    };
  } catch (e: any) {
    return { ...empty, error: "ACTION_EXCEPTION", note: toErrMsg(e) };
  }
}

/**
 * 학습 결과 저장 (Know/DontKnow, Spelling, Speed)
 */
import { advanceVocabQueueAfterCompletionAction } from "@/app/protected/admin/vocab/Tracks/actions";

export type SaveVocabAttemptInput = {
  studentId: string;
  setId: string;
  wordIds: string[]; // 틀린/취약 단어 ID
  stage: "know" | "spelling" | "speed"; // 어느 stage에서 틀렸는지
  accuracy?: number; // 정확도 (speed의 경우)
  passed?: boolean; // 통과 여부
  assignmentId?: string | null; // student_vocab_assignments ID
};

export type SaveVocabAttemptResult = {
  ok: boolean;
  error?: string;
};

export async function saveVocabAttemptAction(
  input: SaveVocabAttemptInput,
): Promise<SaveVocabAttemptResult> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookies) => {
            cookies.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const nowISO = new Date().toISOString();

    // 1. vocab_learning_attempts 테이블에 저장
    const { error: attemptError } = await client.from("vocab_learning_attempts").insert([
      {
        student_id: cleanStr(input.studentId),
        set_id: cleanStr(input.setId),
        wrong_word_ids: input.wordIds,
        stage: input.stage,
        accuracy: input.accuracy ?? null,
        passed: input.passed ?? null,
        attempted_at: nowISO,
      },
    ] as any);

    if (attemptError) {
      console.warn("saveVocabAttemptAction: insert failed", toErrMsg(attemptError));
    }

    // 2. assignmentId가 있으면 student_vocab_assignments의 completed_at 업데이트
    if (input.assignmentId) {
      const { error: assignmentError } = await client
        .from("student_vocab_assignments")
        .update({ completed_at: nowISO })
        .eq("id", input.assignmentId);

      if (assignmentError) {
        console.warn("saveVocabAttemptAction: assignment update failed", toErrMsg(assignmentError));
      }

      // 3. 다음 회차 자동 할당 (전체 코스가 배정돼 있으므로 완료 즉시 다음 Day 오픈)
      try {
        const { data: asg } = await client
          .from("student_vocab_assignments")
          .select("student_id, track_id")
          .eq("id", input.assignmentId)
          .maybeSingle();

        const nextStudentId = cleanStr((asg as any)?.student_id);
        const nextTrackId = cleanStr((asg as any)?.track_id);

        if (nextStudentId && nextTrackId) {
          await advanceVocabQueueAfterCompletionAction({
            studentId: nextStudentId,
            trackId: nextTrackId,
          });
        }
      } catch (e: any) {
        console.warn("saveVocabAttemptAction: advance queue failed", toErrMsg(e));
      }
    }

    return { ok: true };
  } catch (e: any) {
    console.warn("saveVocabAttemptAction exception:", toErrMsg(e));
    return { ok: true }; // non-fatal
  }
}
