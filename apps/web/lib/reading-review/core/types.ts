export type AccuracyBucketRow = {
  total: number;
  correct: number;
  accuracy: number;
};

export type AccuracyBucket = Record<string, AccuracyBucketRow>;

export type QuestionRow = {
  id: string;
  set_id: string;
  passage_id: string;
  type: string;
  score: number | null;
};

export type AnswerRow = {
  question_id: string;
  is_correct: boolean | null;
  elapsed_sec: number | null;
  flagged: boolean | null;
  omitted: boolean | null;
  wrong_reason_tags: string[] | null;
};

export type EvidenceLogRow = {
  question_id: string;
  selected_evidence: string[] | null;
  matched: boolean | null;
};

export type UnknownWordLogRow = {
  passage_id: string;
  words: string[] | null;
};

export type SentenceAnalysisLogRow = {
  question_id: string;
  translation_ko: string | null;
  subject_text: string | null;
  verb_text: string | null;
  object_text: string | null;
  complement_text: string | null;
  modifier_text: string | null;
};

export type VocabLogRow = {
  word: string;
  is_correct: boolean | null;
};

export type SessionAnalysisSnapshotRow = {
  session_id: string;
  weak_tags: string[] | null;
  evidence_metrics: Record<string, unknown> | null;
  vocab_metrics: Record<string, unknown> | null;
  sentence_metrics: Record<string, unknown> | null;
  behavior_metrics: Record<string, unknown> | null;
  accuracy_overall: number | null;
  score_percent: number | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export type EvidenceMetrics = {
  submittedCount: number;
  submissionRate: number;
  matchedCount: number;
  matchedRateOverall: number;
  matchedRateAmongSubmitted: number;
  mismatchCount: number;
  overSelectCount: number;
};

export type VocabMetrics = {
  unknownWordCount: number;
  unknownWordPassageCount: number;
  unknownWordPassageCoverageRate: number;
  vocabAttemptCount: number;
  vocabTestAccuracy: number | null;
  repeatedUnknownWords: string[];
};

export type SentenceMetrics = {
  sentenceLogCount: number;
  sentenceLogCoverageRate: number;
  translationSubmittedCount: number;
  translationSubmissionRate: number;
  svocCompletedCount: number;
  svocCompletionRateOverall: number;
  svocCompletionRateAmongLogged: number;
  modifierCompletedCount: number;
  modifierCompletionRateOverall: number;
  modifierCompletionRateAmongLogged: number;
};

export type BehaviorMetrics = {
  avgElapsedSec: number;
  omittedCount: number;
  flaggedCount: number;
  reviewCompletionRate: number;
};

export type WeakTagTaxonomy = {
  detail: string[];
  inference: string[];
  purposeMainIdea: string[];
  summaryOrganization: string[];
};
export type SessionAnalysisResult = {
  accuracyOverall: number;
  byQuestionType: AccuracyBucket;
  byPassage: Record<
    string,
    {
      total: number;
      correct: number;
      accuracy: number;
      unknownWordCount: number;
    }
  >;
  evidenceMetrics: EvidenceMetrics;
  vocabMetrics: VocabMetrics;
  sentenceMetrics: SentenceMetrics;
  behaviorMetrics: BehaviorMetrics;
  weakTags: string[];
  prescriptions: string[];
};
