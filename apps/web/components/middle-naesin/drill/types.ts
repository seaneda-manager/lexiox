import type {
  MiddleDrillData,
  MiddleDrillSentence,
  MiddleDrillVocabItem,
  SentenceStructure,
  MiddleGrammarPattern,
} from '@/models/middle-naesin/drill';
import type { MiddleNaesinContent } from '@/models/middle-naesin';

// ── Sentence parser ──────────────────────────────────────────────

function splitSentences(text: string): string[] {
  const cleaned = text.replace(/\r\n/g, ' ').replace(/\n+/g, ' ').trim();
  const results: string[] = [];
  let buf = '';

  for (let i = 0; i < cleaned.length; i++) {
    buf += cleaned[i];
    const ch = cleaned[i];
    const next = cleaned[i + 1];

    if ((ch === '.' || ch === '?' || ch === '!') && (next === ' ' || next === undefined || next === '"')) {
      // Skip abbreviations: the word the period is attached to (e.g. "Mr." "Dr.") is
      // a single capital letter or ≤2-char English token. Restricted to A-Z tokens so
      // short Korean words (네, 돼, 했다 등) aren't mistaken for abbreviations, and taken
      // from the LAST word (the one ending in the period), not the word before it —
      // otherwise any sentence ending after a short word like "in"/"at"/"to" (very
      // common) got wrongly treated as an abbreviation and merged with the next one.
      if (ch === '.') {
        const words = buf.trim().split(/\s+/);
        const lastWord = (words[words.length - 1] ?? '').replace(/\.$/, '');
        if (/^[A-Za-z]{1,2}$/.test(lastWord) || /^(Mr|Mrs|Ms|Dr|St|vs|etc|e\.g|i\.e)$/i.test(lastWord)) {
          continue;
        }
      }
      const sentence = buf.trim();
      if (sentence) results.push(sentence);
      buf = '';
      i++; // skip the space
    }
  }
  const remaining = buf.trim();
  if (remaining) results.push(remaining);

  return results.filter((s) => s.length > 3);
}

// ── Fill-blank generator ─────────────────────────────────────────

const SKIP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'must', 'to', 'of', 'in',
  'on', 'at', 'by', 'for', 'with', 'from', 'into', 'that', 'this',
  'it', 'its', 'he', 'she', 'they', 'we', 'i', 'you', 'my', 'our',
  'his', 'her', 'their', 'your', 'and', 'but', 'or', 'so', 'yet',
  'not', 'no', 'if', 'as', 'then', 'than', 'when', 'where', 'how',
]);

function pickBlankWord(sentence: string): { word: string; template: string } | null {
  // tokenize, keep only pure alpha words ≥4 chars that aren't stop words
  const tokens = sentence.split(/(\s+|[,;:"'()[\]{}])/);
  const candidates: { word: string; idx: number }[] = [];

  let wordIdx = 0;
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (/^[A-Za-z]{4,}$/.test(tok) && !SKIP_WORDS.has(tok.toLowerCase())) {
      candidates.push({ word: tok, idx: i });
    }
    if (/[A-Za-z]/.test(tok)) wordIdx++;
  }

  if (candidates.length === 0) return null;

  // Pick a candidate from the middle/later part of the sentence (more challenging)
  const pick = candidates[Math.floor(candidates.length * 0.6)] ?? candidates[0];
  const template = tokens
    .map((t, i) => (i === pick.idx ? '_'.repeat(pick.word.length) : t))
    .join('');

  return { word: pick.word, template };
}

// ── Vocab parser ─────────────────────────────────────────────────

// vocab_en_en의 example 괄호 안 "한글 설명 / 한글 뜻" 뒷부분을 영한·한영 시험용 뜻으로 추출
function extractKoGlossFromExample(example: string | null): string | null {
  if (!example) return null;
  const idx = example.lastIndexOf('/');
  if (idx === -1) return null;
  const gloss = example.slice(idx + 1).trim();
  return gloss || null;
}

// 필드 순서가 다른 데이터(예: "word | 한글 뜻 | definition")도 자동으로 바로잡기 위한 한글 비중 판별
function isHangulHeavy(s: string): boolean {
  const compact = s.replace(/\s+/g, '');
  if (!compact) return false;
  const hangulCount = (compact.match(/[가-힣]/g) ?? []).length;
  return hangulCount / compact.length > 0.3;
}

function parseVocab(contents: MiddleNaesinContent[]): MiddleDrillVocabItem[] {
  const items: MiddleDrillVocabItem[] = [];
  let idx = 0;

  // ── 영영 단어 (vocab_en_en): "word | definition | example" 또는
  //    "word: definition" 줄 + 다음 줄 "(뜻/설명)" 괄호줄 ──
  const enEnContents = contents.filter((c) => c.content_type === 'vocab_en_en');
  for (const content of enEnContents) {
    const lines = (content.body_text ?? '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes('|')) {
        // "word | definition | example" (3필드, 한글 뜻 없음) 또는
        // "word | definition | example | 한글 뜻" (4필드) 또는
        // "word | 한글 뜻 | definition" (필드 순서가 다른 경우, 한글 비중으로 자동 판별)
        const parts = line.split('|').map((s) => s.trim());
        const word = parts[0];
        if (!word) continue;

        let definition: string;
        let example: string | null;
        let koGloss: string | null;

        if (parts.length >= 4) {
          definition = parts[1];
          example = parts[2] || null;
          koGloss = parts[3] || null;
        } else if (parts.length === 3 && isHangulHeavy(parts[1]) && !isHangulHeavy(parts[2])) {
          koGloss = parts[1];
          definition = parts[2];
          example = null;
        } else {
          definition = parts[1];
          example = parts[2] || null;
          koGloss = extractKoGlossFromExample(example);
        }

        if (!definition) continue;
        items.push({ index: idx++, word, definition, example, koGloss, kind: 'en_en' });
        continue;
      }

      const colonMatch = line.match(/^([^:]{1,40}):\s*(.+)$/);
      if (colonMatch) {
        const word = colonMatch[1].trim();
        const definition = colonMatch[2].trim();
        const next = lines[i + 1];
        let example: string | null = null;
        if (next && next.startsWith('(') && next.endsWith(')')) {
          example = next.slice(1, -1).trim();
          i++; // 괄호줄 소비
        }
        items.push({
          index: idx++,
          word,
          definition,
          example,
          koGloss: extractKoGlossFromExample(example),
          kind: 'en_en',
        });
      }
    }
  }

  // ── 단어 (한글 뜻) (vocab_ko): "word: 뜻" 또는 "word | 뜻" 한 줄 ──
  const koContents = contents.filter((c) => c.content_type === 'vocab_ko');
  for (const content of koContents) {
    const lines = (content.body_text ?? '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    for (const line of lines) {
      const parts = line.split(/[:|]/).map((s) => s.trim());
      const word = parts[0];
      const meaning = parts[1];
      if (!word || !meaning) continue;
      items.push({
        index: idx++,
        word,
        definition: meaning,
        example: parts[2] ?? null,
        koGloss: meaning,
        kind: 'ko',
      });
    }
  }

  return items;
}

// ── Main builder ─────────────────────────────────────────────────

export function buildDrillData(
  unitId: string,
  contents: MiddleNaesinContent[],
  preferContentId?: string,
): MiddleDrillData | null {
  // Pick content to drill: prefer specified, then first main_text, then dialogue
  const drillable = contents.filter(
    (c) => c.content_type === 'main_text' || c.content_type === 'dialogue',
  );
  if (drillable.length === 0) return null;

  const target =
    drillable.find((c) => c.id === preferContentId) ??
    contents.find((c) => c.content_type === 'main_text') ??
    drillable[0];

  const enSentences = splitSentences(target.body_text ?? '');
  const koSentences = splitSentences(target.translation_ko ?? '');

  const sentences: MiddleDrillSentence[] = enSentences.map((en, i) => {
    const blank = pickBlankWord(en);
    return {
      index: i,
      en,
      ko: koSentences[i] ?? null,
      fillBlankWord: blank?.word ?? '',
      fillBlankTemplate: blank?.template ?? en,
    };
  });

  return {
    unitId,
    contentId: target.id,
    contentTitle: target.title,
    sentences,
    vocab: parseVocab(contents),
  };
}

// ── Section-based builder (본문/대화문을 동시에, 4섹션 드릴용) ──────

type SentenceAnnotations = {
  structureAnswer?: SentenceStructure;
  grammarAnswers?: MiddleGrammarPattern[];
};

function readAnnotation(content: MiddleNaesinContent, localIndex: number): SentenceAnnotations {
  const extra = content.extra_data as { sentenceAnnotations?: Record<number, SentenceAnnotations> } | null;
  return extra?.sentenceAnnotations?.[localIndex] ?? {};
}

export type MiddleNaesinDrillSection = {
  contentIds: string[];
  contentTitle: string | null;
  sentences: MiddleDrillSentence[];
};

export type MiddleGrammarQuizItem = {
  prompt: string;
  choices: string[];
  answerIndex: number;
};

// 문법 문제는 Drill(반복 연습) → Practice(응용) → Test(평가) 순으로 단계별 진행
export const MIDDLE_GRAMMAR_STAGES = ['drill', 'practice', 'test'] as const;
export type MiddleGrammarStageId = (typeof MIDDLE_GRAMMAR_STAGES)[number];

export type MiddleGrammarPoint = {
  id: string;
  title: string;
  explanationEn: string | null;
  explanationKo: string | null;
  quiz: Record<MiddleGrammarStageId, MiddleGrammarQuizItem[]>;
};

export type MiddleNaesinDrillSections = {
  unitId: string;
  mainText: MiddleNaesinDrillSection | null;
  dialogue: MiddleNaesinDrillSection | null;
  vocab: MiddleDrillVocabItem[];
  grammar: MiddleGrammarPoint[];
};

function buildSectionForType(
  contents: MiddleNaesinContent[],
  contentType: 'main_text' | 'dialogue',
): MiddleNaesinDrillSection | null {
  const items = contents.filter((c) => c.content_type === contentType);
  if (items.length === 0) return null;

  const sentences: MiddleDrillSentence[] = [];
  for (const item of items) {
    const enSentences = splitSentences(item.body_text ?? '');
    const koSentences = splitSentences(item.translation_ko ?? '');

    enSentences.forEach((en, localIndex) => {
      const blank = pickBlankWord(en);
      const ann = readAnnotation(item, localIndex);
      sentences.push({
        index: sentences.length, // 섹션 전체에서 유일한 순번 (여러 콘텐츠를 이어붙임)
        en,
        ko: koSentences[localIndex] ?? null,
        fillBlankWord: blank?.word ?? '',
        fillBlankTemplate: blank?.template ?? en,
        structureAnswer: ann.structureAnswer,
        grammarAnswers: ann.grammarAnswers,
      });
    });
  }

  return {
    contentIds: items.map((c) => c.id),
    contentTitle: items.length === 1 ? items[0].title : null,
    sentences,
  };
}

// ── 문법 포인트 파서 ───────────────────────────────────────────────

// "질문 | 보기1 | 보기2 | 보기3 | 정답번호(1부터)" 한 줄씩
function parseGrammarQuiz(raw: string | undefined): MiddleGrammarQuizItem[] {
  if (!raw) return [];
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: MiddleGrammarQuizItem[] = [];

  for (const line of lines) {
    const parts = line.split('|').map((s) => s.trim());
    if (parts.length < 3) continue;
    const prompt = parts[0];
    const answerNum = Number(parts[parts.length - 1]);
    if (!prompt || !Number.isFinite(answerNum)) continue;
    const choices = parts.slice(1, parts.length - 1).filter(Boolean);
    const answerIndex = answerNum - 1;
    if (choices.length < 2 || answerIndex < 0 || answerIndex >= choices.length) continue;
    items.push({ prompt, choices, answerIndex });
  }

  return items;
}

type GrammarQuizRawByStage = Partial<Record<MiddleGrammarStageId, string>>;

// 구버전 데이터(quizRaw가 단일 문자열)는 practice 단계로 취급
function readGrammarQuizRawByStage(extra: unknown): GrammarQuizRawByStage {
  const raw = (extra as { quizRaw?: string | GrammarQuizRawByStage } | null)?.quizRaw;
  if (typeof raw === 'string') return { practice: raw };
  return raw ?? {};
}

function buildGrammarPoints(contents: MiddleNaesinContent[]): MiddleGrammarPoint[] {
  return contents
    .filter((c) => c.content_type === 'grammar_point')
    .map((c) => {
      const rawByStage = readGrammarQuizRawByStage(c.extra_data);
      return {
        id: c.id,
        title: c.title ?? '문법 포인트',
        explanationEn: c.body_text,
        explanationKo: c.translation_ko,
        quiz: {
          drill: parseGrammarQuiz(rawByStage.drill),
          practice: parseGrammarQuiz(rawByStage.practice),
          test: parseGrammarQuiz(rawByStage.test),
        },
      };
    });
}

export function buildDrillSections(
  unitId: string,
  contents: MiddleNaesinContent[],
): MiddleNaesinDrillSections {
  return {
    unitId,
    mainText: buildSectionForType(contents, 'main_text'),
    dialogue: buildSectionForType(contents, 'dialogue'),
    vocab: parseVocab(contents),
    grammar: buildGrammarPoints(contents),
  };
}

export type { MiddleDrillData, MiddleDrillSentence, MiddleDrillVocabItem };
