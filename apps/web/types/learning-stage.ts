export interface Meaning {
  kr: string;
  en: string;
}

export interface QuizChoice {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface LearningStageData {
  id: string;
  wordId: string;
  word: string;
  meanings: Meaning[];
  quiz: {
    question: string;
    choices: QuizChoice[];
  };
  examples: string[];
  imageUrl?: string;
}

export interface LearningStageAttemptRequest {
  wordId: string;
  stage: string;
  response: string;
  isCorrect: boolean;
  timeSpent: number;
}

export interface LearningStageAttemptResponse {
  success: boolean;
  message: string;
  points?: number;
}

export interface LearningStageFlag {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
}

export interface TodayProgressWord {
  wordId: string;
  word: string;
  stage: number;
  completed: boolean;
  lastAttempted?: string;
}
