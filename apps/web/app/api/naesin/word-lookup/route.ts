import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/supabase/server";
import { generateWordDefinition } from "@/lib/naesin/wordDefinitionGenerator";

export const dynamic = "force-dynamic";

type LooseRow = Record<string, unknown>;

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeWord(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim()
    .replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "")
    .toLowerCase();
}

function toKey(input: string): string {
  return normalizeWord(input).replace(/[^a-z0-9]/g, "");
}

function buildCandidates(raw: string): string[] {
  const set = new Set<string>();
  const add = (value: string) => {
    const normalized = normalizeWord(value);
    if (normalized) set.add(normalized);
  };

  add(raw);

  const base = normalizeWord(raw);
  if (!base) return [];

  add(base);

  if (base.endsWith("'s")) add(base.slice(0, -2));
  if (base.endsWith("s'")) add(base.slice(0, -1));
  if (base.endsWith("ies") && base.length > 3) add(base.slice(0, -3) + "y");
  if (base.endsWith("es") && base.length > 2) add(base.slice(0, -2));
  if (base.endsWith("s") && base.length > 1) add(base.slice(0, -1));
  if (base.endsWith("ed") && base.length > 2) add(base.slice(0, -2));
  if (base.endsWith("ing") && base.length > 3) add(base.slice(0, -3));
  if (base.endsWith("er") && base.length > 2) add(base.slice(0, -2));
  if (base.endsWith("est") && base.length > 3) add(base.slice(0, -3));
  if (base.endsWith("ly") && base.length > 2) add(base.slice(0, -2));

  return Array.from(set);
}

function pickPos(row: LooseRow): string {
  return asString(row.pos) ?? "-";
}

function pickMeaning(row: LooseRow): string {
  const ko = row.meanings_ko;

  if (typeof ko === "string" && ko.trim()) {
    return ko.trim();
  }

  if (Array.isArray(ko)) {
    const joined = ko
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean)
      .join(", ");
    if (joined) return joined;
  }

  const en = row.meanings_en_simple;

  if (typeof en === "string" && en.trim()) {
    return en.trim();
  }

  if (Array.isArray(en)) {
    const joined = en
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean)
      .join(", ");
    if (joined) return joined;
  }

  return "뜻 없음";
}

async function findWord(candidates: string[]) {
  const supabase = await getServerSupabase();

  for (const candidate of candidates) {
    const key = toKey(candidate);

    const { data: byNorm } = await supabase
      .from("words")
      .select("id, text, lemma, pos, meanings_ko, meanings_en_simple, text_norm, text_key")
      .or(`text_norm.eq.${candidate},lemma.eq.${candidate},text.eq.${candidate}`)
      .limit(1);

    if (byNorm?.[0]) {
      return {
        row: byNorm[0] as LooseRow,
        matchedBy: "norm",
        matchedValue: candidate,
      };
    }

    if (key) {
      const { data: byKey } = await supabase
        .from("words")
        .select("id, text, lemma, pos, meanings_ko, meanings_en_simple, text_norm, text_key")
        .eq("text_key", key)
        .limit(1);

      if (byKey?.[0]) {
        return {
          row: byKey[0] as LooseRow,
          matchedBy: "key",
          matchedValue: key,
        };
      }
    }

    const { data: byTextLike } = await supabase
      .from("words")
      .select("id, text, lemma, pos, meanings_ko, meanings_en_simple, text_norm, text_key")
      .ilike("text", candidate)
      .limit(1);

    if (byTextLike?.[0]) {
      return {
        row: byTextLike[0] as LooseRow,
        matchedBy: "text",
        matchedValue: candidate,
      };
    }

    const { data: byLemmaLike } = await supabase
      .from("words")
      .select("id, text, lemma, pos, meanings_ko, meanings_en_simple, text_norm, text_key")
      .ilike("lemma", candidate)
      .limit(1);

    if (byLemmaLike?.[0]) {
      return {
        row: byLemmaLike[0] as LooseRow,
        matchedBy: "lemma",
        matchedValue: candidate,
      };
    }
  }

  return null;
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !service) return null;
  return createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function generateAndCacheWord(candidate: string) {
  const generated = await generateWordDefinition(candidate);
  if (!generated.ok) return null;

  const { lemma, pos, meaningsKo } = generated.definition;
  const text = candidate;

  const service = getServiceSupabase();
  if (service) {
    // text_norm / text_key are DB-generated columns; must not be set explicitly.
    const { error } = await service.from("words").insert({
      text,
      lemma,
      pos,
      meanings_ko: meaningsKo,
      is_function_word: false,
    });

    if (error) {
      console.error("[naesin.word-lookup] failed to cache generated word", error);
    }
  }

  return {
    row: {
      text,
      lemma,
      pos,
      meanings_ko: meaningsKo,
    } as LooseRow,
    matchedBy: "ai",
    matchedValue: candidate,
  };
}

export async function GET(req: NextRequest) {
  try {
    const rawWord = req.nextUrl.searchParams.get("word") ?? "";
    const surface = rawWord.trim();

    if (!surface) {
      return NextResponse.json(
        { ok: false, message: "Missing word query." },
        { status: 400 }
      );
    }

    const candidates = buildCandidates(surface);

    if (candidates.length === 0) {
      return NextResponse.json({
        ok: true,
        found: false,
        surface,
        normalized: "",
        pos: "-",
        meaning: "사전 미등록",
      });
    }

    const found = (await findWord(candidates)) ?? (await generateAndCacheWord(candidates[0]));

    if (!found) {
      return NextResponse.json({
        ok: true,
        found: false,
        surface,
        normalized: candidates[0],
        pos: "-",
        meaning: "사전 미등록",
      });
    }

    const row = found.row;

    return NextResponse.json({
      ok: true,
      found: true,
      surface,
      normalized: candidates[0],
      matchedBy: found.matchedBy,
      matchedValue: found.matchedValue,
      word: {
        id: asString(row.id),
        text: asString(row.text),
        lemma: asString(row.lemma),
        pos: pickPos(row),
        meaning: pickMeaning(row),
      },
    });
  } catch (error) {
    console.error("[naesin.word-lookup] error", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Word lookup failed.",
      },
      { status: 500 }
    );
  }
}
