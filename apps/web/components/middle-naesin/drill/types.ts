import type {
  MiddleDrillData,
  MiddleDrillSentence,
  MiddleDrillVocabItem,
  SentenceStructure,
  MiddleGrammarPattern,
} from '@/models/middle-naesin/drill';
import type { MiddleNaesinContent } from '@/models/middle-naesin';

// ── Sentence parser ──────────────────────────────────────────────

const isHangul = (c: string | undefined) => !!c && /[가-힣]/.test(c);

function splitSentences(text: string): string[] {
  // 문제 번호("2. B : ...", "6. I'll ...")는 문장이 아니므로 줄 머리에서 제거
  const cleaned = text
    .replace(/^[ \t]*\d+\.[ \t]+/gm, '')
    .replace(/\r\n/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
  const results: string[] = [];
  let buf = '';

  for (let i = 0; i < cleaned.length; i++) {
    buf += cleaned[i];
    const ch = cleaned[i];
    const next = cleaned[i + 1];

    // 한글 문장은 마침표 뒤에 공백 없이 다음 문장이 붙어 있는 경우가 있다("어려워요.택시를")
    const hangulGlue = isHangul(cleaned[i - 1]) && isHangul(next);
    if ((ch === '.' || ch === '?' || ch === '!') && (next === ' ' || next === undefined || next === '"' || hangulGlue)) {
      // Skip abbreviations ("Mr." "Dr." 등, 그리고 "J." 같은 한 글자 대문자 이니셜).
      // 2글자 영단어("go." "me." "it." "up." "no." 등)는 문장 끝에 아주 흔하므로
      // 약어로 취급하면 다음 문장과 합쳐져 영어/한글 문장 수가 어긋난다(한 칸씩 밀림).
      // "I."/"A."는 대명사·관사로 문장이 끝나는 경우가 많아 이니셜에서 제외.
      if (ch === '.') {
        const words = buf.trim().split(/\s+/);
        const lastWord = (words[words.length - 1] ?? '').replace(/\.$/, '');
        if (/^[B-HJ-Z]$/.test(lastWord) || /^(Mr|Mrs|Ms|Dr|St|vs|etc|e\.g|i\.e)$/i.test(lastWord)) {
          continue;
        }
        // "bus No. 2" 처럼 No. 뒤에 숫자가 오면 문장 끝이 아니다
        if (/^No$/.test(lastWord) && /^\d/.test(cleaned.slice(i + 1).trim())) continue;
      }
      // 닫는 따옴표는 앞 문장에 붙인다
      if (next === '"') {
        buf += '"';
        i++;
      }
      const sentence = buf.trim();
      if (sentence) results.push(sentence);
      buf = '';
      if (cleaned[i + 1] === ' ') i++; // skip the space
    }
  }
  const remaining = buf.trim();
  if (remaining) results.push(remaining);

  // 글자가 하나도 없는 조각만 버린다. 길이로 거르면 "네." "OK." 같은 짧은 대화문이
  // 한쪽(주로 한글)에서만 사라져 영어/한글 문장이 한 칸씩 밀린다.
  return results.filter((s) => /[A-Za-z0-9가-힣]/.test(s));
}

// 영어/한글을 짝지어 돌려준다. 줄 수가 같으면 줄 단위로 맞추고, 한 줄 안에서 문장 수가
// 다르면(번역이 두 문장을 합친 경우 등) 그 줄만 통째로 한 묶음으로 둬서 어긋남이 뒤로
// 번지지 않게 한다. 줄 수부터 다르면 전체 문장 단위로 맞춘다.
function pairSentences(enText: string, koText: string): { en: string; ko: string | null }[] {
  const toLines = (t: string) =>
    t.replace(/^[ \t]*\d+\.[ \t]+/gm, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const enLines = toLines(enText);
  const koLines = toLines(koText);

  if (enLines.length > 1 && enLines.length === koLines.length) {
    const out: { en: string; ko: string | null }[] = [];
    enLines.forEach((enLine, i) => {
      const es = splitSentences(enLine);
      const ks = splitSentences(koLines[i]);
      if (es.length === ks.length) es.forEach((en, j) => out.push({ en, ko: ks[j] }));
      else if (es.length > 0) out.push({ en: enLine, ko: koLines[i] });
    });
    return out;
  }

  const es = splitSentences(enText);
  const ks = splitSentences(koText);
  return es.map((en, i) => ({ en, ko: ks[i] ?? null }));
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

  const pairs = pairSentences(target.body_text ?? '', target.translation_ko ?? '');

  const sentences: MiddleDrillSentence[] = pairs.map(({ en, ko }, i) => {
    const blank = pickBlankWord(en);
    return {
      index: i,
      en,
      ko,
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
  explanation?: string;
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
  moreReading: MiddleNaesinDrillSection | null;
  vocab: MiddleDrillVocabItem[];
  grammar: MiddleGrammarPoint[];
};

function buildSectionForType(
  contents: MiddleNaesinContent[],
  contentType: 'main_text' | 'dialogue' | 'more_reading',
): MiddleNaesinDrillSection | null {
  const items = contents.filter((c) => c.content_type === contentType);
  if (items.length === 0) return null;

  const sentences: MiddleDrillSentence[] = [];
  for (const item of items) {
    const pairs = pairSentences(item.body_text ?? '', item.translation_ko ?? '');

    pairs.forEach(({ en, ko }, localIndex) => {
      const blank = pickBlankWord(en);
      const ann = readAnnotation(item, localIndex);
      sentences.push({
        index: sentences.length, // 섹션 전체에서 유일한 순번 (여러 콘텐츠를 이어붙임)
        en,
        ko,
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

// "질문 | 보기1 | 보기2 | 보기3 | 정답번호(1부터)" 한 줄씩, 마지막에 "| 해설" 추가 가능
function parseGrammarQuiz(raw: string | undefined): MiddleGrammarQuizItem[] {
  if (!raw) return [];
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: MiddleGrammarQuizItem[] = [];

  for (const line of lines) {
    const parts = line.split('|').map((s) => s.trim());
    if (parts.length < 4) continue;
    const prompt = parts[0];
    if (!prompt) continue;

    // 마지막 필드가 숫자가 아니고 그 앞 필드가 숫자면, 마지막을 해설로 취급
    let answerFieldIdx = parts.length - 1;
    let explanation: string | undefined;
    const lastIsNumeric = Number.isFinite(Number(parts[answerFieldIdx]));
    if (!lastIsNumeric && parts.length >= 5 && Number.isFinite(Number(parts[parts.length - 2]))) {
      explanation = parts[parts.length - 1] || undefined;
      answerFieldIdx = parts.length - 2;
    }

    const answerNum = Number(parts[answerFieldIdx]);
    if (!Number.isFinite(answerNum)) continue;
    const choices = parts.slice(1, answerFieldIdx).filter(Boolean);
    const answerIndex = answerNum - 1;
    if (choices.length < 2 || answerIndex < 0 || answerIndex >= choices.length) continue;
    items.push({ prompt, choices, answerIndex, explanation });
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
    moreReading: buildSectionForType(contents, 'more_reading'),
    vocab: parseVocab(contents),
    grammar: buildGrammarPoints(contents),
  };
}

export type { MiddleDrillData, MiddleDrillSentence, MiddleDrillVocabItem };
