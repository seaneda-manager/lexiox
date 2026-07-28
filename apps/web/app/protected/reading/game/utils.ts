// 단어 부분 채우기 게임 유틸
export interface BlankWord {
  id: string;
  word: string;
  prefix: string; // 표시되는 부분 (예: "proper et")
  blank: string; // 채워야 할 부분 (예: "y")
}

/**
 * 문장에서 빈칭된 단어를 포함한 레이아웃
 * 예: "The evolution of [technology] has fundamentally [transformed] how we communicate"
 */
export interface SentenceWithBlanks {
  id: string;
  original: string; // 원문
  parts: Array<{ text: string; blankWord?: BlankWord }>; // 텍스트 + 빈칭 정보
  blankWords: BlankWord[]; // 이 문장의 빈칭 단어들
}

/**
 * 단어를 앞부분(표시) + 뒷부분(빈칭)으로 분할
 * 비율: 앞 70%, 뒤 30%
 */
export function createBlankWord(word: string): BlankWord {
  if (word.length <= 2) return { id: word, word, prefix: word, blank: "" };

  const splitPoint = Math.max(1, Math.ceil(word.length * 0.7));
  const prefix = word.substring(0, splitPoint);
  const blank = word.substring(splitPoint);

  return {
    id: word,
    word,
    prefix,
    blank,
  };
}

/**
 * 사용자 입력이 정답인지 확인 (대소문자 무시)
 */
export function isCorrectAnswer(userInput: string, correctBlank: string): boolean {
  return userInput.toLowerCase().trim() === correctBlank.toLowerCase().trim();
}

/**
 * 지문을 문장으로 분할
 */
export function splitIntoSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
}

/**
 * 문장에서 빈칭할 단어 선택 (2-3개)
 */
function selectWordsForBlanking(sentence: string, count: number = 2): string[] {
  const words = sentence
    .replace(/[,;:—-]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 5) // 5글자 이상만
    .filter((w) => /^[a-z]+$/i.test(w));

  const unique = Array.from(new Set(words));
  return unique.sort(() => Math.random() - 0.5).slice(0, count);
}

/**
 * 문장에 빈칭 적용
 */
export function createSentenceWithBlanks(
  sentence: string,
  sentenceIndex: number,
  wordsPerSentence: number = 2
): SentenceWithBlanks {
  const selectedWords = selectWordsForBlanking(sentence, wordsPerSentence);
  const blankWordMap: Map<string, BlankWord> = new Map();

  selectedWords.forEach((word) => {
    blankWordMap.set(word.toLowerCase(), createBlankWord(word));
  });

  const parts: SentenceWithBlanks['parts'] = [];
  const tokens = sentence.split(/\s+/);

  tokens.forEach((token) => {
    const cleanToken = token.replace(/[,;:—-]+/g, "");
    const blankWord = blankWordMap.get(cleanToken.toLowerCase());

    if (blankWord) {
      parts.push({ text: "", blankWord });
      parts.push({ text: " " }); // 공백
    } else {
      parts.push({ text: token + " " });
    }
  });

  return {
    id: `sentence-${sentenceIndex}`,
    original: sentence,
    parts,
    blankWords: Array.from(blankWordMap.values()),
  };
}

/**
 * 지문을 빈칭된 문장들로 변환
 */
export function createPassageWithBlanks(
  passage: string,
  wordsPerSentence: number = 2
): SentenceWithBlanks[] {
  const sentences = splitIntoSentences(passage);
  return sentences.map((sent, idx) =>
    createSentenceWithBlanks(sent, idx, wordsPerSentence)
  );
}

export type BlankFillResult = {
  wordId: string;
  word: string;
  userAnswer: string;
  correct: boolean;
};
