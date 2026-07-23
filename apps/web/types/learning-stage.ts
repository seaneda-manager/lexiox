// Learning Stage 타입 정의

export interface LearningStageItem {
  id: string;
  word_id: string;
  given_spelling: string;
  meaning_1: string;
  meaning_1_en: string;
  meaning_2?: string;
  meaning_2_en?: string;
  meaning_context?: string;
  meaning_related_words: string[];
  meaning_definition_en?: string;
  quiz_synonyms: string[];
  quiz_example_en: string;
  quiz_example_ko: string;
  quiz_choices: QuizChoice[];
  data_status: 'clean' | 'flagged' | 'rejected';
  mojibake_detected: boolean;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface QuizChoice {
  id: number;
  text: string;
  is_correct: boolean;
}

export interface LearningStageAttempt {
  id: string;
  student_id: string;
  word_id: string;
  spelling_attempt?: string;
  spelling_correct?: boolean;
  spelling_attempts: number;
  meaning_viewed: boolean;
  quiz_answer?: number;
  quiz_correct?: boolean;
  quiz_attempts: number;
  tab_sequence: string[];
  time_spent_total?: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LearningStageFlag {
  id: string;
  word_id: string;
  flag_type: 'MOJIBAKE_DETECTED' | 'EMPTY_MEANING' | 'BAD_PAIR' | 'LENGTH_MISMATCH' | 'BAD_TRANSLATION';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  original_data: Record<string, any>;
  detected_issue: string;
  suggested_fix?: string;
  confidence: number;
  status: 'pending' | 'approved' | 'rejected' | 'edited';
  resolved_by?: string;
  resolved_at?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LearningStageData {
  wordId: string;
  course: string;
  progress: {
    currentDay: number;
    totalDays: number;
    wordPosition: string;
  };
  spelling: {
    given: string;
    instructions: string;
  };
  meaning: {
    meanings: Meaning[];
    relatedWords: string[];
    definition: string;
    reportBrokenAvailable: boolean;
  };
  quiz: {
    instruction: string;
    synonyms: string[];
    example: {
      en: string;
      ko: string;
    };
    choices: QuizChoice[];
  };
  todayProgress: TodayProgressWord[];
  streak: number;
  dailyProgressPercent: number;
  weeklyProgressPercent: number;
}

export interface Meaning {
  id: number;
  text: string;
  textEn: string;
  context?: string;
  pos: string;
}

export interface TodayProgressWord {
  word: string;
  pos: string;
  meaning: string;
}

export interface LearningStageAttemptRequest {
  tab: 'spelling' | 'meaning' | 'quiz';
  data: {
    spelling?: string;
    viewedMeaning?: boolean;
    selectedChoiceId?: number;
    attemptNumber?: number;
    timeSent?: number;
  };
}

export interface LearningStageAttemptResponse {
  attemptId: string;
  tab: 'spelling' | 'meaning' | 'quiz';
  result: {
    correct: boolean;
    feedback: string;
  };
  nextStep: 'meaning' | 'quiz' | 'complete';
}

export interface LearningStageMojibakeError {
  status: 'error';
  message: string;
  flagId: string;
  action: 'MOJIBAKE_DETECTED';
  fallback: {
    tab: 'meaning' | 'quiz';
    message: string;
  };
}

export interface AdminFlagResponse {
  status: 'success';
  data: {
    total: number;
    byStatus: Record<string, number>;
    flags: LearningStageFlag[];
  };
}

export interface AdminResolveRequest {
  action: 'approve' | 'reject' | 'edit';
  newData?: Record<string, any>;
  notes?: string;
}

export interface AdminResolveResponse {
  status: 'success';
  flagId: string;
  resolved: boolean;
  appliedChanges: boolean;
}
