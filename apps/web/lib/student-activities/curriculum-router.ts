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
 * 학생의 커리큘럼을 조회.
 *
 * academy_students.curriculum 컬럼을 읽던 예전 구현은 그 컬럼이 실제 DB에 존재하지 않아
 * 항상 조용히 실패하고 'lexiox_jr'로 폴백하고 있었다(2026-08-23 발견) — 즉 이 함수를 쓰는
 * /student/home의 Phase 타임라인은 프로그램에 관계없이 항상 LEXiOX 주니어 순서로 나오고 있었음.
 *
 * 대신 실제 존재하는 컬럼(profiles.program, academy_students.grade_band)으로 유도한다 —
 * app/protected/student/page.tsx의 deriveCurriculum()과 동일한 grade_band 매핑을 재사용해서
 * 두 곳이 서로 다른 기준으로 갈라지지 않게 한다. hi_naesin은 아직 profile 레벨에서 안정적으로
 * 구분할 방법이 없어 이 함수에서는 반환하지 않는다 — 지금은 PHASE_ORDER상 lexiox_*와 배열이
 * 동일해서 기능적 차이는 없다.
 */
export async function getStudentCurriculum(
  supabase: SupabaseClient<any, 'public', any>,
  studentId: string
): Promise<Curriculum> {
  try {
    const { data: student, error } = await supabase
      .from('academy_students')
      .select('grade_band, auth_user_id')
      .eq('id', studentId)
      .maybeSingle();

    if (error || !student) {
      console.error('Failed to fetch student curriculum:', error);
      return 'lexiox_jr';
    }

    let program: string | null = null;
    if (student.auth_user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('program')
        .eq('id', student.auth_user_id)
        .maybeSingle();
      program = (profile as any)?.program ?? null;
    }

    if (program === 'toefl' || program === 'gap') return 'toefl';

    const gradeBand = student.grade_band as string | null;
    if (gradeBand === 'K10_12' || gradeBand === 'POST_K12') return 'lexiox_high';
    if (gradeBand === 'K7_9') return 'lexiox_middle';
    return 'lexiox_jr';
  } catch (error) {
    console.error('Error in getStudentCurriculum:', error);
    return 'lexiox_jr';
  }
}
