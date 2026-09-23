// lib/hi-naesin/structure-generator.ts
// Claude Haiku 로 identify→categorize 구조분석 드릴 자동 생성.
// 1차: 지칭추론(reference) — 문장 내 대명사/지시어가 가리키는 대상을 찾고 유형을 분류.
// 2차: 문장 성분(SVOC) + 수식어-피수식어 매칭 드릴 자동 생성.

import Anthropic from '@anthropic-ai/sdk';
import type {
  IdentifyCategorizePayload,
  ModifierSubtype,
  ModifierTargetType,
  StructureSvoPayload,
} from '@/models/hi-naesin/drill';

type StructResult = Array<{ orderIndex: number; payload: IdentifyCategorizePayload }>;
type StructOk   = { ok: true;  results: StructResult };
type StructFail = { ok: false; error: string; results: [] };

const getClient = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseJsonArray<T>(text: string): T[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try { return JSON.parse(match[0]) as T[]; } catch { return []; }
}

// 지칭추론 카테고리 (categorize 보기) — key 는 채점/분석용 고정값
const REFERENCE_OPTIONS = [
  { key: 'noun',     label: '단일 명사(구)' },
  { key: 'clause',   label: '앞 절·문장 전체' },
  { key: 'abstract', label: '추상 개념·상황' },
];
const REFERENCE_KEYS = new Set(REFERENCE_OPTIONS.map((o) => o.key));

/** referent 가 sentence 안에 그대로 들어있는지 (span 클릭 채점 가능 여부) */
function containsSpan(sentence: string, span: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/gi, ' ').trim();
  return norm(sentence).includes(norm(span));
}

/** 물어보는 대명사(anchor)의 단어 위치. 같은 단어가 여러 번이면 referent 뒤 것을 우선. 못 찾으면 -1. */
function findAnchorIndex(sentence: string, anchor: string, referent: string): number {
  const words = sentence.split(/\s+/);
  const norm  = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/gi, '');
  const aWord = norm((anchor ?? '').split(/\s+/)[0] ?? '');
  const rWord = norm((referent ?? '').split(/\s+/)[0] ?? '');
  if (!aWord) return -1;
  const refIdx = words.findIndex((w) => norm(w) === rWord);
  const cands  = words.map((w, i) => (norm(w) === aWord ? i : -1)).filter((i) => i >= 0);
  if (cands.length === 0) return -1;
  const after = cands.find((i) => i > refIdx);
  return after ?? cands[0];
}

/** "those who / one that / anyone who ..." 총칭 용법 — 대명사 바로 뒤 관계사면 참 */
function isGenericPronoun(sentence: string, pronoun: string): boolean {
  const esc = (pronoun ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!esc) return false;
  return new RegExp(`\\b${esc}\\s+(who|whom|whose|that|which)\\b`, 'i').test(sentence);
}

/** referent 가 대명사 자신과 같은 단어인지 (순환 정답 방지) */
function sameWord(a: string, b: string): boolean {
  const n = (s: string) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/gi, '');
  return n(a) === n(b);
}

export async function generateReferenceQuestions(
  sentences: Array<{ sentenceEn: string }>,
): Promise<StructOk | StructFail> {
  const capped = sentences.filter((s) => s.sentenceEn).slice(0, 12);
  if (capped.length === 0) return { ok: true, results: [] };

  try {
    const client = getClient();
    const sentenceList = capped.map((s, i) => `[${i}] ${s.sentenceEn}`).join('\n');

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 6000,
      messages: [
        {
          role: 'user',
          content: `You are a Korean 내신/수능 English teacher creating 지칭추론 (reference resolution) drills.

Passage sentences:
${sentenceList}

For EACH sentence that contains a pronoun or demonstrative (it, they, this, that, these, those, such, one, etc.) whose referent appears WITHIN THE SAME SENTENCE, create one drill.

CRITICAL rules:
- "referent" MUST be an EXACT substring of "sentence" (the student clicks it word-by-word).
- "pronoun" is the referring word/phrase being asked about.
- "category": classify what the referent is — EXACTLY one of:
    "noun"     = a single noun phrase (a specific thing)
    "clause"   = a whole preceding clause/sentence idea
    "abstract" = an abstract concept or situation
- "explanation": 1 sentence in Korean explaining why.

DO NOT create a drill (set "skip": true) for these — they are NOT referent resolution:
- Anticipatory / dummy "it" (가주어): "It is + adjective/noun + that-clause / to-infinitive"
  e.g. "It is evident that ...", "It is important to ...", "It takes time to ...".
  (Here "it" points FORWARD to a that-clause/to-infinitive = 진주어, not a real antecedent.)
- Impersonal "it" (weather/time/distance): "It is raining", "It is 3 o'clock", "It is 5 km".
- Any case where the referent is a that-clause/to-infinitive rather than a real preceding noun/clause.
- Generic / indefinite use with NO concrete antecedent in the text: "those who ...",
  "one who ...", "anyone who ...", "people who ..." — here the pronoun means "people in
  general" and the referent is NOT written anywhere. (Detect: pronoun directly followed by
  a relative pronoun who/whom/whose/that/which.)
Only keep GENUINE referential pronouns/demonstratives whose antecedent is a real
noun phrase (DIFFERENT from the pronoun itself) already written earlier in THIS sentence.
If unsure, set "skip": true.

Output ONLY a valid JSON array — no markdown fences:
[
  {
    "sentenceIndex": 0,
    "skip": false,
    "sentence": "The scientist who discovered the vaccine believed it would save millions.",
    "pronoun": "it",
    "referent": "the vaccine",
    "category": "noun",
    "explanation": "it은 앞에 나온 the vaccine을 가리킵니다."
  }
]`,
        },
      ],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
    const items = parseJsonArray<{
      sentenceIndex: number;
      skip?: boolean;
      sentence: string;
      pronoun: string;
      referent: string;
      category: string;
      explanation?: string;
    }>(text);

    const results: StructResult = items
      .filter((it) =>
        !it.skip &&
        it.sentenceIndex < capped.length &&
        it.sentence && it.referent && it.pronoun &&
        REFERENCE_KEYS.has(it.category) &&
        containsSpan(it.sentence, it.referent) &&
        !sameWord(it.referent, it.pronoun) &&
        !isGenericPronoun(it.sentence, it.pronoun),
      )
      .map((it) => ({
        orderIndex: it.sentenceIndex,
        payload: {
          mode: 'reference',
          sentence: it.sentence,
          depth: 2,
          targets: [
            {
              span: it.referent,
              anchor: it.pronoun,
              anchorIndex: findAnchorIndex(it.sentence, it.pronoun, it.referent),
              category: it.category,
              options: REFERENCE_OPTIONS,
              elementTag: `ref:${it.category}`,
              explanation: it.explanation ?? '',
            },
          ],
        },
      }));

    return { ok: true, results };
  } catch (e) {
    console.error('[generateReferenceQuestions] error:', e);
    return { ok: false, error: e instanceof Error ? e.message : String(e), results: [] };
  }
}

// ─────────────────────────────────────────────────────────────
// 2차: 문장 성분(SVOC) + 수식어-피수식어 매칭 드릴 생성
// ─────────────────────────────────────────────────────────────

type StructSvoResult = Array<{ orderIndex: number; payload: StructureSvoPayload }>;
type StructSvoOk   = { ok: true;  results: StructSvoResult };
type StructSvoFail = { ok: false; error: string; results: [] };

const MODIFIER_SUBTYPE_KEYS = new Set<ModifierSubtype>([
  'adjective_word', 'adverb_word', 'prepositional_phrase', 'infinitive_phrase',
  'participial_phrase', 'participial_construction', 'relative_clause', 'adverb_clause', 'other',
]);

const MODIFIER_TARGET_KEYS = new Set<ModifierTargetType>([
  'head_noun', 'verb_phrase', 'adjective', 'adverb', 'main_clause', 'sentence',
]);

const MODIFIER_TARGET_LABEL: Record<ModifierTargetType, string> = {
  head_noun: '명사(head noun)',
  verb_phrase: '서술부(verb phrase)',
  adjective: '형용사',
  adverb: '부사',
  main_clause: '주절(main clause)',
  sentence: '문장 전체(sentence)',
};

function targetNeedsClick(t: ModifierTargetType): boolean {
  return t !== 'main_clause' && t !== 'sentence';
}

type RawStructureItem = {
  sentenceIndex: number;
  skip?: boolean;
  sentence: string;
  pattern?: string;
  subject?: string;
  verb?: string;
  object?: string;
  complement?: string;
  modifiers?: Array<{
    span: string;
    subtype: string;
    targetType: string;
    target?: string;
  }>;
};

export async function generateStructureSvoQuestions(
  sentences: Array<{ sentenceEn: string }>,
): Promise<StructSvoOk | StructSvoFail> {
  const capped = sentences.filter((s) => s.sentenceEn).slice(0, 12);
  if (capped.length === 0) return { ok: true, results: [] };

  try {
    const client = getClient();
    const sentenceList = capped.map((s, i) => `[${i}] ${s.sentenceEn}`).join('\n');

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: `You are a Korean 내신/수능 English teacher creating 문장 성분(5형식) + 수식어 분석 drills for high school students.

Passage sentences:
${sentenceList}

For EACH sentence, analyze its MAIN clause (ignore embedded subordinate clauses when tagging S/V/O/C — tag only the main clause's own subject/verb/object/complement) and return:

1. "subject": the exact main-clause subject text as it appears in the sentence (a noun phrase, gerund phrase, or "It"/"that-clause" if it's a genuine subject — but if the subject is trivial like a single pronoun "It" acting as 가주어, still tag it as subject; do not skip).
2. "verb": the exact main verb (include auxiliary + main verb together, e.g. "has been shown", "lowers"). For linking verbs also include here.
3. "object": the exact direct object, ONLY if the sentence has one (3rd/4th/5th 형식). Omit the field entirely if there is no object.
4. "complement": the exact subject complement or object complement, ONLY if present (2nd/5th 형식). Omit if absent.
5. "pattern": one of "1형식 (S V)", "2형식 (S V C)", "3형식 (S V O)", "4형식 (S V IO DO)", "5형식 (S V O C)" — pick whichever best matches this sentence's main clause.
6. "modifiers": an array of the sentence's meaningful modifying phrases/clauses (skip trivial single articles/determiners). For EACH modifier provide:
   - "span": the exact modifier text as it appears in the sentence.
   - "subtype": EXACTLY one of:
       "adjective_word"           = single adjective modifying a noun
       "adverb_word"              = single adverb
       "prepositional_phrase"     = prepositional phrase (on/in/with/for/because of ...)
       "infinitive_phrase"        = to-infinitive phrase
       "participial_phrase"       = -ing/-ed phrase modifying a noun (reduced relative clause)
       "participial_construction" = -ing/-ed phrase modifying the whole clause (분사구문, usually at sentence start or set off by commas)
       "relative_clause"          = who/which/that/whose clause modifying a noun
       "adverb_clause"            = because/although/while/if/when + clause modifying the whole sentence
       "other"                    = anything else worth noting
   - "targetType": what kind of thing this modifier attaches to — EXACTLY one of "head_noun", "verb_phrase", "adjective", "adverb", "main_clause", "sentence".
       (adjective_word/participial_phrase/relative_clause -> almost always "head_noun";
        adverb_clause/participial_construction -> "main_clause" or "sentence";
        adverb_word/prepositional_phrase/infinitive_phrase -> can target head_noun, verb_phrase, adjective, adverb, or main_clause depending on what it modifies.)
   - "target": if targetType is "head_noun", "verb_phrase", "adjective", or "adverb" — the EXACT single word or short phrase (as it appears in the sentence) being modified. If targetType is "main_clause" or "sentence", omit this field (or leave empty).

CRITICAL rules:
- Every "subject"/"verb"/"object"/"complement"/modifier "span"/modifier "target" value MUST be an EXACT substring of "sentence" (student will click the words). Do not paraphrase or normalize.
- If a sentence is too complex/ambiguous to tag confidently, set "skip": true for it.
- Keep modifiers to the 2-4 most pedagogically useful ones per sentence (don't tag every single word).

Output ONLY a valid JSON array — no markdown fences:
[
  {
    "sentenceIndex": 0,
    "skip": false,
    "sentence": "Implementing digital minimalism lowers stress and anxiety while enhancing focus on daily tasks.",
    "subject": "Implementing digital minimalism",
    "verb": "lowers",
    "object": "stress and anxiety",
    "pattern": "3형식 (S V O)",
    "modifiers": [
      { "span": "while enhancing focus on daily tasks", "subtype": "adverb_clause", "targetType": "main_clause" },
      { "span": "on daily tasks", "subtype": "prepositional_phrase", "targetType": "head_noun", "target": "focus" }
    ]
  }
]`,
        },
      ],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
    const items = parseJsonArray<RawStructureItem>(text);

    const results: StructSvoResult = [];

    for (const it of items) {
      if (it.skip || !it.sentence || it.sentenceIndex >= capped.length) continue;

      const mkField = (value: string | undefined) => {
        if (!value || !containsSpan(it.sentence, value)) return undefined;
        return { accepted: [value] };
      };

      const subject = mkField(it.subject);
      const verb = mkField(it.verb);
      if (!subject || !verb) continue; // 주어/동사는 필수

      const object = mkField(it.object);
      const complement = mkField(it.complement);

      const modifiers = (it.modifiers ?? [])
        .filter((m): m is Required<Pick<typeof m, 'span' | 'subtype' | 'targetType'>> & typeof m =>
          !!m.span &&
          containsSpan(it.sentence, m.span) &&
          MODIFIER_SUBTYPE_KEYS.has(m.subtype as ModifierSubtype) &&
          MODIFIER_TARGET_KEYS.has(m.targetType as ModifierTargetType),
        )
        .map((m) => {
          const targetType = m.targetType as ModifierTargetType;
          const needsClick = targetNeedsClick(targetType);
          const target = needsClick
            ? (m.target && containsSpan(it.sentence, m.target) ? m.target : null)
            : MODIFIER_TARGET_LABEL[targetType];
          return target
            ? {
                span: m.span,
                subtype: m.subtype as ModifierSubtype,
                targetType,
                target,
              }
            : null;
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);

      results.push({
        orderIndex: it.sentenceIndex,
        payload: {
          sentence: it.sentence,
          pattern: it.pattern,
          subject,
          verb,
          object,
          complement,
          modifiers,
        },
      });
    }

    return { ok: true, results };
  } catch (e) {
    console.error('[generateStructureSvoQuestions] error:', e);
    return { ok: false, error: e instanceof Error ? e.message : String(e), results: [] };
  }
}
