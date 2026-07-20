// apps/web/lib/vocab/parseRawWords.ts
export type RawWordEntry = {
  text: string;
  lemma?: string;
  pos?: string;
  meanings_ko?: string[];
  meanings_en_simple?: string[];
  examples_easy?: string[];
  synonyms_en_simple?: string[];
  collocations?: string[];
  notes?: string;
};

function cleanStr(s: unknown) {
  return String(s ?? "").trim();
}

export function parseRawToWordEntries(raw: string): RawWordEntry[] {
  const src = cleanStr(raw);
  if (!src) return [];

  // 1) JSON array/object
  try {
    const j = JSON.parse(src);
    const arr = Array.isArray(j) ? j : [j];
    return arr
      .map((o: any) => {
        const text = cleanStr(o.text ?? o.word ?? o.lemma);
        if (!text) return null;

        const asArr = (v: any) =>
          Array.isArray(v) ? v.map(cleanStr).filter(Boolean) : [];

        const splitSemi = (v: any) =>
          cleanStr(v)
            .split(/[;|]/g)
            .map((x) => x.trim())
            .filter(Boolean);

        return {
          text,
          lemma: cleanStr(o.lemma) || text,
          pos: cleanStr(o.pos),
          meanings_ko: asArr(o.meanings_ko).length ? asArr(o.meanings_ko) : splitSemi(o.meanings_ko),
          meanings_en_simple: asArr(o.meanings_en_simple).length
            ? asArr(o.meanings_en_simple)
            : splitSemi(o.meanings_en_simple),
          examples_easy: asArr(o.examples_easy).length ? asArr(o.examples_easy) : splitSemi(o.examples_easy),
          synonyms_en_simple: asArr(o.synonyms_en_simple).length
            ? asArr(o.synonyms_en_simple)
            : splitSemi(o.synonyms_en_simple),
          collocations: asArr(o.collocations).length ? asArr(o.collocations) : splitSemi(o.collocations),
          notes: cleanStr(o.notes),
        } satisfies RawWordEntry;
      })
      .filter(Boolean) as RawWordEntry[];
  } catch {}

  // 2) Plain text lines (very forgiving)
  // examples:
  // word\tmeaning
  // word - meaning
  const lines = src.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.map((line) => {
    const m = line.split(/\t| - | — |: /);
    const text = cleanStr(m[0]);
    const meaning = cleanStr(m.slice(1).join(" ").trim());
    return {
      text,
      lemma: text,
      meanings_en_simple: meaning ? [meaning] : [],
    };
  });
}
