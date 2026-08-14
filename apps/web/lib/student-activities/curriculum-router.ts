import type { Curriculum, LearningPhase } from '@/lib/types/learning-phase';
import type { SupabaseClient } from '@supabase/supabase-js';

// 커리큘럼별 학습 Phase 순서
export const PHASE_ORDER: Record<Curriculum, LearningPhase[]> = {
  toefl: [
    'vocab_test',       // 1. 단어 테스트
    'daily_tests',      // 2. Daily Tests 전부 풀기
    'review',           // 3. 복습 (오답 검토)
    'havruta',          // 4. 하브루타
  ],
  lexiox_jr: [
    'postcheckup',
    'homework',
    'lectures',
    'vocab_test',
    'correction',
    'skills',
    'havruta',
  ],
  lexiox_middle: [
    'postcheckup',
    'homework',
    'lectures',
    'vocab_test',
    'correction',
    'skills',
    'havruta',
  ],
  lexiox_high: [
    'postcheckup',
    'homework',
    'lectures',
    'vocab_test',
    'correction',
    'skills',
    'havruta',
  ],
  hi_naesin: [
    'postcheckup',
    'homework',
    'lectures',
    'vocab_test',
    'correction',
    'skills',
    'havruta',
  ],
};

// Phase별 한국어 라벨
export const PHASE_LABELS: Record<LearningPhase, string> = {
  postcheckup: '지난 수업 복습',
  homework: '숙제 사진 찍기',
  lectures: '강좌',
  vocab_test: '단어 테스트',
  correction: '오답 복습',
  skills: 'Skills 드릴',
  daily_tests: 'Daily Tests',
  review: '복습',
  havruta: '하브루타',
};

// Phase별 설명
export const PHASE_DESCRIPTIONS: Record<LearningPhase, string> = {
  postcheckup: '지난 수업 내용을 확인하는 퀴즈입니다',
  homework: '집에서 완료한 숙제의 사진을 찍어 제출하세요',
  lectures: '문법 및 추가 강좌를 학습하세요',
  vocab_test: '암기한 단어를 테스트합니다',
  correction: '틀린 단어를 복습하고 설명합니다',
  skills: 'Reading, Listening, Grammar 드릴을 풀어보세요',
  daily_tests: '매일의 TOEFL 테스트를 모두 풀어봅니다',
  review: '풀이한 테스트의 오답을 검토합니다',
  havruta: '학습 내용을 동료와 함께 토론합니다',
};

// Phase별 추정 소요시간 (분)
export const PHASE_DURATION: Record<LearningPhase, number> = {
  postcheckup: 10,
  homework: 15,
  lectures: 20,
  vocab_test: 10,
  correction: 10,
  skills: 15,
  daily_tests: 60,
  review: 20,
  havruta: 20,
};

// Phase별 아이콘/Emoji
export const PHASE_ICONS: Record<LearningPhase, string> = {
  postcheckup: '📋',
  homework: '✏️',
  lectures: '📚',
  vocab_test: '🔤',
  correction: '⚠️',
  skills: '🎯',
  daily_tests: '📝',
  review: '🔍',
  havruta: '💬',
};

/**
 * 주어진 커리큘럼의 Phase 순서를 반환
 */
export function getPhaseOrder(curriculum: Curriculum): LearningPhase[] {
  return PHASE_ORDER[curriculum] || PHASE_ORDER.toefl;
}

/**
 * 주어진 Phase의 다음 Phase를 반환
 */
export function getNextPhase(curriculum: Curriculum, currentPhase: LearningPhase): LearningPhase | null {
  const phases = getPhaseOrder(curriculum);
  const currentIndex = phases.indexOf(currentPhase);

  if (currentIndex === -1 || currentIndex === phases.length - 1) {
    return null;
  }

  return phases[currentIndex + 1];
}

/**
 * 주어진 Phase의 이전 Phase를 반환
 */
export function getPreviousPhase(curriculum: Curriculum, currentPhase: LearningPhase): LearningPhase | null {
  const phases = getPhaseOrder(curriculum);
  const currentIndex = phases.indexOf(currentPhase);

  if (currentIndex <= 0) {
    return null;
  }

  return phases[currentIndex - 1];
}

/**
 * Phase의 순서 번호를 반환 (1부터 시작)
 */
export function getPhaseIndex(curriculum: Curriculum, phase: LearningPhase): number {
  const phases = PHASE_ORDER[curriculum];
  const index = phases.indexOf(phase);
  return index >= 0 ? index + 1 : -1;
}

/**
 * Phase가 완료되었는지 확인
 */
export function isPhaseCompleted(
  completedPhases: LearningPhase[] | Set<LearningPhase>,
  phase: LearningPhase
): boolean {
  if (Array.isArray(completedPhases)) {
    return completedPhases.includes(phase);
  }
  return completedPhases.has(phase);
}

/**
 * 현재 Phase를 결정 (마지막 완료 Phase 다음)
 */
export function getCurrentPhase(
  curriculum: Curriculum,
  completedPhases: LearningPhase[] | Set<LearningPhase>
): LearningPhase {
  const phases = getPhaseOrder(curriculum);

  for (const phase of phases) {
    if (!isPhaseCompleted(completedPhases, phase)) {
      return phase;
    }
  }

  // 모든 phase 완료 시 마지막 phase 반환
  return phases[phases.length - 1];
}

/**
 * 학생의 커리큘럼을 조회 (academy_students 테이블에서)
 */
export async function getStudentCurriculum(
  supabase: SupabaseClient<any, 'public', any>,
  studentId: string
): Promise<Curriculum> {
  try {
    const { data, error } = await supabase
      .from('academy_students')
      .select('curriculum')
      .eq('id', studentId)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch student curriculum:', error);
      return 'lexiox_jr';
    }

    const curriculum = data?.curriculum as string | null;
    if (!curriculum) return 'lexiox_jr';

    const normalized = curriculum.toLowerCase().replace(/[-_]/g, '_');
    const validCurriculums: Curriculum[] = ['toefl', 'lexiox_jr', 'lexiox_middle', 'lexiox_high', 'hi_naesin'];

    if (validCurriculums.includes(normalized as Curriculum)) {
      return normalized as Curriculum;
    }

    return 'lexiox_jr';
  } catch (error) {
    console.error('Error in getStudentCurriculum:', error);
    return 'lexiox_jr';
  }
}
