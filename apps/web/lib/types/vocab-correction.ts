export interface CorrectionWord {
  wordId: string;
  word: string;
  pos: string;
  meaning: string;
  userAnswer: string;
  correctionStage: 'correction' | 'explanation' | 'completed';
  correctedAt?: string;
  explanationProvided?: string;
}

export interface CorrectionSession {
  sessionId: string;
  studentId: string;
  wrongWords: CorrectionWord[];
  currentWordIndex: number;
  completedCount: number;
  stage: 'correction' | 'explanation' | 'review';
}

export interface CorrectionData {
  wordId: string;
  correctedMeaning: string; // 학생이 제출한 정정된 뜻
  explanation: string; // 설명 (예문 또는 설명)
  exampleSentence?: string;
}
