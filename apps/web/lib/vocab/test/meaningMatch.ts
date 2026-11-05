/**
 * 단어 → 뜻(주관식) 채점.
 *
 * 문제: 뜻이 "달성하다, 이루다" 처럼 한 문자열에 쉼표로 묶여 있거나 "(사실이라고) 추정하다[생각하다]" 처럼
 * 괄호 설명이 붙어 있으면, 학생이 부호·괄호까지 똑같이 써야 정답이 되었다.
 *
 * 규칙:
 *  1. 뜻을 "항목"으로 나눈다 — 괄호 밖의  ,  ;  ·  /  | 줄바꿈 기준 (괄호 안의 · 같은 것은 나누지 않는다)
 *  2. 항목마다 인정하는 답: 괄호 설명을 뺀 핵심 뜻 + 전체 + [대괄호 안의 동의 표현]
 *  3. 비교는 띄어쓰기·부호·대소문자 무시, "~하다/~되다/~시키다" 어미를 뺀 형태도 인정 (2글자 이상일 때)
 *  4. 입력칸 수 = 항목 수 (최대 2개). 칸마다 뜻 하나씩, 순서 상관없이, 같은 뜻을 두 번 쓰면 한 번만 인정
 *     항목이 3개 이상이면 아무 2개를 쓰면 정답
 *  5. 한 칸에 "a, b" 처럼 여러 개를 써도 나눠서 인정 (예전 방식으로 쓴 답도 정답 처리)
 */

export const MAX_MEANING_SLOTS = 2;

export type MeaningUnit = {
  /** 화면에 보여줄 원문 */
  text: string;
  /** 인정하는 정규화된 답들 */
  forms: Set<string>;
};

const OPEN = new Set(["(", "[", "（", "［", "{"]);
const CLOSE = new Set([")", "]", "）", "］", "}"]);
const SEPARATORS = new Set([",", ";", "，", "；", "·", "/", "|", "\n"]);

/** 괄호 밖의 구분 기호에서만 나눈다 */
export function splitTopLevel(input: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of String(input ?? "")) {
    if (OPEN.has(ch)) depth++;
    else if (CLOSE.has(ch)) depth = Math.max(0, depth - 1);
    if (depth === 0 && SEPARATORS.has(ch)) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

/** 비교용 정규화: 소문자, 공백·부호·괄호 문자 제거 */
export function normMeaning(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[\s,.;:·/|\-~!?'"`()[\]{}（）［］，；…]/g, "");
}

function stripNotes(s: string): string {
  return s.replace(/\([^)]*\)|（[^）]*）|\[[^\]]*\]|［[^］]*］/g, " ");
}

function bracketAlts(s: string): string[] {
  const out: string[] = [];
  for (const m of s.matchAll(/\[([^\]]+)\]|［([^］]+)］/g)) out.push((m[1] ?? m[2] ?? "").trim());
  return out.filter(Boolean);
}

/** "~하다/~되다/~시키다" 를 뗀 형태 (동사형 어미 차이를 너그럽게) */
function stem(form: string): string {
  // 동사(~하다/~되다/~시키다), 형용사·부사·관형어 어미(~한/~인/~적인/~히/~게 …)의 차이를 너그럽게
  return form.replace(/(시키다|하다|되다|스러운|로운|적인|하는|되는|하게|한|된|인|적|히|게)$/, "");
}

/** "~에게 말하다", "~을 막다" 처럼 앞의 ~(와 조사)를 뗀 형태 */
function stripPlaceholder(s: string): string {
  return s.replace(/^\s*[~∼～…]+\s*(에게서|에게|에서|으로|에|의|을|를|와|과|로|은|는|이|가|도)?\s*/, "");
}

function formsOf(unit: string): Set<string> {
  const forms = new Set<string>();
  const add = (s: string) => {
    const n = normMeaning(s);
    if (n) forms.add(n);
  };
  add(unit); // 전체(괄호 포함)
  add(stripNotes(unit)); // 핵심 뜻
  add(stripPlaceholder(stripNotes(unit))); // ~ 와 조사를 뗀 뜻
  for (const alt of bracketAlts(unit)) add(alt); // [생각하다] 같은 동의 표현
  return forms;
}

/** 뜻 배열 → 항목 목록 (핵심 뜻이 같으면 한 항목으로) */
export function extractMeaningUnits(meanings: string[] | null | undefined): MeaningUnit[] {
  const units: MeaningUnit[] = [];
  const seenCore = new Set<string>();
  for (const m of meanings ?? []) {
    for (const part of splitTopLevel(String(m ?? ""))) {
      const core = normMeaning(stripNotes(part)) || normMeaning(part);
      if (!core || seenCore.has(core)) continue;
      seenCore.add(core);
      units.push({ text: part, forms: formsOf(part) });
    }
  }
  return units;
}

/** 입력칸 수: 항목 수(최대 2), 최소 1 */
export function slotCountFor(meanings: string[] | null | undefined): number {
  const n = extractMeaningUnits(meanings).length;
  return Math.max(1, Math.min(MAX_MEANING_SLOTS, n));
}

function matches(unit: MeaningUnit, answerNorm: string): boolean {
  if (unit.forms.has(answerNorm)) return true;
  const a = stem(answerNorm);
  if (a.length < 2) return false;
  for (const f of unit.forms) {
    if (stem(f) === a && a.length >= 2) return true;
  }
  return false;
}

export type MeaningGrade = {
  correct: boolean;
  /** 맞힌 서로 다른 뜻 수 */
  matched: number;
  /** 정답이 되려면 필요한 수 */
  needed: number;
  /** 학생이 쓴 칸 중 맞은 칸의 번호(0부터) — 화면 표시용 */
  correctSlots: number[];
};

/**
 * @param answers 입력칸별 답 (한 칸에 여러 개를 써도 된다)
 * @param meanings 문제의 뜻(meaning_ko)
 */
export function gradeMeaningAnswer(answers: string[], meanings: string[] | null | undefined): MeaningGrade {
  const units = extractMeaningUnits(meanings);
  const needed = Math.max(1, Math.min(MAX_MEANING_SLOTS, units.length));
  const used = new Set<number>();
  const correctSlots: number[] = [];

  answers.forEach((raw, slot) => {
    let slotOk = false;
    for (const part of splitTopLevel(raw)) {
      const a = normMeaning(part);
      if (!a) continue;
      const idx = units.findIndex((u, i) => !used.has(i) && matches(u, a));
      if (idx >= 0) {
        used.add(idx);
        slotOk = true;
      }
    }
    if (slotOk) correctSlots.push(slot);
  });

  return { correct: units.length > 0 && used.size >= needed, matched: used.size, needed, correctSlots };
}

/** 서버·화면이 주고받는 답 문자열(칸 구분은 줄바꿈) ↔ 배열 */
export const joinSlotAnswers = (slots: string[]): string => slots.map((s) => s.trim()).join("\n");
export const splitSlotAnswers = (answer: string | null | undefined): string[] => String(answer ?? "").split("\n");

/**
 * 입력칸 위에 보여줄 품사 힌트. 뜻 끝말로 추정한다(DB에 품사 정보가 없음).
 * 확신이 없으면 null.
 */
export function posHintOf(unitText: string): string | null {
  const t = stripNotes(String(unitText ?? "")).trim().replace(/[\s.]+$/, "");
  if (!t) return null;
  if (/(적으로|하게|히|이|게)$/.test(t) && !/다$/.test(t) && t.length >= 3) return "부사";
  if (/다$/.test(t)) return "동사"; // 형용사도 다로 끝나지만 사전식 뜻은 대개 ~한 형태
  if (/(한|운|은|인|적인|스러운|로운|는|ㄴ)$/.test(t)) return "형용사";
  return "명사";
}

/** 칸별 품사 힌트 (칸 수만큼). 항목이 칸보다 많으면 앞에서부터 */
export function slotPosHints(meanings: string[] | null | undefined): (string | null)[] {
  const units = extractMeaningUnits(meanings);
  const n = Math.max(1, Math.min(MAX_MEANING_SLOTS, units.length));
  return Array.from({ length: n }, (_, i) => (units[i] ? posHintOf(units[i].text) : null));
}
