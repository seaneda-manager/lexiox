// 직전 공부 요약본의 체크 퀴즈 생성기. 순수 함수만 두어 서버 페이지와 테스트에서 함께 쓴다.
import { MIDDLE_GRAMMAR_PATTERNS } from '../../models/middle-naesin/drill';
import type { MiddleDrillVocabItem, MiddleDrillSentence } from '../../models/middle-naesin/drill';
import type { GrammarLesson } from '../../models/middle-naesin/grammar-lesson';

// ── 난수 (같은 seed 면 같은 순서 → 정답지와 문제지가 항상 맞는다) ──────────
export type Rng = () => number;

export function makeRng(seed: string): Rng {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const letter = (i: number) => String.fromCharCode(65 + i);
const norm = (s: string) => s.trim().toLowerCase();

// ── 1. 문법 분류: 여러 문법의 규칙·예문을 섞어 어느 문법인지 고르게 ────────────
export type GrammarClassifyQuiz = {
  options: { letter: string; label: string }[];
  items: { no: number; en: string; ko: string | null; answer: string }[];
};

export function buildGrammarClassify(
  points: { topic: string; lesson: GrammarLesson }[],
  rng: Rng,
  maxPerTopic = Infinity,
): GrammarClassifyQuiz | null {
  if (points.length < 2) return null;
  const options = points.map((p, i) => ({ letter: letter(i), label: p.topic }));
  const raw: { en: string; ko: string | null; answer: string }[] = [];
  const seen = new Set<string>();

  points.forEach((p, i) => {
    const e = p.lesson.explanation;
    const cand: { en: string; ko: string | null }[] = [
      ...e.rules.map((r) => ({ en: r.en, ko: r.ko })),
      ...e.examples.map((x) => ({ en: x.en, ko: x.ko })),
      ...p.lesson.blanks.map((b) => ({ en: b.text.replace('___', b.answer), ko: null })),
    ];
    let n = 0;
    for (const c of cand) {
      const key = norm(c.en);
      if (!key || seen.has(key) || n >= maxPerTopic) continue;
      seen.add(key);
      raw.push({ ...c, answer: letter(i) });
      n++;
    }
  });

  const items = shuffle(raw, rng).map((x, i) => ({ no: i + 1, ...x }));
  return { options, items };
}

// ── 2. 단어(한→영) / 숙어(전치사 등 빈칸) ──────────────────────────────────
// 단서(clue): 한글 뜻이 있으면 그것을, 없으면 사전 → 영영 정의 순으로 채운다.
export type Clue = { text: string; kind: 'ko' | 'dict' | 'def' };
export type WordQuiz = { items: { no: number; clue: Clue; answer: string }[] };
export type PhraseQuiz = { items: { no: number; text: string; clue: Clue | null; answer: string }[] };
export type KoLookup = (word: string) => string | null;

const isPhrase = (w: string) => /\s/.test(w.trim()) && w.trim().split(/\s+/).length <= 5 && !/[.?!]$/.test(w.trim());
const hasHangul = (s: string | null | undefined): s is string => !!s && /[가-힣]/.test(s);

export function clueOf(v: MiddleDrillVocabItem, lookup?: KoLookup): Clue | null {
  const ko = v.koGloss ?? (v.kind === 'ko' ? v.definition : null);
  if (hasHangul(ko)) return { text: ko, kind: 'ko' };
  const dict = lookup?.(v.word.trim().toLowerCase());
  if (hasHangul(dict)) return { text: dict, kind: 'dict' };
  const def = (v.kind === 'en_en' ? v.definition : '').trim();
  if (!def) return null;
  // 정의 속에 정답 단어가 그대로 들어 있으면 가린다.
  const masked = def.replace(new RegExp(`\\b${v.word.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*`, 'gi'), '____');
  return { text: masked, kind: 'def' };
}

function uniqueVocab(vocab: MiddleDrillVocabItem[]): MiddleDrillVocabItem[] {
  const m = new Map<string, MiddleDrillVocabItem>();
  for (const v of vocab) {
    const k = norm(v.word);
    const prev = m.get(k);
    if (!prev || (!hasHangul(prev.koGloss) && hasHangul(v.koGloss))) m.set(k, v);
  }
  return [...m.values()];
}

export function buildWordQuiz(vocab: MiddleDrillVocabItem[], rng: Rng, lookup?: KoLookup): WordQuiz | null {
  const items: { clue: Clue; answer: string }[] = [];
  for (const v of uniqueVocab(vocab).filter((x) => !isPhrase(x.word))) {
    const clue = clueOf(v, lookup);
    if (clue) items.push({ clue, answer: v.word.trim() });
  }
  if (items.length === 0) return null;
  return { items: shuffle(items, rng).map((x, i) => ({ no: i + 1, ...x })) };
}

const PARTICLES = new Set([
  'in', 'on', 'at', 'up', 'out', 'off', 'for', 'to', 'of', 'with', 'from', 'into', 'about', 'over', 'down',
  'away', 'back', 'by', 'after', 'along', 'around', 'through', 'against', 'across', 'behind', 'between', 'under',
]);
// 비울 대상이 아닌 토큰(관사·대용어·기호)
const NOT_BLANKABLE = new Set([
  'a', 'an', 'the', 'to', 'sb', 'sth', 'sb\'s', 'one', 'ones', 'one\'s', 'oneself', 'someone', 'someone\'s', 'something',
  'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'themselves',
]);

export function blankPhrase(phrase: string, rng: Rng): { text: string; answer: string } {
  const tokens = phrase.trim().split(/\s+/);
  const clean = (t: string) => t.replace(/[^A-Za-z']/g, '').toLowerCase();
  const all = tokens.map((_, i) => i);

  // 1) 전치사·부사 (첫 단어보다 뒤의 것을 우선). 여러 개면 그중 무작위
  let cands = all.filter((i) => i >= 1 && PARTICLES.has(clean(tokens[i])));
  if (cands.length === 0) cands = all.filter((i) => PARTICLES.has(clean(tokens[i])));
  if (cands.length > 0) {
    const idx = cands[Math.floor(rng() * cands.length)];
    return { text: tokens.map((t, i) => (i === idx ? '________' : t)).join(' '), answer: tokens[idx].replace(/[,.;]$/, '') };
  }

  // 2) 전치사가 없으면 핵심 단어(동사·명사 등)를 무작위로 비우되, 첫 글자를 힌트로 남긴다
  const content = all.filter((i) => /[A-Za-z]/.test(tokens[i]) && !NOT_BLANKABLE.has(clean(tokens[i])) && !/^[~(…]/.test(tokens[i]));
  const pool = content.length > 0 ? content : [tokens.length - 1];
  const idx = pool[Math.floor(rng() * pool.length)];
  const answer = tokens[idx].replace(/[,.;]$/, '');
  const blank = `${answer[0]}______`;
  return { text: tokens.map((t, i) => (i === idx ? blank : t)).join(' '), answer };
}

export function buildPhraseQuiz(vocab: MiddleDrillVocabItem[], rng: Rng, lookup?: KoLookup): PhraseQuiz | null {
  const phrases = uniqueVocab(vocab).filter((v) => isPhrase(v.word));
  if (phrases.length === 0) return null;
  const items = shuffle(phrases, rng).map((v, i) => {
    const b = blankPhrase(v.word, rng);
    return { no: i + 1, text: b.text, clue: clueOf(v, lookup), answer: b.answer };
  });
  return { items };
}

// ── 3. 문장 순서 잡기 (대화문 · 본문 · More Reading 공통) ──────────────────
export type OrderQuiz = {
  title: string;
  first: string; // 맨 앞에 고정으로 주어지는 문장
  shuffled: { letter: string; text: string }[];
  answer: string; // 예: "C-A-D-B"
};

export function buildOrderQuizzes(
  parts: { title: string; sentences: { en: string }[] }[],
  rng: Rng,
  opts: { size?: number; maxChunks?: number } = {},
): OrderQuiz[] {
  const size = opts.size ?? 5;
  const maxChunks = opts.maxChunks ?? 3;
  const out: OrderQuiz[] = [];

  for (const part of parts) {
    const sents = part.sentences.map((s) => s.en.trim()).filter(Boolean);
    const chunks: string[][] = [];
    for (let i = 0; i < sents.length; i += size) chunks.push(sents.slice(i, i + size));
    if (chunks.length > 1 && chunks[chunks.length - 1].length < 4) {
      chunks[chunks.length - 2].push(...(chunks.pop() ?? []));
    }
    for (const [ci, chunk] of chunks.entries()) {
      if (out.length >= maxChunks) return out;
      if (chunk.length < 4) continue;
      const [first, ...rest] = chunk;
      let order = shuffle(rest.map((_, i) => i), rng);
      for (let t = 0; t < 5 && order.every((v, i) => v === i); t++) order = shuffle(order, rng);
      const shuffled = order.map((origIdx, pos) => ({ letter: letter(pos), text: rest[origIdx] }));
      // 원래 순서대로 읽었을 때의 글자 나열
      const answer = rest.map((_, origIdx) => letter(order.indexOf(origIdx))).join('-');
      out.push({ title: chunks.length > 1 ? `${part.title} (${ci + 1})` : part.title, first, shuffled, answer });
    }
  }
  return out;
}

// ── 4. 대화문: 주요 표현 분류 / 질문-응답 짝짓기 ────────────────────────────
// 관리자가 대화문 콘텐츠 extra_data.keyExpressions 에 직접 넣은 데이터를 쓴다.
export type KeyExpressionGroup = { title: string; expressions: string[]; replies: string[] };

export function parseKeyExpressions(extra: unknown): KeyExpressionGroup[] {
  const raw = (extra as { keyExpressions?: unknown } | null)?.keyExpressions;
  if (!Array.isArray(raw)) return [];
  const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()) : []);
  return raw
    .map((g) => {
      const o = g as { title?: unknown; expressions?: unknown; replies?: unknown };
      return { title: typeof o.title === 'string' ? o.title : '', expressions: strs(o.expressions), replies: strs(o.replies) };
    })
    .filter((g) => g.title && (g.expressions.length > 0 || g.replies.length > 0));
}

export type ExpressionClassifyQuiz = {
  options: { letter: string; label: string }[];
  items: { no: number; text: string; answer: string }[];
};

export function buildExpressionClassify(groups: KeyExpressionGroup[], rng: Rng): ExpressionClassifyQuiz | null {
  if (groups.length === 0) return null;
  const options: { letter: string; label: string }[] = [];
  const raw: { text: string; answer: string }[] = [];
  for (const g of groups) {
    if (g.expressions.length > 0) {
      const l = letter(options.length);
      options.push({ letter: l, label: `${g.title} — 표현(대체 표현)` });
      g.expressions.forEach((text) => raw.push({ text, answer: l }));
    }
    if (g.replies.length > 0) {
      const l = letter(options.length);
      options.push({ letter: l, label: `${g.title} — 답하는 표현` });
      g.replies.forEach((text) => raw.push({ text, answer: l }));
    }
  }
  return { options, items: shuffle(raw, rng).map((x, i) => ({ no: i + 1, ...x })) };
}

export type QaMatchQuiz = {
  title: string;
  questions: { no: number; text: string }[];
  replies: { letter: string; text: string }[];
  answer: string; // 예: "1-C, 2-A"
};

const stripSpeaker = (s: string) => s.replace(/^\s*[A-Za-z가-힣]{1,10}\s*:\s*/, '').trim();

// 표현 데이터가 없을 때의 대안: 대화문의 (물음 → 응답) 이웃 문장을 짝짓기로 낸다.
export function buildQaMatch(
  parts: { title: string; sentences: { en: string }[] }[],
  rng: Rng,
  max = 6,
): QaMatchQuiz | null {
  const pairs: { q: string; a: string }[] = [];
  for (const part of parts) {
    const s = part.sentences.map((x) => stripSpeaker(x.en));
    for (let i = 0; i + 1 < s.length; i++) {
      if (s[i].endsWith('?') && !s[i + 1].endsWith('?') && s[i + 1].length > 1) pairs.push({ q: s[i], a: s[i + 1] });
    }
  }
  const pick = shuffle(pairs, rng).slice(0, max);
  if (pick.length < 3) return null;
  const order = shuffle(pick.map((_, i) => i), rng);
  const replies = order.map((orig, pos) => ({ letter: letter(pos), text: pick[orig].a }));
  return {
    title: '질문에 알맞은 응답 연결하기',
    questions: pick.map((p, i) => ({ no: i + 1, text: p.q })),
    replies,
    answer: pick.map((_, i) => `${i + 1}-${letter(order.indexOf(i))}`).join(', '),
  };
}

// ── 5. 본문: 문장별 문법 라벨 (보기 2개 중 맞는 설명 고르기) ───────────────────
export type LabelItem = { no: number; en: string; ko: string | null; a: string; b: string; answer: 'A' | 'B'; auto: boolean };

type Detector = { key: string; re: RegExp; reject?: (m: RegExpMatchArray) => boolean; right: (frag: string) => string; wrong: (frag: string) => string };

const PRE_THAT_BLOCK = new Set([
  'think', 'thought', 'know', 'knew', 'say', 'said', 'hope', 'hoped', 'believe', 'believed', 'feel', 'felt', 'see', 'saw',
  'hear', 'heard', 'learn', 'learned', 'wish', 'sure', 'glad', 'fact', 'news', 'idea', 'so', 'me', 'him', 'her', 'us', 'them',
  'you', 'tell', 'told', 'show', 'showed', 'find', 'found', 'notice', 'noticed', 'remember', 'realize', 'realized', 'decide', 'decided',
]);

const STOP_AFTER_OBJ =
  '(?!(?:in|on|at|to|for|with|from|of|and|but|or|by|about|that|who|which|when|is|are|was|were|as|so|too|very|if|because)\\b)';

const DETECTORS: Detector[] = [
  {
    key: 'so_that',
    re: /\bso\s+(?:[A-Za-z'-]+\s+){1,3}?that\b/,
    right: (f) => `「${f}」 so + 형용사/부사 + that + 주어 + 동사 → ‘너무 ~해서 …하다’ (결과)`,
    wrong: (f) => `「${f}」 so that = ‘~하기 위해서’ (목적을 나타내는 부사절)`,
  },
  {
    key: 'used_to',
    re: /(?<!\b(?:am|is|are|was|were|be|been|being|get|got|getting)\s)\b(?:used|use) to\s+(?!the\b|a\b|an\b|my\b|your\b|his\b|her\b|our\b|their\b)[a-z]+(?!ing\b)\b/,
    right: (f) => `「${f}」 used to + 동사원형 → 과거의 습관·상태 (~하곤 했다, 예전에는 ~였다)`,
    wrong: (f) => `「${f}」 be used to + v-ing → ‘~하는 데 익숙하다’`,
  },
  {
    key: 'perception',
    re: new RegExp(
      `\\b(?:see|sees|saw|seen|watch|watches|watched|hear|hears|heard|listen to|listens to|listened to|feel|feels|felt|notice|notices|noticed|smell|smells|smelled)\\s+(?:(?:me|him|her|us|them|you|it)\\s+${STOP_AFTER_OBJ}[a-z]+|(?:(?:the|a|an|my|your|his|her|our|their|this)\\s+[a-z]+|[A-Z][a-z]+)\\s+[a-z]+ing)\\b`,
    ),
    right: (f) => `「${f}」 5형식 지각동사 + 목적어 + 목적격보어(원형부정사 / v-ing)`,
    wrong: (f) => `「${f}」 4형식: 동사 + 간접목적어 + 직접목적어 (~에게 …을 해 주다)`,
  },
  {
    key: 'obj_rel',
    re: /\b([A-Za-z]+)\s+(?:that|which|whom|who)\s+(?:I|you|we|they|he|she|it|[A-Z][a-z]+|my|your|his|her|our|their|the|a|an)\s+[a-z]+/,
    reject: (m) => PRE_THAT_BLOCK.has(m[1].toLowerCase()),
    right: (f) => `「${f}」 목적격 관계대명사: 선행사 + (who(m)/which/that) + 주어 + 동사 → 관계사 뒤 문장에 목적어가 빠진다`,
    wrong: (f) => `「${f}」 주격 관계대명사: 관계사가 주어 역할 → 바로 뒤에 동사가 온다`,
  },
];

function detect(en: string): { right: string; wrong: string } | null {
  for (const d of DETECTORS) {
    const m = en.match(d.re);
    if (!m || d.reject?.(m)) continue;
    return { right: d.right(m[0]), wrong: d.wrong(m[0]) };
  }
  return null;
}

const FORMS = ['1형식', '2형식', '3형식', '4형식', '5형식'];

function describeAnnotation(s: MiddleDrillSentence, rng: Rng): { right: string; wrong: string } | null {
  const tags: string[] = s.grammarAnswers ?? [];
  if (tags.length === 0) return null;
  const st = s.structureAnswer;
  const parts = st
    ? ([['S', st.subject], ['V', st.verb], ['O', st.object], ['C', st.complement]] as const)
        .filter(([, v]) => v && v.trim())
        .map(([k, v]) => `${k}: ${v}`)
    : [];
  const structure = parts.length > 0 ? ` (${parts.join(' / ')})` : '';
  const pool = (tags[0] && FORMS.includes(tags[0]) ? FORMS : ([...MIDDLE_GRAMMAR_PATTERNS] as string[])).filter((p) => !tags.includes(p));
  const swap = pool[Math.floor(rng() * pool.length)];
  if (!swap) return null;
  return {
    right: `${tags.join(' · ')}${structure}`,
    wrong: `${[swap, ...tags.slice(1)].join(' · ')}${structure}`,
  };
}

export function buildGrammarLabelQuiz(sentences: MiddleDrillSentence[], rng: Rng, max = 8): LabelItem[] {
  const picks: { s: MiddleDrillSentence; right: string; wrong: string; auto: boolean }[] = [];
  for (const s of sentences) {
    const ann = describeAnnotation(s, rng);
    if (ann) picks.push({ s, ...ann, auto: false });
  }
  const autoPicks: typeof picks = [];
  for (const s of sentences) {
    if ((s.grammarAnswers ?? []).length > 0) continue;
    const d = detect(s.en);
    if (d) autoPicks.push({ s, ...d, auto: true });
  }
  const chosen = [...picks, ...autoPicks].slice(0, max);
  return chosen.map((c, i) => {
    const rightFirst = rng() < 0.5;
    return {
      no: i + 1,
      en: c.s.en,
      ko: c.s.ko,
      a: rightFirst ? c.right : c.wrong,
      b: rightFirst ? c.wrong : c.right,
      answer: rightFirst ? 'A' : 'B',
      auto: c.auto,
    };
  });
}
