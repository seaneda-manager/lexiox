// 연결어(접속사·접속부사) 빈칸 드릴용 탐지 로직. 순수 함수 — 서버/클라이언트 어디서든 쓴다.
//
// 목록 기반 자동 탐지라 오탐을 줄이려고 모호한 단어는 위치 조건을 둔다.
//  - 'start' : 문장 맨 앞(대화문 화자 표시 "B :" 는 건너뜀)에서만 연결어로 인정
//  - 'clause': 문장 맨 앞이거나 쉼표/세미콜론 바로 뒤
//  - 'any'   : 문장 어디서든 (because, however 처럼 거의 항상 연결어인 말)
// 'and', 'or', 'since', 'while', 'when' 처럼 연결어가 아닌 쓰임이 흔한 말은 일부러 뺐다.

export type ConnectorCategory = 'contrast' | 'result' | 'reason' | 'addition' | 'example' | 'sequence' | 'condition';

export const CONNECTOR_CATEGORY_LABEL: Record<ConnectorCategory, string> = {
  contrast: '역접·대조',
  result: '결과',
  reason: '이유',
  addition: '추가',
  example: '예시',
  sequence: '순서',
  condition: '조건',
};

type Where = 'start' | 'clause' | 'any';
// kind: 접속사(conj: 절과 절을 직접 잇는 말) / 접속부사(adv: 문장 앞·중간에 끼는 말).
// 오답은 같은 kind 안에서만 뽑아서 문법만 보고 소거되지 않게 한다.
type Kind = 'conj' | 'adv';
type Def = { text: string; category: ConnectorCategory; where: Where; kind?: Kind };

export const CONNECTORS: Def[] = [
  { text: 'however', category: 'contrast', where: 'any', kind: 'adv' },
  { text: 'but', category: 'contrast', where: 'clause', kind: 'conj' },
  { text: 'although', category: 'contrast', where: 'any', kind: 'conj' },
  { text: 'though', category: 'contrast', where: 'any', kind: 'conj' },
  { text: 'on the other hand', category: 'contrast', where: 'any', kind: 'adv' },
  { text: 'therefore', category: 'result', where: 'any', kind: 'adv' },
  { text: 'as a result', category: 'result', where: 'any', kind: 'adv' },
  { text: 'thus', category: 'result', where: 'start', kind: 'adv' },
  { text: 'so', category: 'result', where: 'clause', kind: 'conj' },
  { text: 'because', category: 'reason', where: 'any', kind: 'conj' },
  { text: 'in addition', category: 'addition', where: 'any', kind: 'adv' },
  { text: 'moreover', category: 'addition', where: 'any', kind: 'adv' },
  { text: 'besides', category: 'addition', where: 'start', kind: 'adv' },
  { text: 'also', category: 'addition', where: 'start', kind: 'adv' },
  { text: 'for example', category: 'example', where: 'any', kind: 'adv' },
  { text: 'for instance', category: 'example', where: 'any', kind: 'adv' },
  { text: 'first', category: 'sequence', where: 'start', kind: 'adv' },
  { text: 'then', category: 'sequence', where: 'start', kind: 'adv' },
  { text: 'next', category: 'sequence', where: 'start', kind: 'adv' },
  { text: 'after that', category: 'sequence', where: 'start', kind: 'adv' },
  { text: 'finally', category: 'sequence', where: 'start', kind: 'adv' },
  { text: 'if', category: 'condition', where: 'any', kind: 'conj' },
  { text: 'unless', category: 'condition', where: 'any', kind: 'conj' },
];

// 문장 맨 앞의 번호/화자 표시("B :", "Mina:")는 연결어 위치 판단에서 건너뛴다.
const SPEAKER_PREFIX = /^\s*(?:[A-Za-z가-힣]{1,10}\s*:\s*)?/;

export type ConnectorMatch = {
  def: Def;
  start: number; // 문장 문자열 안에서의 위치
  end: number;
  original: string; // 문장에 실제로 쓰인 철자(대소문자 유지)
};

function matchAt(sentence: string, def: Def): ConnectorMatch | null {
  const re = new RegExp(`(^|[^A-Za-z'’])(${def.text.replace(/ /g, '\\s+')})(?![A-Za-z'’])`, 'gi');
  const prefixLen = (sentence.match(SPEAKER_PREFIX)?.[0] ?? '').length;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sentence))) {
    const start = m.index + m[1].length;
    const before = sentence.slice(0, start);
    const atStart = before.trim().length === 0 || start <= prefixLen;
    const afterComma = /[,;]\s*$/.test(before);
    const ok = def.where === 'any' || (def.where === 'start' && atStart) || (def.where === 'clause' && (atStart || afterComma));
    if (!ok) continue;
    // 'so'/'then'/'first'/'next'/'also' 가 문장 맨 앞일 때: "So, ..." 처럼 쉼표가 따르거나 바로 주어가 이어지는 경우만.
    // "So tired", "First place" 같은 형용사·명사 쓰임은 거른다(뒤에 쉼표가 없고 다음 단어가 대문자가 아닌 소문자 형용사인 경우는 알 수 없으므로 쉼표 없는 so/first 는 제외).
    const after = sentence.slice(start + m[2].length);
    if ((def.text === 'so' || def.text === 'first' || def.text === 'next') && atStart && !/^\s*,/.test(after)) continue;
    if (def.text === 'if' && /\b(as|what|even)\s*$/i.test(before)) continue; // "as if", "what if", "even if" 은 제외(보기 구분이 모호)
    return { def, start, end: start + m[2].length, original: sentence.slice(start, start + m[2].length) };
  }
  return null;
}

/** 문장 하나에서 연결어를 하나 찾는다(여러 개면 긴 표현 우선, 그다음 앞쪽). 없으면 null. */
export function findConnector(sentence: string): ConnectorMatch | null {
  const found = CONNECTORS.map((d) => matchAt(sentence, d)).filter((x): x is ConnectorMatch => !!x);
  if (found.length === 0) return null;
  // 겹치는 후보(예: "for example" 안의 다른 단어)는 긴 것을 택한다
  found.sort((a, b) => b.def.text.length - a.def.text.length || a.start - b.start);
  return found[0];
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export type ConnectorItem = {
  sentenceIndex: number;
  before: string | null; // 앞 문장(문맥)
  template: string; // 빈칸은 '___'
  answer: string; // 문장에 쓰인 철자 그대로
  category: ConnectorCategory;
  choices: string[]; // 섞기 전 순서(정답 포함)
};

/**
 * 오답 3개. 정답은 지문에 나온 연결어 하나뿐이다(채점은 보기 선택이라 그 단어만 정답).
 * 같은 갈래는 정답과 의미가 겹쳐 억울한 오답이 되므로 제외하고, 같은 품사 계열(kind)에서 갈래당 하나씩 뽑는다.
 * 그 단원 지문에 실제로 나온 연결어를 먼저 쓰고, 모자라면 기본 목록으로 채운다.
 */
function distractors(answer: ConnectorMatch, seed: number, passageTexts: string[]): string[] {
  const ok = (c: Def) =>
    c.kind === answer.def.kind && c.category !== answer.def.category && c.text !== answer.def.text.toLowerCase();
  const fromPassage = CONNECTORS.filter((c) => ok(c) && passageTexts.includes(c.text));
  const fromList = CONNECTORS.filter((c) => ok(c) && !passageTexts.includes(c.text));

  const picked: Def[] = [];
  const usedCats = new Set<ConnectorCategory>();
  for (const pool of [fromPassage, fromList]) {
    // 풀 안에서는 seed 로 시작 위치만 달리해서 문제마다 보기가 조금씩 달라지게 한다
    for (let k = 0; k < pool.length && picked.length < 3; k++) {
      const c = pool[(seed + k) % pool.length];
      if (usedCats.has(c.category)) continue;
      usedCats.add(c.category);
      picked.push(c);
    }
  }
  return picked.map((c) => c.text);
}

export function buildConnectorItems(sentences: { en: string }[]): ConnectorItem[] {
  const items: ConnectorItem[] = [];
  // 지문 전체에 나온 연결어(소문자 표기) — 오답 후보 우선순위용
  const passageTexts = [...new Set(sentences.map((s) => findConnector(s.en)?.def.text).filter((t): t is string => !!t))];
  sentences.forEach((s, i) => {
    const m = findConnector(s.en);
    if (!m) return;
    const cap = /^[A-Z]/.test(m.original);
    const fmt = (t: string) => (cap ? capitalize(t) : t);
    items.push({
      sentenceIndex: i,
      before: i > 0 ? sentences[i - 1].en : null,
      template: `${s.en.slice(0, m.start)}___${s.en.slice(m.end)}`,
      answer: m.original,
      category: m.def.category,
      choices: [m.original, ...distractors(m, i + items.length, passageTexts).map(fmt)],
    });
  });
  return items;
}
