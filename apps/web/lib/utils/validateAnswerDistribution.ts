/**
 * 4지선다 문제의 정답이 완전 무작위인지 검증
 *
 * 규칙:
 * - 규칙적 패턴이 없어야 함 (AAAA, ABCD반복, 쌍반복 등)
 * - 패턴 감지 시 셔플 가능
 * - AI 생성 후 자동 검증 및 필요시 재셔플
 */

export type AnswerDistribution = {
  A: number;
  B: number;
  C: number;
  D: number;
};

export type ValidationResult = {
  isValid: boolean;
  hasPattern: boolean;
  pattern?: string;
  distribution: AnswerDistribution;
  percentages: Record<'A' | 'B' | 'C' | 'D', number>;
  issues: string[];
  suggestions: string[];
};

/**
 * 정답 배열 분석 (예: ['A', 'B', 'C', 'A', 'D', ...])
 * 규칙적 패턴 감지 + 필요시 셔플 제안
 */
export function validateAnswerDistribution(answers: string[]): ValidationResult {
  if (!answers || answers.length === 0) {
    return {
      isValid: false,
      hasPattern: false,
      distribution: { A: 0, B: 0, C: 0, D: 0 },
      percentages: { A: 0, B: 0, C: 0, D: 0 },
      issues: ['답변이 없습니다'],
      suggestions: [],
    };
  }

  // 정규화 (대문자로)
  const normalized = answers.map((a) => a.toUpperCase().trim()).filter((a) => /^[ABCD]$/.test(a));

  if (normalized.length !== answers.length) {
    console.warn('⚠️ 유효하지 않은 답변이 포함되었습니다. 필터링되었습니다.');
  }

  if (normalized.length === 0) {
    return {
      isValid: false,
      hasPattern: false,
      distribution: { A: 0, B: 0, C: 0, D: 0 },
      percentages: { A: 0, B: 0, C: 0, D: 0 },
      issues: ['유효한 답변이 없습니다'],
      suggestions: [],
    };
  }

  // 분포 계산
  const distribution: AnswerDistribution = {
    A: normalized.filter((a) => a === 'A').length,
    B: normalized.filter((a) => a === 'B').length,
    C: normalized.filter((a) => a === 'C').length,
    D: normalized.filter((a) => a === 'D').length,
  };

  const total = normalized.length;
  const percentages = {
    A: Math.round((distribution.A / total) * 100),
    B: Math.round((distribution.B / total) * 100),
    C: Math.round((distribution.C / total) * 100),
    D: Math.round((distribution.D / total) * 100),
  };

  const issues: string[] = [];
  const suggestions: string[] = [];

  // 패턴 검사 (연속된 같은 답 또는 규칙적 반복)
  const pattern = detectPattern(normalized);
  const hasPattern = pattern !== null;

  if (pattern) {
    issues.push(`❌ 규칙적 패턴 감지: ${pattern}`);
    suggestions.push('💡 "셔플" 버튼을 클릭하여 정답을 무작위로 재배열할 수 있습니다.');
  }

  // 최종 판정: 패턴이 없으면 유효
  const isValid = !hasPattern;

  return {
    isValid,
    hasPattern,
    pattern,
    distribution,
    percentages,
    issues,
    suggestions,
  };
}

/**
 * 규칙적 패턴 감지
 * - "AAAA" (4개 이상 연속)
 * - "ABCDABCD" (4문제 패턴 반복)
 * - "AABBCCDD" (쌍 반복)
 */
function detectPattern(answers: string[]): string | null {
  const answerStr = answers.join('');

  // 패턴 1: 4개 이상 연속된 같은 문자
  if (/(.)\1{3,}/.test(answerStr)) {
    const match = answerStr.match(/(.)\1{3,}/);
    return `연속된 같은 답변: ${match?.[0]} (${match?.[0].length}개)`;
  }

  // 패턴 2: 4문제 패턴이 3회 이상 반복
  if (answers.length >= 12) {
    for (let patternLen = 4; patternLen <= 8; patternLen++) {
      for (let start = 0; start <= answers.length - patternLen * 3; start++) {
        const pattern = answerStr.substring(start, start + patternLen);
        const repeated = new RegExp(`${pattern.replace(/./g, (c) => c === '[' || c === ']' ? '\\' + c : c)}{3,}`);
        if (repeated.test(answerStr)) {
          return `반복되는 패턴: ${pattern} (3회 이상)`;
        }
      }
    }
  }

  // 패턴 3: 쌍 반복 (AABBCCDD...)
  if (answers.length >= 8) {
    const pairPattern = /(.)\1(.)\2(.)\3(.)\4/.test(answerStr);
    if (pairPattern) {
      return `쌍 반복 패턴 감지: AA BB CC DD...`;
    }
  }

  return null;
}

/**
 * 사용자 친화적 피드백 생성
 */
export function getAnswerDistributionFeedback(result: ValidationResult): string {
  if (result.isValid) {
    return `✅ 정답이 무작위로 분배되었습니다.\n분포: A ${result.percentages.A}% | B ${result.percentages.B}% | C ${result.percentages.C}% | D ${result.percentages.D}%`;
  }

  const feedback = [];

  if (result.issues.length > 0) {
    feedback.push('문제:');
    result.issues.forEach((issue) => feedback.push(`${issue}`));
  }

  if (result.suggestions.length > 0) {
    feedback.push('');
    result.suggestions.forEach((suggestion) => feedback.push(`${suggestion}`));
  }

  feedback.push(`\n현재 분포: A ${result.percentages.A}% | B ${result.percentages.B}% | C ${result.percentages.C}% | D ${result.percentages.D}%`);

  return feedback.join('\n');
}

/**
 * 정답 시퀀스를 무작위로 셔플
 * Fisher-Yates 알고리즘으로 완전 무작위 배열
 */
export function shuffleAnswers(answers: string[]): string[] {
  const shuffled = [...answers];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * 워크플로우: AI가 생성한 정답 → 검증 → 패턴 있으면 셔플
 */
export function validateAndShuffleIfNeeded(aiGeneratedAnswers: string[]): {
  answers: string[];
  wasShuffled: boolean;
  validation: ValidationResult;
} {
  const validation = validateAnswerDistribution(aiGeneratedAnswers);

  if (validation.isValid) {
    return {
      answers: aiGeneratedAnswers,
      wasShuffled: false,
      validation,
    };
  }

  // 패턴이 있으면 셔플
  const shuffled = shuffleAnswers(aiGeneratedAnswers);
  const reValidation = validateAnswerDistribution(shuffled);

  return {
    answers: reValidation.isValid ? shuffled : shuffleAnswers(shuffled), // 재시도
    wasShuffled: true,
    validation: reValidation,
  };
}
