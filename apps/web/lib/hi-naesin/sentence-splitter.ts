// lib/hi-naesin/sentence-splitter.ts
// 영어/한국어 지문을 문장 단위로 분리

const EN_ABBREVS = /\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e|Fig|vol|Vol|No|pp|ca|approx|dept|est|govt|max|min|avg|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\./g;
const PLACEHOLDER = '\x00DOT\x00';

export function splitEnglish(text: string): string[] {
  const safe = text.replace(EN_ABBREVS, (m) => m.slice(0, -1) + PLACEHOLDER);

  const sentences = safe
    .replace(/\r\n/g, '\n')
    .split(/(?<=[.!?])\s+(?=[A-Z"(])/)
    .map((s) => s.replace(new RegExp(PLACEHOLDER, 'g'), '.').trim())
    .filter((s) => s.length > 5);

  return sentences;
}

export function splitKorean(text: string): string[] {
  if (!text.trim()) return [];

  return text
    .replace(/\r\n/g, '\n')
    .split(/(?<=[다요죠네군]\.)\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

// 문장 쌍 자동 매칭 (순서 기반 1:1)
export function autoMatchSentences(
  enSentences: string[],
  koSentences: string[],
): Array<{ sentenceEn: string; sentenceKo: string }> {
  const len = Math.max(enSentences.length, koSentences.length);
  const pairs: Array<{ sentenceEn: string; sentenceKo: string }> = [];

  for (let i = 0; i < len; i++) {
    pairs.push({
      sentenceEn: enSentences[i] ?? '',
      sentenceKo: koSentences[i] ?? '',
    });
  }

  return pairs.filter((p) => p.sentenceEn);
}

// 빈칸 넣기용 핵심 단어 추출
const EN_STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'from', 'up',
  'about', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'out', 'off', 'over', 'under', 'again', 'then',
  'that', 'which', 'who', 'whom', 'whose', 'when', 'where', 'why', 'how',
  'this', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'we',
  'our', 'he', 'she', 'his', 'her', 'him', 'you', 'your', 'i', 'my',
  'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
  'not', 'no', 'as', 'if', 'than', 'because', 'while', 'although',
  'however', 'therefore', 'thus', 'hence', 'also', 'too', 'very',
  'just', 'only', 'even', 'still', 'already', 'always', 'never',
  'often', 'sometimes', 'usually', 'there', 'here', 'all', 'each',
  'every', 'any', 'some', 'such', 'same', 'other', 'more', 'most',
  'make', 'made', 'take', 'took', 'come', 'came', 'give', 'gave',
  'know', 'knew', 'get', 'got', 'see', 'saw', 'say', 'said', 'think',
  'like', 'look', 'want', 'use', 'find', 'tell', 'ask', 'seem',
  'feel', 'try', 'leave', 'call', 'keep', 'let', 'begin', 'show',
  'hear', 'play', 'run', 'move', 'live', 'hold', 'bring', 'write',
  'provide', 'allow', 'enable', 'include', 'require', 'involve',
  'many', 'much', 'new', 'old', 'good', 'great', 'high', 'own',
  'first', 'last', 'long', 'little', 'large', 'small', 'next',
  'early', 'young', 'able', 'sure', 'real', 'true', 'false', 'right',
  'left', 'given', 'well', 'also', 'back', 'away', 'down', 'now',
]);

// 시험에 자주 나오는 학술 어미 (높은 점수 부여)
const ACADEMIC_SUFFIXES = [
  'tion', 'sion', 'ment', 'ness', 'ity', 'ance', 'ence',
  'ism', 'ist', 'ize', 'ise', 'ify', 'ous', 'ive', 'ial',
  'ical', 'ful', 'less', 'ship', 'hood', 'ward',
];

function scoreWord(word: string): number {
  // 기본 점수: 길이
  let score = word.length;

  // 학술 어미 보너스
  for (const suffix of ACADEMIC_SUFFIXES) {
    if (word.endsWith(suffix) && word.length > suffix.length + 2) {
      score += 6;
      break;
    }
  }

  // 너무 짧거나 너무 긴 단어 패널티
  if (word.length < 5) score -= 3;
  if (word.length > 14) score -= 2;

  return score;
}

/**
 * 문장에서 시험 출제 가능성이 높은 핵심 단어 최대 count개 반환
 */
export function extractKeyWords(sentence: string, count = 2): string[] {
  const raw = sentence
    .replace(/[^a-zA-Z\s'-]/g, '')
    .split(/\s+/)
    .map((w) => w.toLowerCase().replace(/[^a-z'-]/g, ''))
    .filter((w) => w.length >= 4 && !EN_STOPWORDS.has(w));

  if (raw.length === 0) return [];

  // 중복 제거 후 점수 계산
  const unique = [...new Set(raw)];
  unique.sort((a, b) => scoreWord(b) - scoreWord(a));

  return unique.slice(0, count);
}

/** @deprecated extractKeyWords 사용 권장 */
export function extractKeyWord(sentence: string): string | null {
  const results = extractKeyWords(sentence, 1);
  return results[0] ?? null;
}

// 영어 문장에서 문법 포인트 자동 감지
export function detectGrammarHints(sentence: string): string[] {
  const s = sentence.toLowerCase();
  const hints: string[] = [];

  // 관계절
  if (/\b(who|whom|whose|which)\b/.test(s)) hints.push('관계절 (who/which)');
  else if (/\bthat\b/.test(s) && /\b(is|are|was|were|has|have|had|will|would|can|could)\b/.test(s)) {
    hints.push('관계절 (that)');
  }

  // so ~ that
  if (/\bso\b.{1,30}\bthat\b/.test(s)) hints.push('so ~ that');

  // not only ~ but also
  if (/\bnot only\b/.test(s)) hints.push('not only A but also B');

  // 양보절
  if (/\b(although|though|even though)\b/.test(s)) hints.push('양보절 (although/though)');

  // 이유절
  if (/\b(because|since)\b/.test(s) && !/\bever since\b/.test(s)) hints.push('이유절 (because/since)');

  // 조건절
  if (/\bif\b/.test(s)) hints.push('조건절 (if)');

  // 비교급
  if (/\b(more|less).{1,20}\bthan\b/.test(s)) hints.push('비교급 (more/less ~ than)');

  // to부정사 (목적/결과)
  if (/\bin order to\b/.test(s)) hints.push('to부정사 (in order to)');

  // 분사구문
  if (/^[a-z]+ing\b/.test(s.trim()) || /,\s*[a-z]+ing\b/.test(s)) hints.push('분사구문');

  return hints.slice(0, 2); // 최대 2개
}

/**
 * 지문 하단의 * word: 뜻 형식 어휘 주석 파싱
 * 예: "* innate: 타고난 ** conservation: 보존"
 */
export function parseVocabAnnotations(text: string): Array<{ word: string; meaningKo: string }> {
  const results: Array<{ word: string; meaningKo: string }> = [];

  // 각 줄에서 * word: 뜻 패턴 찾기
  const lines = text.split('\n');
  for (const line of lines) {
    // * 또는 ** 로 시작하는 어휘 주석 줄
    const annotationLine = line.match(/^\s*\*+\s*(.+)$/);
    if (!annotationLine) continue;

    const content = annotationLine[1];
    // word: 뜻 ** word2: 뜻2 형태로 여러 개 있을 수 있음
    const entries = content.split(/\s+\*+\s*/);
    for (const entry of entries) {
      const match = entry.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        const word = match[1].trim();
        const meaningKo = match[2].trim();
        if (word && meaningKo) {
          results.push({ word, meaningKo });
        }
      }
    }
  }

  return results;
}

// 단어 수 계산
export function countWords(sentence: string): number {
  return sentence.trim().split(/\s+/).filter(Boolean).length;
}

// 빈칸 처리된 문장 생성 (대소문자 유지)
export function makeBlankSentence(sentence: string, keyword: string): string | null {
  const regex = new RegExp(`\\b${keyword}\\b`, 'i');
  if (!regex.test(sentence)) return null;
  return sentence.replace(regex, '____');
}
