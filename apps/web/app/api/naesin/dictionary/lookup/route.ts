import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

type WordRow = {
  text: string | null;
  lemma: string | null;
  pos: string | null;
  meanings_ko: string[] | string | null;
  meanings_en_simple: string[] | string | null;
  synonyms_en_simple?: string[] | string | null;
};

function normalizeEnglishWord(value: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^[^a-z]+|[^a-z]+$/g, "");
}

function buildCandidates(word: string) {
  const base = normalizeEnglishWord(word);
  if (!base) return [];

  const set = new Set<string>();
  set.add(base);

  if (base.endsWith("ies") && base.length > 3) {
    set.add(base.slice(0, -3) + "y");
  }

  if (base.endsWith("es") && base.length > 3) {
    set.add(base.slice(0, -2));
  }

  if (base.endsWith("s") && base.length > 2) {
    set.add(base.slice(0, -1));
  }

  if (base.endsWith("ed") && base.length > 3) {
    set.add(base.slice(0, -2));
    set.add(base.slice(0, -1));
  }

  if (base.endsWith("ing") && base.length > 5) {
    set.add(base.slice(0, -3));
    set.add(base.slice(0, -3) + "e");
  }

  return [...set].filter(Boolean);
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v ?? "").trim()).filter(Boolean);
  }

  const s = String(value ?? "").trim();
  return s ? [s] : [];
}

function pickBestRow(rows: WordRow[], candidates: string[]) {
  for (const candidate of candidates) {
    const exactText = rows.find(
      (row) => normalizeEnglishWord(row.text ?? "") === candidate,
    );
    if (exactText) return exactText;

    const exactLemma = rows.find(
      (row) => normalizeEnglishWord(row.lemma ?? "") === candidate,
    );
    if (exactLemma) return exactLemma;
  }

  return rows[0] ?? null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const word = searchParams.get("word") ?? "";
    const candidates = buildCandidates(word);

    if (candidates.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid word" },
        { status: 400 },
      );
    }

    const supabase = await getServerSupabase();

    const orFilter = [
      ...candidates.map((c) => `text.eq.${c}`),
      ...candidates.map((c) => `lemma.eq.${c}`),
    ].join(",");

    const { data, error } = await supabase
      .from("words")
      .select("text, lemma, pos, meanings_ko, meanings_en_simple, synonyms_en_simple")
      .or(orFilter)
      .limit(20);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    const rows = ((data ?? []) as WordRow[]) ?? [];
    const best = pickBestRow(rows, candidates);

    if (!best) {
      return NextResponse.json({
        ok: true,
        found: false,
        entry: null,
      });
    }

    const meaningsKo = asStringArray(best.meanings_ko);
    const meaningsEn = asStringArray(best.meanings_en_simple);
    const synonyms = asStringArray(best.synonyms_en_simple);

    return NextResponse.json({
      ok: true,
      found: true,
      entry: {
        word: best.text ?? candidates[0],
        lemma: best.lemma ?? candidates[0],
        pos: String(best.pos ?? "").trim(),
        meaning:
          meaningsKo[0] ??
          meaningsEn[0] ??
          "",
        meaningsKo,
        meaningsEn,
        synonyms,
        source: "words",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
