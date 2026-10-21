// 이미 있는 영어 지문(JR 지문 또는 직접 붙여넣기)을 중학내신 드릴 데이터로 가공한다.
//   해석(문장별) · 구조 분석(S/V/O/C) · 문법 레이블 · 핵심 단어  →  more_reading 콘텐츠
// AI 호출은 서버 액션에서 하고, 여기에는 프롬프트/스키마/검증/변환만 둔다(테스트 가능하게 순수 함수로).
import { z } from 'zod';
import { MIDDLE_GRAMMAR_PATTERNS } from '../../models/middle-naesin/drill';

export const AI_READING_MODEL = 'claude-opus-5-5';

// ── 결과 스키마 ────────────────────────────────────────────────────
export const AiSentenceSchema = z.object({
  en: z.string(),
  ko: z.string(),
  subject: z.string(),
  verb: z.string(),
  object: z.string(),
  complement: z.string(),
  grammar: z.array(z.string()),
});
export const AiVocabSchema = z.object({
  word: z.string(),
  meaning_ko: z.string(),
  definition_en: z.string(),
});
export const AiReadingSchema = z.object({
  title: z.string(),
  sentences: z.array(AiSentenceSchema),
  vocabulary: z.array(AiVocabSchema),
});
export type AiSentence = z.infer<typeof AiSentenceSchema>;
export type AiVocab = z.infer<typeof AiVocabSchema>;
export type AiReading = z.infer<typeof AiReadingSchema>;

// Messages API 구조화 출력용 JSON Schema (제약은 최소로 두고, 값 검증은 아래 normalize 에서 한다)
export const AI_READING_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'sentences', 'vocabulary'],
  properties: {
    title: { type: 'string' },
    sentences: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['en', 'ko', 'subject', 'verb', 'object', 'complement', 'grammar'],
        properties: {
          en: { type: 'string' },
          ko: { type: 'string' },
          subject: { type: 'string' },
          verb: { type: 'string' },
          object: { type: 'string' },
          complement: { type: 'string' },
          grammar: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    vocabulary: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['word', 'meaning_ko', 'definition_en'],
        properties: {
          word: { type: 'string' },
          meaning_ko: { type: 'string' },
          definition_en: { type: 'string' },
        },
      },
    },
  },
} as const;

// ── 프롬프트 ───────────────────────────────────────────────────────
export function buildSystemPrompt(): string {
  return [
    '당신은 한국 중학교 2학년 영어 내신을 지도하는 교사입니다. 주어진 영어 지문을 "문장 단위 드릴 데이터"로 가공합니다.',
    '',
    '규칙:',
    '1. 문장 나누기: 원문을 한 글자도 바꾸지 마세요(철자·대소문자·구두점·인용부호 그대로, 의역·교정·요약 금지). 문장 하나가 sentences 항목 하나입니다. 문장 끝의 구두점은 en에 포함합니다. 따옴표 안 대사도 문장 단위로 나누되 따옴표는 그 문장에 그대로 둡니다.',
    '2. ko: 그 문장 하나에 대응하는 자연스러운 한국어 해석(평어체 "~다"). 두 문장을 합치거나 한 문장을 나누지 마세요.',
    '3. subject/verb/object/complement: 그 문장 주절의 S·V·O·C를 en에서 그대로 떼어 낸 연속된 문구(철자·대소문자 그대로)로 적습니다. 학생이 직접 타이핑해 비교하므로 가능한 한 짧은 핵심 구로 쓰되, verb는 조동사·be동사를 포함한 동사구 전체(예: "can see", "was")입니다. 해당 성분이 없으면 빈 문자열("")입니다. 목적어와 보어를 지어내지 마세요.',
    `4. grammar: 그 문장에 실제로 쓰인 문법을 다음 목록에서만 골라 최대 3개 적습니다: ${MIDDLE_GRAMMAR_PATTERNS.join(', ')}. 문장 형식(1~5형식) 중 하나는 반드시 포함합니다. 목록에 없는 이름은 쓰지 마세요. 지각동사 구문은 "5형식", 목적격 관계대명사는 "관계대명사"로 표시합니다.`,
    '5. vocabulary: 지문에서 중2 학생이 모를 수 있는 핵심 단어·숙어 8~12개. word는 지문에 쓰인 어구의 기본형, meaning_ko는 지문 맥락의 짧은 한국어 뜻, definition_en은 10단어 이내의 쉬운 영영 풀이(그 단어 자체를 쓰지 않기).',
    '6. title: 지문 제목이 주어지면 그대로, 없으면 지문에 어울리는 짧은 영어 제목.',
  ].join('\n');
}

export function buildUserPrompt(p: { title: string; passage: string; koreanHint?: string; lessonTitle?: string | null; grammarTopics?: string[] }): string {
  const parts: string[] = [];
  if (p.lessonTitle) parts.push(`단원: ${p.lessonTitle}`);
  if (p.grammarTopics && p.grammarTopics.length > 0) {
    parts.push(`이 단원의 핵심 문법(해당 문장이 있으면 grammar 태그에 반영): ${p.grammarTopics.join(', ')}`);
  }
  if (p.title.trim()) parts.push(`지문 제목: ${p.title.trim()}`);
  parts.push('아래 지문을 규칙대로 가공해 주세요.', '', '[지문]', p.passage.trim());
  if (p.koreanHint && p.koreanHint.trim()) {
    parts.push('', '[참고 한국어 해석 — 이미 있는 번역입니다. 문장에 맞게 나누어 쓰되 뜻이 틀리면 고치세요]', p.koreanHint.trim());
  }
  return parts.join('\n');
}

// ── 검증 / 정리 ─────────────────────────────────────────────────────
const alnum = (s: string) => s.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '');
const ALLOWED_TAGS = new Set<string>(MIDDLE_GRAMMAR_PATTERNS);

export type NormalizedReading = { reading: AiReading; warnings: string[] };

// 모델 결과(또는 선생님이 수정한 결과)를 드릴이 그대로 쓸 수 있는 형태로 정리하고, 문제 지점을 warnings 로 돌려준다.
export function normalizeReading(raw: AiReading, originalPassage?: string): NormalizedReading {
  const warnings: string[] = [];
  const sentences: AiSentence[] = [];

  raw.sentences.forEach((s, i) => {
    const n = i + 1;
    const en = s.en.replace(/\s+/g, ' ').trim();
    const ko = s.ko.replace(/\s+/g, ' ').trim();
    if (!en) return;
    if (!ko) warnings.push(`${n}번 문장: 한국어 해석이 비어 있습니다.`);
    if (!/[.?!"”'’)]$/.test(en)) warnings.push(`${n}번 문장: 문장 끝 구두점이 없어 다음 문장과 합쳐질 수 있습니다.`);
    if (/(?<!\b(?:Mr|Mrs|Ms|Dr|St|Mt|Jr|Sr))[.?!]\s+[A-Z]/.test(en)) warnings.push(`${n}번 문장: 한 항목에 두 문장 이상이 들어 있는 것 같습니다.`);

    // 구조 분석 정답은 문장 속에 실제로 있는 문구여야 한다(학생이 문장을 보고 입력하므로).
    const low = en.toLowerCase();
    const part = (key: 'subject' | 'verb' | 'object' | 'complement', label: string) => {
      const v = s[key].replace(/\s+/g, ' ').trim();
      if (v && !low.includes(v.toLowerCase())) {
        warnings.push(`${n}번 문장: ${label} "${v}" 이(가) 문장에 그대로 없어 비웠습니다.`);
        return '';
      }
      return v;
    };
    const subject = part('subject', 'S(주어)');
    const verb = part('verb', 'V(동사)');
    const object = part('object', 'O(목적어)');
    const complement = part('complement', 'C(보어)');

    const grammar = [...new Set<string>(s.grammar.map((g: string) => g.trim()))].filter((g: string) => {
      if (ALLOWED_TAGS.has(g)) return true;
      if (g) warnings.push(`${n}번 문장: 문법 태그 "${g}" 은(는) 목록에 없어 뺐습니다.`);
      return false;
    });
    if (grammar.length === 0) warnings.push(`${n}번 문장: 문법 태그가 없어 문법 레이블링 단계에서 정답 확인이 되지 않습니다.`);

    sentences.push({ en, ko, subject, verb, object, complement, grammar: grammar.slice(0, 3) });
  });

  if (sentences.length === 0) warnings.push('문장이 하나도 없습니다.');

  if (originalPassage && sentences.length > 0) {
    if (alnum(sentences.map((s) => s.en).join(' ')) !== alnum(originalPassage)) {
      warnings.push('문장들을 이어 붙인 결과가 원문과 다릅니다(AI가 문장을 바꾸거나 빠뜨렸을 수 있음). 아래 문장을 원문과 대조해 확인하세요.');
    }
  }

  const seen = new Set<string>();
  const vocabulary = raw.vocabulary
    .map((v) => ({ word: v.word.trim(), meaning_ko: v.meaning_ko.trim(), definition_en: v.definition_en.trim() }))
    .filter((v) => {
      const k = v.word.toLowerCase();
      if (!v.word || !v.meaning_ko || seen.has(k)) return false;
      seen.add(k);
      return true;
    });

  return { reading: { title: raw.title.trim(), sentences, vocabulary }, warnings };
}

// ── 저장용 변환 ─────────────────────────────────────────────────────
export type AiReadingStatus = 'draft' | 'final';

export type ContentRow = {
  unit_id: string;
  content_type: 'more_reading' | 'vocab_ko';
  title: string | null;
  body_text: string;
  translation_ko: string | null;
  extra_data: Record<string, unknown>;
  sort_order: number;
};

export function toContentRows(
  reading: AiReading,
  o: {
    unitId: string;
    status: AiReadingStatus;
    sortOrder: number;
    title: string;
    withVocab: boolean;
    existingVocabWords?: string[];
    meta?: Record<string, unknown>;
  },
): { passage: ContentRow; vocab: ContentRow | null } {
  const aiReading = { status: o.status, model: AI_READING_MODEL, generatedAt: new Date().toISOString(), ...(o.meta ?? {}) };

  // 한 줄에 한 문장 → 영어/한글 줄 수가 같아 문장 쌍이 어긋나지 않는다.
  const sentenceAnnotations: Record<number, { structureAnswer?: Record<string, string>; grammarAnswers?: string[] }> = {};
  reading.sentences.forEach((s, i) => {
    const hasStructure = !!(s.subject || s.verb || s.object || s.complement);
    sentenceAnnotations[i] = {
      ...(hasStructure ? { structureAnswer: { subject: s.subject, verb: s.verb, object: s.object, complement: s.complement } } : {}),
      ...(s.grammar.length > 0 ? { grammarAnswers: s.grammar } : {}),
    };
  });

  const passage: ContentRow = {
    unit_id: o.unitId,
    content_type: 'more_reading',
    title: o.title,
    body_text: reading.sentences.map((s) => s.en).join('\n'),
    translation_ko: reading.sentences.map((s) => s.ko).join('\n'),
    extra_data: { sentenceAnnotations, sentencePerLine: true, aiReading },
    sort_order: o.sortOrder,
  };

  let vocab: ContentRow | null = null;
  if (o.withVocab) {
    const have = new Set((o.existingVocabWords ?? []).map((w) => w.toLowerCase()));
    const lines = reading.vocabulary.filter((v) => !have.has(v.word.toLowerCase())).map((v) => `${v.word} | ${v.meaning_ko.replace(/[|\n]/g, ' ')}`);
    if (lines.length > 0) {
      vocab = {
        unit_id: o.unitId,
        content_type: 'vocab_ko',
        title: `${o.title} 단어`,
        body_text: lines.join('\n'),
        translation_ko: null,
        extra_data: { aiReading },
        sort_order: o.sortOrder,
      };
    }
  }
  return { passage, vocab };
}
