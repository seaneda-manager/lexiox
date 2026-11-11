// lib/hi-naesin/termTools.ts
// (1) 지문 핵심 어휘 자동 추출  (2) 학생이 하이라이트한 단어/구의 뜻·품사 조회
// 서버 전용. Claude Haiku 사용, 결과는 DB 캐시.

import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

export type TermKind = 'word' | 'phrase' | 'phrasal_verb' | 'idiom' | 'term';

export const TERM_KIND_LABEL: Record<TermKind, string> = {
  word: '단어',
  phrase: '구/표현',
  phrasal_verb: '구동사',
  idiom: '관용구',
  term: '전문용어',
};

export type KeyTerm = {
  term: string;       // 표제형 (예: "figure out")
  surface: string;    // 지문에 실제로 나온 형태 (예: "figured out")
  kind: TermKind;
  pos: string;        // noun | verb | adj | adv | phrase ...
  meaningKo: string;
  reason?: string;    // 왜 핵심인지 (빈도/난이도/주제 핵심어 등) — 짧게
};

const getClient = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-haiku-4-5';

const KINDS: TermKind[] = ['word', 'phrase', 'phrasal_verb', 'idiom', 'term'];

function parseJson<T>(text: string, open: '[' | '{'): T | null {
  const re = open === '[' ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const m = text.match(re);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as T;
  } catch {
    return null;
  }
}

export function termKey(term: string): string {
  return term
    .normalize('NFKC')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .toLowerCase()
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
    .replace(/\s+/g, ' ');
}

/** 지문에 실제로 존재하는지(굴절형 허용) 확인하고 지문상의 표면형을 돌려준다. */
function findSurface(passage: string, term: string, surfaceHint?: string): string | null {
  const lower = passage.toLowerCase();
  for (const cand of [surfaceHint, term]) {
    if (cand && lower.includes(cand.toLowerCase())) {
      const i = lower.indexOf(cand.toLowerCase());
      return passage.slice(i, i + cand.length);
    }
  }
  // 굴절형: 각 어절의 앞 4~5글자 어간으로 느슨 매칭 (figure out → figured out)
  const parts = term.toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const stem = (w: string) => w.slice(0, Math.max(3, Math.min(w.length - 1, 5)));
  const pat = parts
    .map((w) => `${stem(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[a-z']*`)
    .join('(?:\\s+[a-z\']+){0,2}?\\s+');
  try {
    const m = new RegExp(`\\b${pat}`, 'i').exec(passage);
    return m ? m[0] : null;
  } catch {
    return null;
  }
}

const GRADE_LABEL: Record<string, string> = { H1: '고1', H2: '고2', H3: '고3' };

export async function extractKeyTerms(input: {
  passageText: string;
  title?: string | null;
  grade?: string | null;
}): Promise<KeyTerm[]> {
  const grade = (input.grade && GRADE_LABEL[input.grade]) || input.grade || '고등학생';
  const prompt = `You are a veteran Korean 내신 English teacher. Select the KEY LEARNING TERMS from the passage below for a ${grade} Korean student.

SELECTION CRITERIA (apply in this order):
1. Skip words a ${grade} student already knows (basic A1–B1 words, function words, names, numbers).
2. Prefer words/expressions that (a) are likely to be tested in school exams (어휘·빈칸·서술형), (b) are core to the passage topic (topic-specific / technical terms), or (c) are frequent in academic/CSAT-level reading.
3. MUST cover every type that exists in the passage:
   - "word": single content words (B2+ difficulty) — 8 to 12
   - "phrasal_verb": verb + particle (e.g. figure out, carry out) — include ALL that appear
   - "idiom": idioms / fixed collocations (e.g. take ... into account, play a role in) — include ALL that appear
   - "phrase": useful multi-word expressions that are not idioms (e.g. in terms of, as a result of) — up to 4
   - "term": subject-specific / technical terminology tied to the passage topic — up to 4
4. Total 12–24 items. No duplicates. Each must literally appear in the passage (inflected forms allowed).

For each item return:
- term: dictionary/base form (e.g. "figure out", "minimalism")
- surface: exact text as it appears in the passage
- kind: one of word | phrasal_verb | idiom | phrase | term
- pos: noun | verb | adj | adv | prep | conj | phrase  (use "phrase" for multi-word items that are not a single part of speech)
- meaningKo: concise Korean meaning that fits THIS passage's context (한글, 1–2 short senses)
- reason: 6–14 Korean characters on why it is key (e.g. "주제 핵심어", "서술형 빈출", "구동사")

Return ONLY a JSON array, no markdown.

Title: ${input.title ?? '(none)'}
Passage:
"""
${input.passageText}
"""`;

  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
  const raw = parseJson<Array<Record<string, unknown>>>(text, '[') ?? [];

  const seen = new Set<string>();
  const out: KeyTerm[] = [];
  for (const r of raw) {
    const term = typeof r.term === 'string' ? r.term.trim() : '';
    const meaningKo = typeof r.meaningKo === 'string' ? r.meaningKo.trim() : '';
    if (!term || !meaningKo) continue;
    const key = termKey(term);
    if (!key || seen.has(key)) continue;
    const surface = findSurface(input.passageText, term, typeof r.surface === 'string' ? r.surface : undefined);
    if (!surface) continue; // 지문에 없는 항목은 버린다(환각 방지)
    const kind = KINDS.includes(r.kind as TermKind) ? (r.kind as TermKind) : term.includes(' ') ? 'phrase' : 'word';
    seen.add(key);
    out.push({
      term,
      surface,
      kind,
      pos: typeof r.pos === 'string' && r.pos ? r.pos.trim().toLowerCase() : kind === 'word' ? '-' : 'phrase',
      meaningKo,
      reason: typeof r.reason === 'string' ? r.reason.trim() : undefined,
    });
  }
  return out;
}

export type TermLookup = {
  term: string;
  lemma: string;
  kind: TermKind;
  pos: string;
  meaningKo: string;
};

/** 학생이 고른 단어/구의 뜻·품사 (문맥 반영). */
export async function lookupTermWithAI(term: string, context: string | null): Promise<TermLookup | null> {
  const prompt = `You are building a Korean–English vocabulary entry for a Korean high-school student.

Selected text: "${term}"
${context ? `Sentence it appeared in: "${context}"\n` : ''}
Return ONLY a JSON object:
{
  "lemma": "base/dictionary form (lowercase; for phrasal verbs/idioms the base form, e.g. figure out)",
  "kind": "word | phrasal_verb | idiom | phrase | term",
  "pos": "noun | verb | adj | adv | prep | conj | pron | phrase",
  "meaning_ko": "간결한 한글 뜻 (이 문장에서의 의미 우선, 1–2개)"
}
If the text is not meaningful English, return {"lemma":"","kind":"word","pos":"","meaning_ko":""}.`;

  try {
    const msg = await getClient().messages.create({
      model: MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
    const p = parseJson<{ lemma?: string; kind?: string; pos?: string; meaning_ko?: string }>(text, '{');
    if (!p?.lemma || !p.meaning_ko) return null;
    return {
      term,
      lemma: p.lemma.trim().toLowerCase(),
      kind: KINDS.includes(p.kind as TermKind) ? (p.kind as TermKind) : term.includes(' ') ? 'phrase' : 'word',
      pos: (p.pos ?? '-').trim().toLowerCase() || '-',
      meaningKo: p.meaning_ko.trim(),
    };
  } catch (e) {
    console.error('[lookupTermWithAI]', e);
    return null;
  }
}
