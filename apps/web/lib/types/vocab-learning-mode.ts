/**
 * Vocab 4가지 모드 통합 타입 정의
 * Mode 1: PreScreen (Checklist)
 * Mode 2: Speed Challenge (Fillin)
 * Mode 3: Synonym (Fillin + Synonym)
 * Mode 4: Homework Correction (Correction)
 */

import type { PartOfSpeech } from "./vocab-test";

// 🎯 Vocab 학습 모드
export type VocabLearningMode = 1 | 2 | 3 | 4;

export const MODE_LABELS: Record<VocabLearningMode, string> = {
  1: "📋 PreScreen (알고/모름 판단)",
  2: "⚡ Speed Challenge (철자+뜻)",
  3: "🔄 Synonym (동의어 심화)",
  4: "📝 Homework (영영뜻+예문)",
};

export const MODE_DESCRIPTIONS: Record<VocabLearningMode, string> = {
  1: "알고 있는 단어와 배울 단어를 구분합니다",
  2: "철자와 뜻을 빠르게 입력하며 학습합니다",
  3: "동의어를 이용한 심화 학습입니다",
  4: "영영뜻과 예문으로 숙제를 완성합니다",
};

// 📚 단어 정보 (모든 Mode에서 사용)
export interface VocabWord {
  id: string;
  text: string;
  pos: PartOfSpeech;
  meaning_ko: string;
  meaning_en?: string;
  synonyms?: string[];
  examples?: string[];
  example_sentences?: Array<{ en: string; ko: string }>;
}

// 1️⃣ Mode 1: PreScreen (Checklist)
export interface Mode1PreScreenSession {
  mode: 1;
  dayId: string;
  words: VocabWord[];
  checkedWordIds: Set<string>; // "알고 있다"고 체크한 단어
  uncheckedWordIds: Set<string>; // "배워야 한다"고 체크한 단어
  startedAt: string;
  completedAt?: string;
}

// 2️⃣ Mode 2: Speed Challenge (Fillin)
export interface Mode2SpeedSession {
  mode: 2;
  dayId: string;
  words: VocabWord[]; // Mode 1의 uncheckedWordIds만
  answers: Record<
    string,
    {
      spelling: string;
      pos: PartOfSpeech;
      meaning: string;
    }
  >;
  results: Mode2Result[];
  score: number; // 0-100
  startedAt: string;
  completedAt?: string;
  correctCount: number;
  totalCount: number;
}

export interface Mode2Result {
  wordId: string;
  correct: boolean;
  spelling: { correct: boolean; expected: string; got: string };
  pos: { correct: boolean; expected: PartOfSpeech; got: PartOfSpeech };
  meaning: { correct: boolean; expected: string; got: string };
}

// 3️⃣ Mode 3: Synonym (Fillin + Synonym)
export interface Mode3SynonymSession {
  mode: 3;
  dayId: string;
  words: VocabWord[]; // Mode 2 오답 + 신규 단어
  answers: Record<
    string,
    {
      spelling: string;
      pos: PartOfSpeech;
      meaning: string;
      synonym: string; // 추가된 동의어
    }
  >;
  results: Mode3Result[];
  score: number; // 0-100
  startedAt: string;
  completedAt?: string;
  correctCount: number;
  totalCount: number;
}

export interface Mode3Result {
  wordId: string;
  correct: boolean;
  spelling: { correct: boolean; expected: string; got: string };
  synonym: { correct: boolean; expected: string; got: string };
  meaning: { correct: boolean; expected: string; got: string };
}

// 4️⃣ Mode 4: Homework (Correction + Explanation)
export interface Mode4HomeworkSession {
  mode: 4;
  dayId: string;
  words: VocabWord[]; // Mode 3 오답들만
  stage: "correction" | "explanation" | "completed";
  corrections: Record<
    string,
    {
      correctedMeaning: string; // 정정된 영영뜻
      explanation: string; // 해설 (예문 또는 추가 설명)
      exampleSentence?: string;
    }
  >;
  startedAt: string;
  completedAt?: string;
}

// 🔄 통합 학습 세션
export interface VocabLearningSession {
  sessionId: string;
  studentId: string;
  dayId: string;
  trackId: string;
  assignmentId: string;
  currentMode: VocabLearningMode;
  allWords: VocabWord[]; // Day의 모든 단어
  mode1?: Mode1PreScreenSession;
  mode2?: Mode2SpeedSession;
  mode3?: Mode3SynonymSession;
  mode4?: Mode4HomeworkSession;
  startedAt: string;
  completedAt?: string;
  totalScore: number; // 모든 Mode의 종합 점수
  timeSpentSeconds: number;
}

// 📊 Mode 전환 결과
export interface ModeTransitionResult {
  ok: boolean;
  currentMode: VocabLearningMode;
  nextMode?: VocabLearningMode;
  canAdvance: boolean; // 다음 Mode로 진행 가능한가?
  score?: number;
  message?: string;
  wordsToReview?: string[]; // 다음 Mode에서 배울 단어들
}

// 💾 Day 완료 결과
export interface VocabDayCompletionResult {
  ok: boolean;
  dayId: string;
  completedAt: string;
  totalScore: number;
  modesCompleted: VocabLearningMode[];
  timeSpentSeconds: number;
  nextDayId?: string;
  nextDayAssignmentId?: string;
}

// 🎯 Mode 완료 조건 (점수 기준)
export const MODE_COMPLETION_THRESHOLD: Record<VocabLearningMode, number> = {
  1: 0, // PreScreen은 점수 없음, 체크만 하면 완료
  2: 70, // Speed: 70% 이상이면 통과
  3: 70, // Synonym: 70% 이상이면 통과
  4: 100, // Homework: 모두 작성해야 완료 (선택사항)
};

// ✅ Mode 진행 규칙
export const MODE_PROGRESSION_RULES: Record<
  VocabLearningMode,
  {
    requiresCompletion: boolean;
    minScoreToPass: number;
    onFailAction: "retry" | "skip" | "remedial";
  }
> = {
  1: {
    requiresCompletion: true,
    minScoreToPass: 0,
    onFailAction: "skip",
  },
  2: {
    requiresCompletion: true,
    minScoreToPass: 70,
    onFailAction: "retry",
  },
  3: {
    requiresCompletion: true,
    minScoreToPass: 70,
    onFailAction: "remedial",
  },
  4: {
    requiresCompletion: false, // 선택사항
    minScoreToPass: 100,
    onFailAction: "skip",
  },
};
