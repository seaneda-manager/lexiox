/**
 * 생성된 문제의 품질을 자동으로 검증
 * - Complete Words: 정확히 10개, 품사 비율, 중복 없음
 * - Daily Life/Academic: 정답 분포, 선택지 개수
 */

interface ValidationResult {
  valid: boolean;
  score: number; // 0-100
  issues: string[];
  warnings: string[];
}

// ============================================
// Complete Words 검증
// ============================================

export function validateCompleteWordsQuality(blanks: any[]): ValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  // 1. 정확히 10개
  if (blanks.length !== 10) {
    issues.push(`❌ 정확히 10개여야 함 (현재: ${blanks.length}개)`);
    score -= 20;
  }

  // 2. 중복 확인
  const words = new Set(blanks.map(b => b.word?.toLowerCase()));
  if (words.size !== blanks.length) {
    issues.push(`❌ 중복 단어 감지 (${blanks.length - words.size}개)`);
    score -= 15;
  }

  // 3. 품사 비율 (70% 내용어, 30% 기능어)
  const contentPos = ['noun', 'verb', 'adj', 'adv'];
  const contentCount = blanks.filter(b => contentPos.includes(b.partOfSpeech)).length;
  const contentRatio = (contentCount / blanks.length) * 100;

  if (contentRatio < 60 || contentRatio > 80) {
    warnings.push(`⚠️ 품사 비율 주의 (내용어: ${contentRatio.toFixed(0)}%, 권장: 70%)`);
    score -= 10;
  }

  // 4. visible 글자 후보 검증 (간단한 체크)
  let visibleIssues = 0;
  blanks.forEach(b => {
    const visible = b.visible?.length ?? 0;
    const word = b.word?.length ?? 0;
    if (visible >= word) {
      visibleIssues++;
    }
  });

  if (visibleIssues > 0) {
    issues.push(`❌ visible 글자 오류 (${visibleIssues}개 단어)`);
    score -= 15;
  }

  return {
    valid: issues.length === 0,
    score: Math.max(0, score),
    issues,
    warnings,
  };
}

// ============================================
// Daily Life / Academic 검증
// ============================================

export function validateMultipleChoiceQuality(questions: any[], type: 'daily_life' | 'academic_passage'): ValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  const expectedCount = type === 'daily_life' ? 3 : 5;
  const tolerance = type === 'daily_life' ? 1 : 0; // DL은 3~4개 허용

  // 1. 문제 개수
  if (Math.abs(questions.length - expectedCount) > tolerance) {
    issues.push(`❌ ${expectedCount}개 문제 필요 (현재: ${questions.length}개)`);
    score -= 20;
  }

  // 2. 각 문제별 검증
  questions.forEach((q, idx) => {
    // 선택지 4개 확인
    if (!q.choices || q.choices.length !== 4) {
      issues.push(`❌ 문제${idx + 1}: 선택지는 정확히 4개 필요 (현재: ${q.choices?.length ?? 0}개)`);
      score -= 10;
    }

    // 정답 하나만 있는지 확인
    const correctCount = q.choices?.filter((c: any) => c.is_correct).length ?? 0;
    if (correctCount !== 1) {
      issues.push(`❌ 문제${idx + 1}: 정답은 정확히 1개 (현재: ${correctCount}개)`);
      score -= 10;
    }
  });

  // 3. 정답 분포 (AAAA/BBBB 패턴 방지)
  const answerDist = questions.map(q =>
    q.choices.findIndex((c: any) => c.is_correct)
  );

  const distribution: Record<number, number> = {};
  answerDist.forEach(ans => {
    distribution[ans] = (distribution[ans] || 0) + 1;
  });

  // 모든 정답이 같은 선택지에 있으면 안 됨
  const maxCount = Math.max(...Object.values(distribution));
  if (maxCount === answerDist.length) {
    issues.push(`❌ 정답 분포 오류: 모든 정답이 같은 선택지 (AAAA/BBBB 패턴)`);
    score -= 25;
  }

  // 정답이 너무 한쪽으로 치우쳐있으면 경고
  if (maxCount > Math.ceil(answerDist.length * 0.6)) {
    warnings.push(`⚠️ 정답 분포 불균형 (가장 많은 선택지: ${maxCount}/${answerDist.length}개)`);
    score -= 10;
  }

  return {
    valid: issues.length === 0,
    score: Math.max(0, score),
    issues,
    warnings,
  };
}

// ============================================
// 통합 검증
// ============================================

export function validateProblemQuality(problem: any): ValidationResult {
  if (problem.type === 'complete_words') {
    return validateCompleteWordsQuality(problem.blanks || []);
  }

  if (problem.type === 'daily_life') {
    return validateMultipleChoiceQuality(problem.questions || [], 'daily_life');
  }

  if (problem.type === 'academic_passage') {
    return validateMultipleChoiceQuality(problem.questions || [], 'academic_passage');
  }

  return {
    valid: false,
    score: 0,
    issues: ['❌ 알 수 없는 문제 유형'],
    warnings: [],
  };
}
