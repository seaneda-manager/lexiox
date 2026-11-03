import type { QuestionType, VocabTestQuestion } from "@/models/vocab/test.types";
import { generateTestQuestions, type WordData } from "./questionGenerator";

export const EXAM_QUESTION_TYPES: Array<{ type: QuestionType; label: string; printable: boolean }> = [
  { type: "word_to_meaning", label: "단어 → 뜻", printable: true },
  { type: "meaning_to_word", label: "뜻 → 단어 (스펠링)", printable: true },
  { type: "synonym", label: "동의어 고르기", printable: true },
  { type: "listening", label: "듣기 (온라인 전용)", printable: false },
];

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  word_to_meaning: "단어 → 뜻",
  meaning_to_word: "뜻 → 단어",
  synonym: "동의어",
  listening: "듣기",
};

export function isQuestionType(v: unknown): v is QuestionType {
  return EXAM_QUESTION_TYPES.some(t => t.type === v);
}

/** 트랙의 Day 구간에 속한 단어 ID (중복 제거, Day 순서 유지) */
export async function loadRangeWordIds(
  admin: any,
  trackId: string,
  dayFrom: number,
  dayTo: number
): Promise<string[]> {
  const { data: sets } = await admin
    .from("vocab_sets")
    .select("id, order_index")
    .eq("track_id", trackId)
    .gte("order_index", dayFrom)
    .lte("order_index", dayTo)
    .order("order_index", { ascending: true });

  const setIds: string[] = (sets ?? []).map((s: any) => s.id);
  if (setIds.length === 0) return [];

  const dayOf = new Map<string, number>((sets ?? []).map((s: any) => [s.id, s.order_index]));
  const { data: items } = await admin
    .from("vocab_set_items")
    .select("set_id, word_id, sort_order")
    .in("set_id", setIds)
    .limit(20000);

  const ordered = [...(items ?? [])].sort(
    (a: any, b: any) =>
      (dayOf.get(a.set_id) ?? 0) - (dayOf.get(b.set_id) ?? 0) || (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  return Array.from(new Set(ordered.map((i: any) => i.word_id as string)));
}

/** 뜻 + 동의어(word_synonyms tier 1)를 붙인 WordData 맵 */
export async function loadWordData(admin: any, wordIds: string[]): Promise<Map<string, WordData>> {
  const map = new Map<string, WordData>();
  const CHUNK = 200;
  for (let i = 0; i < wordIds.length; i += CHUNK) {
    const ids = wordIds.slice(i, i + CHUNK);
    const [{ data: words }, { data: synonymRows }] = await Promise.all([
      admin.from("words").select("id, text, meanings_ko, meanings_en_simple").in("id", ids),
      admin
        .from("word_synonyms")
        .select("word_id, synonym:words!word_synonyms_synonym_word_id_fkey(text)")
        .in("word_id", ids)
        .eq("tier", 1),
    ]);

    const synonymsByWordId = new Map<string, string[]>();
    for (const row of synonymRows ?? []) {
      const text = (row as any).synonym?.text;
      if (!text) continue;
      const list = synonymsByWordId.get(row.word_id) ?? [];
      list.push(text);
      synonymsByWordId.set(row.word_id, list);
    }

    for (const w of words ?? []) {
      map.set(w.id, {
        id: w.id,
        text: w.text,
        meanings_ko: w.meanings_ko || [],
        meanings_en: w.meanings_en_simple || [],
        synonyms: synonymsByWordId.get(w.id) || [],
      });
    }
  }
  return map;
}

/**
 * 범위 단어 전체로 문제 후보를 만든 뒤, 선택한 유형에 문항 수를 고르게 나눠 뽑는다.
 * - 유형별 할당량 = count / 유형 수 (나머지는 앞 유형부터 1개씩). 후보가 모자란 유형(예: 동의어 데이터 없음)의
 *   부족분은 다른 유형이 채운다.
 * - 같은 단어가 여러 문제에 반복되지 않도록 아직 안 쓴 단어를 먼저 고른다.
 * - 보기(오답)는 범위 전체 단어에서 뽑으므로 일부 단어만 출제돼도 오답 풀이 넉넉하다.
 */
export async function buildExamQuestions(args: {
  wordIds: string[];
  wordData: Map<string, WordData>;
  types: QuestionType[];
  count: number;
  arrangement: "grouped" | "random";
}): Promise<{ questions: VocabTestQuestion[]; shortfall: number }> {
  const { wordIds, wordData, types, count, arrangement } = args;
  const all = await generateTestQuestions("exam", wordIds, wordData, "grouped");

  const buckets = new Map<QuestionType, VocabTestQuestion[]>();
  for (const t of types) buckets.set(t, []);
  for (const q of all) buckets.get(q.question_type)?.push(q);
  for (const list of buckets.values()) shuffle(list);

  const quota = new Map<QuestionType, number>();
  types.forEach((t, i) => {
    const base = Math.floor(count / types.length) + (i < count % types.length ? 1 : 0);
    quota.set(t, Math.min(base, buckets.get(t)!.length));
  });
  // 부족분 재분배
  let remaining = count - Array.from(quota.values()).reduce((a, b) => a + b, 0);
  while (remaining > 0) {
    let progressed = false;
    for (const t of types) {
      if (remaining === 0) break;
      if ((quota.get(t) ?? 0) < buckets.get(t)!.length) {
        quota.set(t, (quota.get(t) ?? 0) + 1);
        remaining--;
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  const usedWords = new Set<string>();
  const picked: VocabTestQuestion[] = [];
  for (const t of types) {
    const list = buckets.get(t)!;
    const want = quota.get(t) ?? 0;
    const fresh = list.filter(q => !usedWords.has(q.word_id));
    const rest = list.filter(q => usedWords.has(q.word_id));
    const chosen = [...fresh, ...rest].slice(0, want);
    chosen.forEach(q => usedWords.add(q.word_id));
    picked.push(...chosen);
  }

  if (arrangement === "random") shuffle(picked);
  picked.forEach((q, i) => {
    q.question_number = i + 1;
  });
  return { questions: picked, shortfall: Math.max(0, count - picked.length) };
}

function shuffle<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}
