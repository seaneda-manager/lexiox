// apps/web/lib/writing/build-sentence-parser.ts
//
// Build a Sentence(Updated TOEFL Writing Task 1) 정답 문장을 ETS 규격의
// Word/Phrase 조각으로 쪼갠다.
//
// 규칙 요약
//  - WORD  : 어순·문법 변별력을 직접 재는 성분 — 의문사, 조동사/시제, 대명사, 동사, 부사
//  - PHRASE: 문장 뼈대를 흔들지 않는 의미 단위 — 관사/소유격+명사, 전치사구, 고정 연결어
//
// 한계: 품사 태거 없이 폐쇄 부류(관사·전치사·대명사·조동사) 목록과 위치 규칙으로
// 근사한다. 명사/동사는 개방 부류라 "폐쇄 부류가 아니면 내용어"로 취급한다.
// 따라서 결과는 초안이고, 관리자가 손볼 수 있어야 한다.

import type { WSentenceToken } from "@/models/writing";

const DETERMINERS = new Set([
  "a", "an", "the",
  "my", "your", "his", "her", "its", "our", "their",
  "this", "that", "these", "those",
  "some", "any", "every", "each", "no", "another",
]);

const PREPOSITIONS = new Set([
  "to", "at", "in", "on", "for", "with", "from", "by", "about",
  "into", "onto", "over", "under", "after", "before", "during",
  "through", "between", "among", "near", "without", "within",
  "against", "across", "around", "behind", "beside", "toward", "towards",
]);

const WH_WORDS = new Set([
  "what", "which", "who", "whom", "whose", "where", "when", "why", "how",
]);

const AUXILIARIES = new Set([
  "is", "am", "are", "was", "were", "be", "been", "being",
  "do", "does", "did",
  "have", "has", "had",
  "will", "would", "can", "could", "shall", "should", "may", "might", "must",
  "not", "n't",
]);

const PRONOUNS = new Set([
  "i", "you", "he", "she", "it", "we", "they",
  "me", "him", "us", "them",
  "myself", "yourself", "himself", "herself", "itself", "ourselves", "themselves",
]);

const CONJUNCTIONS = new Set([
  "and", "or", "but", "so", "because", "although", "though", "while",
  "if", "unless", "since", "that", "whether",
]);

/** 항상 한 덩어리로 묶는 고정 표현 (긴 것부터 매칭) */
const FIXED_PHRASES = [
  "as well as", "in order to", "as soon as", "in spite of",
  "instead of", "because of", "according to", "due to",
  "next year", "next week", "next month", "last year", "last week", "last month",
  "this morning", "this afternoon", "this evening", "tomorrow morning",
  "a lot of", "a couple of", "a few", "a little",
];

/** 폐쇄 부류 = 내용어(명사/형용사)가 아닌 것 */
function isClosedClass(w: string): boolean {
  const t = w.toLowerCase();
  return (
    DETERMINERS.has(t) ||
    PREPOSITIONS.has(t) ||
    WH_WORDS.has(t) ||
    AUXILIARIES.has(t) ||
    PRONOUNS.has(t) ||
    CONJUNCTIONS.has(t)
  );
}

/**
 * 굴절된 동사처럼 보이는지. 명사구가 술어를 삼키는 걸 막는 용도라
 * 명사에 흔한 어미(-ss/-us/-is/-as)는 제외한다.
 */
function looksInflectedVerb(word: string): boolean {
  const t = word.toLowerCase();
  if (/(?:ed|ing)$/.test(t)) return true;
  if (/(?:ss|us|is|as)$/.test(t)) return false; // class, campus, analysis, gas
  return /s$/.test(t);
}

export interface ParseOptions {
  /**
   * 의문사+명사를 하나로 묶을지 (예: "Which bus").
   * 기본 false — ETS 예시 `[what][brand][will][you][buy]`처럼 의문사는 낱개가 원칙.
   */
  mergeWhWithNoun?: boolean;
  /** 명사구/전치사구에 붙일 수 있는 내용어 최대 개수 (기본 2 → "a cooking class") */
  maxContentWordsInPhrase?: number;
}

export interface ParseResult {
  tokens: WSentenceToken[];
  /** 문장 끝 문장부호. 조각으로 만들지 않고 화면에 고정 표시한다. */
  punctuation: string;
}

/**
 * 정답 문장을 조각 배열로 쪼갠다. 반환 순서가 곧 정답 순서다.
 * 화면에 뿌릴 때 셔플하는 건 호출부 책임.
 */
export function parseSentenceToTokens(
  sentence: string,
  options: ParseOptions = {},
): ParseResult {
  const { mergeWhWithNoun = false, maxContentWordsInPhrase = 2 } = options;

  const trimmed = sentence.trim();
  const punctMatch = trimmed.match(/([.?!]+)$/);
  const punctuation = punctMatch ? punctMatch[1] : "";
  const body = punctuation ? trimmed.slice(0, -punctuation.length).trim() : trimmed;

  const words = body.split(/\s+/).filter(Boolean);
  const tokens: WSentenceToken[] = [];
  let i = 0;
  let seq = 0;

  const push = (text: string, type: WSentenceToken["type"]) => {
    tokens.push({ id: `t${++seq}`, text, type });
  };

  /** 위치 at에서 고정 표현이 시작되는지 */
  const fixedPhraseAt = (at: number): string | undefined => {
    const rest = words.slice(at).join(" ").toLowerCase();
    return FIXED_PHRASES.find((p) => rest === p || rest.startsWith(p + " "));
  };

  /**
   * 위치 start부터 내용어를 최대 max개까지 먹는다.
   * 폐쇄 부류를 만나거나, 고정 표현이 시작되는 지점을 만나면 멈춘다.
   * (후자를 안 막으면 "instead of"의 instead, "next year"의 next를 삼켜서 표현이 깨진다.)
   */
  const takeContentWords = (start: number, max: number): number => {
    let n = 0;
    while (
      start + n < words.length &&
      n < max &&
      !isClosedClass(words[start + n]) &&
      !fixedPhraseAt(start + n)
    ) {
      // 이미 내용어를 하나 먹은 뒤에 굴절형(-ed/-ing/-s)이 오면 동사일 확률이 높다.
      // "the meeting | starts"처럼 명사구가 술어를 삼키는 걸 막는다.
      // 단 -ss/-us/-is/-as로 끝나는 건 명사가 대부분이라 제외한다 (class, campus, bus).
      // 완벽하지 않다 — 결과는 초안이고 관리자가 고칠 수 있어야 한다.
      if (n >= 1 && looksInflectedVerb(words[start + n])) break;
      n++;
    }
    return n;
  };

  while (i < words.length) {
    // 1) 고정 표현
    const fixed = fixedPhraseAt(i);
    if (fixed) {
      const count = fixed.split(" ").length;
      push(words.slice(i, i + count).join(" "), "PHRASE");
      i += count;
      continue;
    }

    const w = words[i];
    const lower = w.toLowerCase();

    // 2) 전치사구: 전치사 + (관사) + 내용어 → "to the airport"
    if (PREPOSITIONS.has(lower)) {
      let len = 1;
      const hasDeterminer =
        i + len < words.length && DETERMINERS.has(words[i + len].toLowerCase());
      if (hasDeterminer) len++;

      // "to"는 전치사보다 to부정사 표지인 경우가 많다. 관사가 따라오지 않으면
      // ("to cancel", "to go") 묶지 않고 낱개로 둔다 — 동사는 WORD가 원칙이다.
      if (lower === "to" && !hasDeterminer) {
        push(w, "WORD");
        i += 1;
        continue;
      }

      const content = takeContentWords(i + len, maxContentWordsInPhrase);
      if (content > 0) {
        len += content;
        push(words.slice(i, i + len).join(" "), "PHRASE");
        i += len;
        continue;
      }
      // 뒤에 명사가 없으면 전치사 홀로 (구동사 등)
      push(w, "WORD");
      i += 1;
      continue;
    }

    // 3) 명사구: 관사/소유격 + 내용어 → "the conference", "a cooking class"
    if (DETERMINERS.has(lower)) {
      const content = takeContentWords(i + 1, maxContentWordsInPhrase);
      if (content > 0) {
        push(words.slice(i, i + 1 + content).join(" "), "PHRASE");
        i += 1 + content;
        continue;
      }
      push(w, "WORD");
      i += 1;
      continue;
    }

    // 4) 의문사 + 명사 → 옵션일 때만 묶는다 ("Which bus")
    if (mergeWhWithNoun && WH_WORDS.has(lower)) {
      const content = takeContentWords(i + 1, 1);
      if (content > 0) {
        push(words.slice(i, i + 2).join(" "), "PHRASE");
        i += 2;
        continue;
      }
    }

    // 5) 그 외는 낱개 단어
    push(w, "WORD");
    i += 1;
  }

  return { tokens, punctuation };
}

/** 조각을 사람이 읽는 문장으로 잇는다. 공백은 여기서 한 칸씩 자동 삽입한다. */
export function joinTokens(texts: string[], punctuation = ""): string {
  return texts.join(" ").replace(/\s+/g, " ").trim() + punctuation;
}

/**
 * 문항을 화면·채점이 쓰는 형태로 정규화한다.
 *
 * 신규 문항은 tokens/correctOrder를 그대로 쓰고, 2026-07 이전에 저장된 문항은
 * shuffledChunks/correctSequence에서 만들어낸다. 이때 잉여 조각(unnecessaryChunk)은
 * ETS 근거가 없어 제외한다 — 정답에 쓰이는 조각만 남긴다.
 */
export function normalizeBuildSentenceQuestion(q: {
  tokens?: WSentenceToken[];
  correctOrder?: string[];
  punctuation?: string;
  shuffledChunks?: string[];
  correctSequence?: string[];
}): { tokens: WSentenceToken[]; correctOrder: string[]; punctuation: string } {
  if (q.tokens?.length && q.correctOrder?.length) {
    return {
      tokens: q.tokens,
      correctOrder: q.correctOrder,
      punctuation: q.punctuation ?? "",
    };
  }

  const legacy = q.correctSequence ?? q.shuffledChunks ?? [];
  const tokens: WSentenceToken[] = legacy.map((text, i) => ({
    id: `legacy-${i}`,
    text,
    // 레거시엔 단위 정보가 없다. 공백 유무로 근사한다.
    type: text.trim().includes(" ") ? "PHRASE" : "WORD",
  }));

  return {
    tokens,
    correctOrder: tokens.map((t) => t.id),
    punctuation: q.punctuation ?? "",
  };
}
