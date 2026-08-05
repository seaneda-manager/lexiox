/**
 * Problem Bank Types for Daily Task System
 */

// ============================================
// Problem Bank Items
// ============================================

export type ProblemDifficulty = 'easy' | 'core' | 'hard';
export type ProblemType = 'complete_words' | 'daily_life' | 'academic_passage';
export type DailyTaskType = 'light' | 'medium_1' | 'medium_2' | 'medium_3' | 'medium_4';
export type ContextType = 'notice' | 'email' | 'social_post' | 'web_article' | 'other';

// Complete Words (채우기형 문제)
export type CompleteWordsProblem = {
  id: string;
  type: 'complete_words';
  topic: string;
  difficulty: ProblemDifficulty;
  passage: string; // 평문 지문
  paragraph_html?: string; // 하위호환성
  blanks: Array<{
    id: string;
    order: number;
    correct_token: string;
  }>;
  source_test_id?: string;
  created_at?: string;
  created_by?: string;
};

// Daily Life (객관식 문제 - 일상)
export type DailyLifeProblem = {
  id: string;
  type: 'daily_life';
  topic: string;
  difficulty: ProblemDifficulty;
  passage: string; // 평문 지문
  context_type?: ContextType;
  content_html?: string; // 하위호환성
  questions: Array<{
    id: string;
    number?: number;
    type?: string;
    stem: string;
    choices: Array<{
      id: string;
      text: string;
      is_correct?: boolean;
    }>;
  }>;
  source_test_id?: string;
  created_at?: string;
  created_by?: string;
};

// Academic Passage (객관식 문제 - 학술)
export type AcademicPassageProblem = {
  id: string;
  type: 'academic_passage';
  topic: string;
  difficulty: ProblemDifficulty;
  passage: string; // 평문 지문
  title?: string;
  passage_html?: string; // 하위호환성
  questions: Array<{
    id: string;
    number?: number;
    type?: string;
    stem: string;
    choices: Array<{
      id: string;
      text: string;
      is_correct?: boolean;
    }>;
    meta?: {
      insertion?: {
        target_sentence: string;
        correct_index: number;
      };
    };
  }>;
  source_test_id?: string;
  created_at?: string;
  created_by?: string;
};

// Union type
export type ProblemBankItem =
  | CompleteWordsProblem
  | DailyLifeProblem
  | AcademicPassageProblem;

// ============================================
// History Tracking
// ============================================

export type StudentProblemHistory = {
  id: string;
  student_id: string;
  problem_type: ProblemType;
  problem_id: string;
  completed_at: string;
  score?: number;
  is_correct: boolean;
  time_spent_seconds?: number;
  assignment_id?: string;
  daily_task_id?: string;
  created_at: string;
};

export type ClassProblemHistory = {
  id: string;
  class_id: string;
  problem_type: ProblemType;
  problem_id: string;
  assigned_date: string;
  num_students_assigned: number;
  num_students_completed: number;
  assignment_id?: string;
  created_at: string;
  updated_at: string;
};

export type ProblemTopicTracker = {
  id: string;
  student_id: string;
  problem_type: ProblemType;
  topic: string;
  last_solved_date?: string;
  solve_count: number;
  available_after_date?: string;
  created_at: string;
  updated_at: string;
};

// ============================================
// Daily Task
// ============================================

export type DailyTask = {
  id: string;
  task_type: DailyTaskType;
  difficulty: ProblemDifficulty;
  title?: string;

  // 문제 IDs
  complete_words_ids: string[];
  daily_life_ids: string[];
  academic_passage_ids: string[];

  // 대상
  student_id?: string;
  class_id?: string;

  // 스케줄
  assigned_date: string;
  due_date?: string;
  started_at?: string;
  completed_at?: string;

  // 상태
  status: 'assigned' | 'in_progress' | 'completed' | 'overdue';
  total_score?: number;

  created_at: string;
  updated_at: string;
  created_by?: string;
};

// Daily Task with populated problems
export type DailyTaskWithProblems = Omit<
  DailyTask,
  'complete_words_ids' | 'daily_life_ids' | 'academic_passage_ids'
> & {
  complete_words: CompleteWordsProblem[];
  daily_life: DailyLifeProblem[];
  academic_passage: AcademicPassageProblem[];
};

// ============================================
// Task Type Compositions
// ============================================

export const DAILY_TASK_COMPOSITIONS: Record<
  DailyTaskType,
  {
    complete_words: number;
    daily_life: number;
    academic_passage: number;
    total: number;
  }
> = {
  light: {
    complete_words: 2,
    daily_life: 2,
    academic_passage: 0,
    total: 4,
  },
  medium_1: {
    complete_words: 1,
    daily_life: 1,
    academic_passage: 1,
    total: 3,
  },
  medium_2: {
    complete_words: 1,
    daily_life: 0,
    academic_passage: 1,
    total: 2,
  },
  medium_3: {
    complete_words: 0,
    daily_life: 1,
    academic_passage: 1,
    total: 2,
  },
  medium_4: {
    complete_words: 1,
    daily_life: 1,
    academic_passage: 0,
    total: 2,
  },
};

// ============================================
// API Requests/Responses
// ============================================

export type CreateDailyTaskRequest = {
  taskType: DailyTaskType;
  difficulty: ProblemDifficulty;
  studentId?: string;
  classId?: string;
  dueDate?: string;
};

export type CreateDailyTaskResponse = {
  ok: boolean;
  task?: DailyTaskWithProblems;
  error?: string;
};

export type ListStudentDailyTasksResponse = {
  ok: boolean;
  tasks: DailyTaskWithProblems[];
  error?: string;
};

// ============================================
// Problem Bank Queries
// ============================================

export type ProblemBankQueryOptions = {
  topic?: string;
  difficulty?: ProblemDifficulty;
  excludeTopics?: string[]; // 학생이 최근에 푼 topic들
  limit?: number;
};

export type SelectProblemOptions = ProblemBankQueryOptions & {
  studentId?: string;
  classId?: string;
  checkHistory?: boolean; // topic 중복 확인
};
