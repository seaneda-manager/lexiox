export type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'other';

export const POS_LABELS: Record<PartOfSpeech, string> = {
  noun: '명사',
  verb: '동사',
  adjective: '형용사',
  adverb: '부사',
  preposition: '전치사',
  other: '기타',
};

export interface VocabWord {
  id: string;
  word: string;
  pos: PartOfSpeech;
  meaning: string;
  example?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface VocabTestSession {
  sessionId: string;
  studentId: string;
  words: VocabWord[];
  stage: 'checklist' | 'fillin' | 'result';
  startedAt: string;
  completedAt?: string;
}

export interface ChecklistResponse {
  checkedWords: Set<string>; // word IDs
  uncheckedWords: Set<string>; // word IDs to test
}

export interface FillinAnswer {
  wordId: string;
  spelling: string;
  pos: PartOfSpeech;
  meaning: string;
}

export interface FillinResult {
  wordId: string;
  correct: boolean;
  spelling: {
    correct: boolean;
    expected: string;
    got: string;
  };
  pos: {
    correct: boolean;
    expected: PartOfSpeech;
    got: PartOfSpeech;
  };
  meaning: {
    correct: boolean;
    expected: string;
    got: string;
  };
}

export interface VocabTestResult {
  sessionId: string;
  studentId: string;
  totalWords: number;
  testedWords: number;
  correctCount: number;
  incorrectCount: number;
  score: number; // 0-100
  results: FillinResult[];
  completedAt: string;
  duration: number; // seconds
}

// 채점 함수
export function checkAnswer(
  answer: FillinAnswer,
  correct: VocabWord
): FillinResult {
  const spellingCorrect = answer.spelling.toLowerCase().trim() === correct.word.toLowerCase();
  const posCorrect = answer.pos === correct.pos;
  const meaningCorrect = answer.meaning.toLowerCase().trim() === correct.meaning.toLowerCase();

  return {
    wordId: correct.id,
    correct: spellingCorrect && posCorrect && meaningCorrect,
    spelling: {
      correct: spellingCorrect,
      expected: correct.word,
      got: answer.spelling,
    },
    pos: {
      correct: posCorrect,
      expected: correct.pos,
      got: answer.pos,
    },
    meaning: {
      correct: meaningCorrect,
      expected: correct.meaning,
      got: answer.meaning,
    },
  };
}

export function calculateScore(results: FillinResult[]): number {
  if (results.length === 0) return 0;
  const correctCount = results.filter(r => r.correct).length;
  return Math.round((correctCount / results.length) * 100);
}
