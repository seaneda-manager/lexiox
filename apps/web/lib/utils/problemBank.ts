/**
 * Problem Bank Utilities
 * - Topic 중복 확인
 * - 문제 선택
 * - Daily Task 생성
 */

import { createClient } from '@supabase/supabase-js';
import type {
  ProblemType,
  ProblemDifficulty,
  DailyTaskType,
} from '@/lib/types/problem-bank';
import { DAILY_TASK_COMPOSITIONS } from '@/lib/types/problem-bank';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * 학생이 최근 30일 이내에 푼 topic 조회
 */
export async function getStudentRecentTopics(
  studentId: string,
  daysBack: number = 30
): Promise<Set<string>> {
  const cleanStudentId = studentId.trim();
  const { data, error } = await supabase
    .from('problem_topic_tracker_2026')
    .select('topic')
    .eq('student_id', cleanStudentId)
    .gt('last_solved_date', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .limit(1000);

  if (error) {
    console.error('Error fetching student recent topics:', error);
    return new Set();
  }

  return new Set(data?.map(row => row.topic) ?? []);
}

/**
 * Class에서 푼 문제 조회 (그 class의 학생들이 이미 푼 것들)
 */
export async function getClassCompletedProblems(
  classId: string,
  problemType: ProblemType
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('class_problem_history_2026')
    .select('problem_id')
    .eq('class_id', classId)
    .eq('problem_type', problemType);

  if (error) {
    console.error('Error fetching class completed problems:', error);
    return new Set();
  }

  return new Set(data?.map(row => row.problem_id) ?? []);
}

/**
 * 사용 가능한 Complete Words 문제 선택 (topic 중복 제외)
 *
 * ⚠️ IMPORTANT: CW는 짧은 지문 기반 (70~120 단어)
 * - problem_bank_complete_words_2026만 사용
 * - Academic Passage 크기 지문은 절대 금지
 */
export async function selectCompleteWordsProblem(
  studentId: string | undefined,
  difficulty: ProblemDifficulty,
  recentTopics: Set<string>
): Promise<string | null> {
  // Complete Words 테이블에서만 선택 (짧은 지문 전용)
  let query = supabase
    .from('problem_bank_complete_words_2026')
    .select('id, topic')
    .eq('difficulty', difficulty)
    .limit(50);

  const { data, error } = await query;

  if (error) {
    console.error('[selectCompleteWordsProblem] Error:', error);
    return null;
  }

  if (!data || data.length === 0) {
    console.warn('[selectCompleteWordsProblem] No complete_words problem available for difficulty:', difficulty);
    return null;
  }

  // topic이 중복되지 않은 첫 번째 문제 선택
  const available = data.find(row => !recentTopics.has(row.topic));
  if (!available?.id) {
    console.warn('[selectCompleteWordsProblem] No available problem (all topics blocked)');
  }
  return available?.id ?? null;
}

/**
 * 사용 가능한 Daily Life 문제 선택
 */
export async function selectDailyLifeProblem(
  studentId: string | undefined,
  difficulty: ProblemDifficulty,
  recentTopics: Set<string>
): Promise<string | null> {
  const { data, error } = await supabase
    .from('problem_bank_daily_life_2026')
    .select('id, topic')
    .eq('difficulty', difficulty)
    .limit(50);

  if (error) {
    console.error('Error selecting daily life problem:', error);
    return null;
  }

  if (!data || data.length === 0) return null;

  const available = data.find(row => !recentTopics.has(row.topic));
  return available?.id ?? null;
}

/**
 * 사용 가능한 Academic Passage 문제 선택
 */
export async function selectAcademicPassageProblem(
  studentId: string | undefined,
  difficulty: ProblemDifficulty,
  recentTopics: Set<string>
): Promise<string | null> {
  const { data, error } = await supabase
    .from('problem_bank_academic_passage_2026')
    .select('id, topic')
    .eq('difficulty', difficulty)
    .limit(50);

  if (error) {
    console.error('Error selecting academic passage problem:', error);
    return null;
  }

  if (!data || data.length === 0) return null;

  const available = data.find(row => !recentTopics.has(row.topic));
  return available?.id ?? null;
}

/**
 * Daily Task용 문제 조합 생성
 */
export async function createProblemCombination(
  taskType: DailyTaskType,
  difficulty: ProblemDifficulty,
  studentId?: string,
  classId?: string
): Promise<{
  complete_words_ids: string[];
  daily_life_ids: string[];
  academic_passage_ids: string[];
}> {
  const composition =
    require('@/lib/types/problem-bank').DAILY_TASK_COMPOSITIONS[taskType];

  // 학생의 최근 topic 조회
  const cleanStudentId = studentId?.trim();
  const recentTopics = cleanStudentId ? await getStudentRecentTopics(cleanStudentId) : new Set();

  const result = {
    complete_words_ids: [] as string[],
    daily_life_ids: [] as string[],
    academic_passage_ids: [] as string[],
  };

  // Complete Words 선택 (짧은 지문 기반)
  for (let i = 0; i < composition.complete_words; i++) {
    const id = await selectCompleteWordsProblem(studentId, difficulty, recentTopics as Set<string>);
    if (id) {
      result.complete_words_ids.push(id);
      // 선택된 문제의 topic을 recentTopics에 추가 (중복 방지)
      const { data } = await supabase
        .from('problem_bank_complete_words_2026')
        .select('topic')
        .eq('id', id)
        .single();
      if (data) recentTopics.add(data.topic);
    }
  }

  // Daily Life 선택
  for (let i = 0; i < composition.daily_life; i++) {
    const id = await selectDailyLifeProblem(studentId, difficulty, recentTopics as Set<string>);
    if (id) {
      result.daily_life_ids.push(id);
      const { data } = await supabase
        .from('problem_bank_daily_life_2026')
        .select('topic')
        .eq('id', id)
        .single();
      if (data) recentTopics.add(data.topic);
    }
  }

  // Academic Passage 선택
  for (let i = 0; i < composition.academic_passage; i++) {
    const id = await selectAcademicPassageProblem(studentId, difficulty, recentTopics as Set<string>);
    if (id) {
      result.academic_passage_ids.push(id);
      const { data } = await supabase
        .from('problem_bank_academic_passage_2026')
        .select('topic')
        .eq('id', id)
        .single();
      if (data) recentTopics.add(data.topic);
    }
  }

  return result;
}

/**
 * 학생 또는 Class의 Daily Task 생성
 */
export async function createDailyTask(
  taskType: DailyTaskType,
  difficulty: ProblemDifficulty,
  studentId?: string,
  classId?: string,
  dueDate?: string
) {
  if (!studentId && !classId) {
    throw new Error('Either studentId or classId must be provided');
  }

  // 공백 제거
  const cleanStudentId = studentId?.trim();
  const cleanClassId = classId?.trim();

  // 문제 조합 선택
  const problemIds = await createProblemCombination(
    taskType,
    difficulty,
    cleanStudentId,
    cleanClassId
  );

  console.log('[createDailyTask] Problem IDs:', {
    complete_words: problemIds.complete_words_ids.length,
    daily_life: problemIds.daily_life_ids.length,
    academic_passage: problemIds.academic_passage_ids.length,
    total: problemIds.complete_words_ids.length + problemIds.daily_life_ids.length + problemIds.academic_passage_ids.length,
  });

  // Daily Test 생성
  const { data, error } = await supabase
    .from('daily_tests')
    .insert({
      task_type: taskType,
      difficulty,
      complete_words_ids: problemIds.complete_words_ids,
      daily_life_ids: problemIds.daily_life_ids,
      academic_passage_ids: problemIds.academic_passage_ids,
      student_id: cleanStudentId,
      class_id: cleanClassId,
      assigned_date: new Date().toISOString(),
      due_date: dueDate,
      status: 'assigned',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating daily task:', error);
    throw error;
  }

  console.log('[createDailyTask] Task created:', {
    id: data.id,
    complete_words_ids: data.complete_words_ids?.length ?? 0,
    daily_life_ids: data.daily_life_ids?.length ?? 0,
    academic_passage_ids: data.academic_passage_ids?.length ?? 0,
  });

  return data;
}

/**
 * 한 class의 모든 학생에게 동시에 Daily Task 생성
 * (해당 class 학생들이 푼 문제 제외)
 */
export async function assignDailyTaskToClass(
  classId: string,
  taskType: DailyTaskType,
  difficulty: ProblemDifficulty,
  dueDate?: string
) {
  // Class에서 이미 푼 문제들 조회
  const completedCW = await getClassCompletedProblems(classId, 'complete_words');
  const completedDL = await getClassCompletedProblems(classId, 'daily_life');
  const completedAP = await getClassCompletedProblems(classId, 'academic_passage');

  // 새로운 문제만 선택해서 하나의 task 생성
  const task = await createDailyTask(taskType, difficulty, undefined, classId, dueDate);

  return task;
}

/**
 * 주어진 학생의 Daily Tests 목록 조회
 */
export async function getStudentDailyTasks(
  studentId: string,
  status?: 'assigned' | 'in_progress' | 'completed' | 'overdue'
) {
  const cleanStudentId = studentId.trim();
  let query = supabase
    .from('daily_tests')
    .select('*')
    .eq('student_id', cleanStudentId)
    .is('deleted_at', null) // soft delete 필터
    .order('due_date', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching daily tests:', error);
    throw error;
  }

  return data;
}

/**
 * Daily Test 및 포함된 문제들 조회 (with problems populated)
 *
 * 지문 유형별로 정확하게 패키징:
 * - complete_words: blanks 배열 포함 (채우기형)
 * - daily_life/academic_passage: questions 배열 포함 (객관식)
 */
export async function getDailyTaskWithProblems(taskId: string) {
  const { data: task, error: taskError } = await supabase
    .from('daily_tests')
    .select('*')
    .eq('id', taskId)
    .is('deleted_at', null) // soft delete 필터
    .single();

  if (taskError) throw taskError;

  // 문제들 조회 (지문 유형별)
  const [cwProblems, dlProblems, apProblems] = await Promise.all([
    // Complete Words: blanks 배열 형식
    task.complete_words_ids && task.complete_words_ids.length > 0
      ? supabase
          .from('problem_bank_complete_words_2026')
          .select('id, passage, blanks, difficulty, topic')
          .in('id', task.complete_words_ids)
      : Promise.resolve({ data: [] }),
    // Daily Life: questions 배열 형식
    task.daily_life_ids && task.daily_life_ids.length > 0
      ? supabase
          .from('problem_bank_daily_life_2026')
          .select('id, passage, questions, difficulty, topic')
          .in('id', task.daily_life_ids)
      : Promise.resolve({ data: [] }),
    // Academic Passage: questions 배열 형식
    task.academic_passage_ids && task.academic_passage_ids.length > 0
      ? supabase
          .from('problem_bank_academic_passage_2026')
          .select('id, passage, questions, difficulty, topic')
          .in('id', task.academic_passage_ids)
      : Promise.resolve({ data: [] }),
  ]);

  // 각 문제 유형별로 정확하게 패키징
  const formatCompleteWords = (cwProblems.data ?? []).map(problem => ({
    id: problem.id,
    type: 'complete_words' as const,
    passage: problem.passage,
    blanks: problem.blanks, // 채우기 문제용
    difficulty: problem.difficulty,
    topic: problem.topic,
  }));

  const formatDailyLife = (dlProblems.data ?? []).map(problem => ({
    id: problem.id,
    type: 'daily_life' as const,
    passage: problem.passage,
    questions: problem.questions, // 객관식 문제용
    difficulty: problem.difficulty,
    topic: problem.topic,
  }));

  const formatAcademicPassage = (apProblems.data ?? []).map(problem => ({
    id: problem.id,
    type: 'academic_passage' as const,
    passage: problem.passage,
    questions: problem.questions, // 객관식 문제용
    difficulty: problem.difficulty,
    topic: problem.topic,
  }));

  return {
    ...task,
    problems: {
      complete_words: formatCompleteWords,
      daily_life: formatDailyLife,
      academic_passage: formatAcademicPassage,
    },
    // 하위호환성을 위해 기존 필드도 유지
    complete_words: formatCompleteWords,
    daily_life: formatDailyLife,
    academic_passage: formatAcademicPassage,
  };
}

/**
 * 학생의 문제 풀이 기록 저장
 */
export async function recordProblemSolution(
  studentId: string,
  problemType: ProblemType,
  problemId: string,
  isCorrect: boolean,
  dailyTaskId?: string,
  timeSpentSeconds?: number
) {
  const cleanStudentId = studentId.trim();
  const { data, error } = await supabase
    .from('student_problem_history_2026')
    .insert({
      student_id: cleanStudentId,
      problem_type: problemType,
      problem_id: problemId,
      completed_at: new Date().toISOString(),
      is_correct: isCorrect,
      time_spent_seconds: timeSpentSeconds,
      daily_task_id: dailyTaskId,
    })
    .select()
    .single();

  if (error) throw error;

  // Topic Tracker 업데이트
  const { data: problem } = await supabase
    .from(`problem_bank_${problemType}_2026`)
    .select('topic')
    .eq('id', problemId)
    .single();

  if (problem) {
    const availableAfter = new Date();
    availableAfter.setDate(availableAfter.getDate() + 30); // 30일 후 재사용 가능

    await supabase.from('problem_topic_tracker_2026').upsert(
      {
        student_id: studentId,
        problem_type: problemType,
        topic: problem.topic,
        last_solved_date: new Date().toISOString().split('T')[0],
        available_after_date: availableAfter.toISOString().split('T')[0],
        solve_count: 1,
      },
      { onConflict: 'student_id,problem_type,topic' }
    );
  }

  return data;
}
