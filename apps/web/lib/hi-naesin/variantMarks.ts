// 변형문제 지문 가공 순수 함수 (AI 결과를 서버가 직접 조립·검증한다).
// 밑줄 표시 형식: ⟦번호|텍스트⟧   빈칸 형식: ____________

export const MARK_RE = /⟦(\d+)\|([^⟧]*)⟧/g;
export const BLANK = '____________';

export type Mark = { target: string; replace?: string };

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 공백 차이·따옴표 종류를 허용해 text 에서 target 의 위치를 찾는다. */
export function findFrom(text: string, target: string, from = 0): { start: number; end: number } | null {
  const t = target.replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const pattern = escapeRe(t)
    .replace(/ /g, '\\s+')
    .replace(/['’]/g, "['’]")
    .replace(/["“”]/g, '["“”]');
  const re = new RegExp(pattern, 'g');
  re.lastIndex = from;
  const m = re.exec(text);
  return m ? { start: m.index, end: m.index + m[0].length } : null;
}

/** 단어 단위 경계 확인 (대명사 "he" 가 "the" 안에서 잡히는 것 방지) */
function atWordBoundary(text: string, start: number, end: number) {
  const isW = (c: string | undefined) => !!c && /[A-Za-z0-9]/.test(c);
  return !isW(text[start - 1]) && !isW(text[end]);
}

function findWord(text: string, target: string, from: number) {
  let pos = from;
  for (;;) {
    const hit = findFrom(text, target, pos);
    if (!hit) return null;
    if (atWordBoundary(text, hit.start, hit.end)) return hit;
    pos = hit.start + 1;
  }
}

/**
 * marks 를 지문에 등장하는 순서대로 찾아 ⟦n|…⟧ 로 감싼다. replace 가 있으면 그 자리의 텍스트를 바꿔 넣는다.
 * 실패(순서 어긋남·못 찾음)는 error 로 반환.
 */
export function buildMarkedPassage(
  passage: string,
  marks: Mark[],
): { ok: true; text: string } | { ok: false; error: string } {
  let out = '';
  let cursor = 0;
  for (let i = 0; i < marks.length; i++) {
    const m = marks[i];
    const hit = findWord(passage, m.target, cursor);
    if (!hit) return { ok: false, error: `mark ${i + 1} not found in order: "${m.target.slice(0, 40)}"` };
    out += passage.slice(cursor, hit.start);
    const shown = m.replace != null ? m.replace : passage.slice(hit.start, hit.end);
    out += `⟦${i + 1}|${shown}⟧`;
    cursor = hit.end;
  }
  out += passage.slice(cursor);
  return { ok: true, text: out };
}

/** target(긴 구/문장)을 빈칸으로 교체 */
export function blankOut(
  passage: string,
  target: string,
): { ok: true; text: string } | { ok: false; error: string } {
  const hit = findFrom(passage, target, 0);
  if (!hit) return { ok: false, error: `blank target not found: "${target.slice(0, 40)}"` };
  return { ok: true, text: `${passage.slice(0, hit.start)}${BLANK}${passage.slice(hit.end)}` };
}

/** 표시된 지문에서 표시 번호 목록 */
export function markNumbers(marked: string): number[] {
  return Array.from(marked.matchAll(new RegExp(MARK_RE.source, 'g'))).map((m) => Number(m[1]));
}

/** 표시를 걷어낸 원문 */
export function stripMarks(marked: string): string {
  return marked.replace(new RegExp(MARK_RE.source, 'g'), (_m, _n, t) => t);
}

/** 1..count 가 각각 정확히 한 번씩 순서대로 등장하는지 */
export function validateMarkSequence(marked: string, count: number): boolean {
  const nums = markNumbers(marked);
  return nums.length === count && nums.every((n, i) => n === i + 1);
}

// ── 보기 배치 ─────────────────────────────────────────────
/** 정답을 원하는 위치(1-5)로 옮기고 나머지 순서는 유지한다. choices[0] 이 정답이어야 한다. */
export function placeCorrect(choices: string[], position: number): { texts: string[]; correctIndex: number } {
  const [correct, ...others] = choices;
  const idx = Math.min(Math.max(position, 1), choices.length) - 1;
  const texts = [...others];
  texts.splice(idx, 0, correct);
  return { texts, correctIndex: idx + 1 };
}

/** 문제 k번째에 쓸 목표 정답 위치(1-5). 문제 간 분포가 고르게 되도록 섞어 순환한다. */
export function targetPositions(n: number, seed = 0): number[] {
  const base = [1, 2, 3, 4, 5];
  // 간단한 결정적 셔플(seed)
  let s = seed + 7;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  return Array.from({ length: n }, (_, i) => base[i % 5]);
}
