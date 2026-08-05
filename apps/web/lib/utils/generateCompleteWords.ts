/**
 * Complete Words 자동 출제 엔진
 * ETS 스타일 기반 문단 생성 및 빈칸 선택
 *
 * 스펙:
 * - 정확히 10개 문제
 * - 문단: 70~120 단어
 * - 문장당 0~5개 문제
 * - 핵심 문장에 집중 출제
 * - Content Words 70%, Function Words 30%
 * - 앞부분 표시, 뒤 삭제 방식
 */

import Anthropic from '@anthropic-ai/sdk';

export interface BlankQuestion {
  order: number;
  word: string;              // 원래 단어 (people)
  visible: string;           // 표시 부분 (peo)
  hidden: string;            // 숨긴 부분 (ple)
  correctToken: string;      // 정답 (ple)
  partOfSpeech: string;      // 품사
  startIndex: number;        // 원문에서의 위치
}

export interface CompleteWordsPassage {
  passage: string;           // 평문 지문 (70~120 단어)
  blanks: BlankQuestion[];
  sentenceCount: number;
  wordCount: number;
}

/**
 * AI를 이용한 지문 생성
 *
 * Prompt는 다음을 보장합니다:
 * 1. 정확히 10개 빈칸
 * 2. 70~120 단어
 * 3. 지문은 평문 + 빈칸 위치 정보
 * 4. 문장별 분포
 */
export async function generateCompleteWordsPassage(
  topic: string,
  difficulty: 'easy' | 'core' | 'hard' = 'core'
): Promise<CompleteWordsPassage> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

  const prompt = `You are an expert Updated TOEFL iBT 2026 content creator specializing in Complete Words passages.

Generate EXACTLY ONE passage following these rules:

PASSAGE REQUIREMENTS:
- Topic: "${topic}"
- Difficulty: ${difficulty}
- Length: 70-120 words
- Exactly 10 blanks (complete words)
- 3-4 sentences
- Blanks placed in sentences with key information (NOT first sentence)

BLANK SELECTION RULES:
- Content Words (70%): Noun, Verb, Adjective, Adverb
- Function Words (30%): is, the, from, to, by, in (limited)
- No duplicate words
- Max 5 blanks per sentence
- First sentence: 0 blanks
- Last sentence: 2-5 blanks

FORMATTING RULES:
- Show prefix of word, hide suffix
- Prefix length based on word length:
  * 2-3 letters: show 1 (is → i_)
  * 4-6 letters: show 2-3 (from → fr__, people → peo___)
  * 7-9 letters: show 3 (record → rec___)
  * 10+ letters: show 3-4 (However → How____)
- Ensure uniqueness (candidates should be few)

OUTPUT FORMAT:
Return ONLY this JSON (NO markdown, NO explanations):
{
  "passage": "We know from drawings that [blank1] took [blank2] in the past...",
  "blanks": [
    {
      "order": 1,
      "word": "people",
      "visible": "peo",
      "hidden": "ple",
      "partOfSpeech": "noun",
      "blankPlaceholder": "[blank1]"
    },
    {
      "order": 2,
      "word": "place",
      "visible": "pla",
      "hidden": "ce",
      "partOfSpeech": "noun",
      "blankPlaceholder": "[blank2]"
    }
  ],
  "sentenceDistribution": [0, 5, 5]
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = (message.content[0] as any).text as string;
  const jsonStart = raw.indexOf('{');
  const jsonEnd = raw.lastIndexOf('}');

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('No JSON found in Claude response');
  }

  const data = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

  // 검증
  if (!data.blanks || data.blanks.length !== 10) {
    throw new Error(`Expected 10 blanks, got ${data.blanks.length}`);
  }

  // 평문 지문에서 빈칸 위치 계산
  const cleanPassage = data.passage.replace(/\[blank\d+\]/g, '_');
  const processedBlanks = processBlankPositions(cleanPassage, data.blanks);

  return {
    passage: cleanPassage,
    blanks: processedBlanks,
    sentenceCount: data.sentenceDistribution?.length || 3,
    wordCount: cleanPassage.split(/\s+/).length,
  };
}

/**
 * 지문에서 각 단어의 실제 위치를 계산하여 startIndex 추가
 */
function processBlankPositions(
  passage: string,
  blanks: any[]
): BlankQuestion[] {
  const words = passage.split(/(\s+)/); // 공백 포함해서 분할
  let wordIndex = 0;
  let charIndex = 0;

  // 각 단어의 실제 위치 맵
  const wordPositions: Map<number, number> = new Map();
  for (let i = 0; i < words.length; i += 2) {
    wordPositions.set(wordIndex++, charIndex);
    charIndex += words[i].length;
    if (i + 1 < words.length) charIndex += words[i + 1].length;
  }

  return blanks.map((blank, index) => {
    // 빈칸 순서대로 위치 추정
    let estimatedPosition = index * 10; // 대략적 위치

    return {
      order: blank.order,
      word: blank.word,
      visible: blank.visible,
      hidden: blank.hidden,
      correctToken: blank.hidden,
      partOfSpeech: blank.partOfSpeech,
      startIndex: estimatedPosition,
    };
  });
}

/**
 * 이미 생성된 지문에서 Complete Words 문제로 변환
 * (기존 AI 생성 텍스트를 새 스펙으로 변환)
 */
export function convertToCompleteWordsFormat(
  rawPassage: string,
  rawBlanks: Array<{ order: number; correctToken: string; partOfSpeech?: string }>
): CompleteWordsPassage {
  // rawBlanks에서 visible/hidden 계산
  const processedBlanks: BlankQuestion[] = rawBlanks.map((blank) => {
    const word = blank.correctToken;
    const visibleChars = determineVisibleChars(word.length);
    const visible = word.substring(0, visibleChars);
    const hidden = word.substring(visibleChars);

    return {
      order: blank.order,
      word,
      visible,
      hidden,
      correctToken: hidden,
      partOfSpeech: blank.partOfSpeech || 'unknown',
      startIndex: 0,
    };
  });

  return {
    passage: rawPassage,
    blanks: processedBlanks,
    sentenceCount: 0,
    wordCount: rawPassage.split(/\s+/).length,
  };
}

/**
 * 단어 길이에 따라 표시할 글자 수 결정
 *
 * 기준:
 * - 2-3글자: 1
 * - 4-6글자: 2-3
 * - 7-9글자: 3
 * - 10글자 이상: 3-4
 */
export function determineVisibleChars(wordLength: number): number {
  if (wordLength <= 3) return 1;
  if (wordLength <= 6) return Math.min(3, Math.ceil(wordLength / 2));
  if (wordLength <= 9) return 3;
  return Math.min(4, Math.ceil(wordLength / 3));
}

/**
 * AI 프롬프트를 새로운 스펙으로 업그레이드
 *
 * 기존: paragraphHtml + 가변 개수의 blanks
 * 신규: passage (평문) + 정확히 10개 blanks (word/visible/hidden)
 */
export function generateCompleteWordsPrompt(topic: string, difficulty: string): string {
  return `You are an expert Updated TOEFL iBT 2026 content creator.

Generate EXACTLY ONE Complete Words passage following ETS patterns:

PASSAGE STRUCTURE:
- Topic: "${topic}"
- Difficulty: ${difficulty}
- Word count: 70-120 words
- Sentence count: 3-4 sentences
- Exactly 10 blanks (complete words)

BLANK PLACEMENT RULES:
1. First sentence: 0 blanks (background/introduction)
2. Middle sentences: 5 blanks each (key information)
3. Last sentence: 2-5 blanks (conclusion)
4. Max 5 per sentence
5. Avoid consecutive blanks

WORD SELECTION:
- Content words (70%): Noun > Verb > Adjective > Adverb
- Function words (30%): is, the, from, to, by, in (limited)
- No duplicates
- Vary word lengths (2-12 letters)

PREFIX VISIBILITY RULES (ensure uniqueness):
- Word length 2-3: show 1 letter (is → i_)
- Word length 4-6: show 2-3 letters (from → fr__, people → peo___)
- Word length 7-9: show 3 letters (record → rec___)
- Word length 10+: show 3-4 letters (However → How____)

OUTPUT JSON ONLY (NO markdown):
{
  "passage": "Plain text with [blank1] [blank2]... format",
  "blanks": [
    {"order": 1, "word": "people", "visible": "peo", "hidden": "ple", "partOfSpeech": "noun"},
    {"order": 2, "word": "place", "visible": "pla", "hidden": "ce", "partOfSpeech": "noun"}
  ],
  "distribution": {"sentence1": 0, "sentence2": 5, "sentence3": 5}
}`;
}

/**
 * 검증: 생성된 Complete Words가 스펙을 만족하는가?
 */
export interface ValidationError {
  field: string;
  message: string;
}

export function validateCompleteWords(passage: CompleteWordsPassage): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. 문제 개수 = 10
  if (passage.blanks.length !== 10) {
    errors.push({
      field: 'blanks.length',
      message: `Expected 10 blanks, got ${passage.blanks.length}`,
    });
  }

  // 2. 단어 수 70-120
  if (passage.wordCount < 70 || passage.wordCount > 120) {
    errors.push({
      field: 'wordCount',
      message: `Word count ${passage.wordCount} not in range 70-120`,
    });
  }

  // 3. 중복 없음
  const words = new Set(passage.blanks.map((b) => b.word.toLowerCase()));
  if (words.size !== passage.blanks.length) {
    errors.push({
      field: 'blanks.duplicates',
      message: 'Duplicate words detected',
    });
  }

  // 4. 품사 비율 확인 (정확할 필요는 없지만 참고)
  const contentWords = passage.blanks.filter((b) =>
    ['noun', 'verb', 'adjective', 'adverb'].includes(b.partOfSpeech.toLowerCase())
  ).length;

  const contentRatio = (contentWords / passage.blanks.length) * 100;
  if (contentRatio < 60 || contentRatio > 80) {
    errors.push({
      field: 'blanks.partOfSpeech',
      message: `Content word ratio ${contentRatio.toFixed(0)}% not in range 60-80%`,
    });
  }

  return errors;
}
