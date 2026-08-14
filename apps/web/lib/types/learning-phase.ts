export type Curriculum = 'toefl' | 'lexiox_jr' | 'lexiox_middle' | 'lexiox_high' | 'hi_naesin';
export type LearningPhase =
  // LEXiOX phases
  | 'postcheckup'
  | 'homework'
  | 'lectures'
  | 'vocab_test'
  | 'correction'
  | 'skills'
  // TOEFL phases
  | 'daily_tests'
  | 'review'
  | 'havruta';

export interface PhaseStatus {
  phase: LearningPhase;
  isCompleted: boolean;
  completedAt?: string | null;
  isCurrentPhase: boolean;
  order: number;
}

export interface StudentPhaseState {
  studentId: string;
  curriculum: Curriculum;
  currentPhase: LearningPhase;
  phases: PhaseStatus[];
  lastUpdatedAt: string;
}

export interface PhaseCardProps {
  phase: LearningPhase;
  studentId: string;
  isCompleted: boolean;
  isCurrentPhase: boolean;
  order: number;
}

// Phase별 구체적인 데이터 타입
export interface PostCheckupData {
  quizId: string;
  title: string;
  description: string;
  questionsCount: number;
  completedAt?: string;
  score?: number;
}

export interface ScheduleData {
  classDate: string;
  classDayOfWeek: string;
  classTime?: string;
  location?: string;
  homeworkCount: number;
  homeworkItems: Array<{
    id: string;
    title: string;
    type: 'photo' | 'recording' | 'grammar';
    submittedAt?: string;
    status: 'pending' | 'submitted' | 'graded';
  }>;
}

export interface VocabTestData {
  testId: string;
  wordCount: number;
  estimatedTimeMinutes: number;
  recentScore?: number;
  stage: 'checklist' | 'fillin';
}

export interface CorrectionData {
  correctionId: string;
  wrongWordCount: number;
  estimatedTimeMinutes: number;
  correctionRate?: number;
}

export interface SkillsData {
  activeSkill: 'reading' | 'listening' | 'writing' | 'speaking' | 'grammar';
  skills: Array<{
    skill: 'reading' | 'listening' | 'writing' | 'speaking' | 'grammar';
    drillCount: number;
    completedCount: number;
    estimatedTimeMinutes: number;
  }>;
}

export interface HavrutaData {
  topicCount: number;
  recentTopic?: {
    id: string;
    title: string;
    description: string;
    participantCount: number;
  };
  peers?: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
}
