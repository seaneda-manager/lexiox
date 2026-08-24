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
 * Choice ID에서 선택지 글자(A/B/C/D) 추출
 * 예: 'c1' → 'A', 'c2' → 'B', 'c3' → 'C', 'c4' → 'D'
 */
export function extractChoiceLetter(choiceId: string): string {
  const match = choiceId.match(/(\d+)/);
  if (!match) return 'A';
  const num = parseInt(match[1], 10);
  return String.fromCharCode(64 + num); // 1→A, 2→B, 3→C, 4→D
}

/**
 * 정답 분포 쏠림의 진짜 원인과 고친 이유 (2026-08-24):
 *
 * validateAndShuffleIfNeeded()는 AAAA나 ABCDABCD 같은 "구조적 패턴"만 잡는다.
 * "그냥 전체적으로 B/C가 많고 A/D가 적은" 통계적 쏠림(LLM이 객관식 정답을 만들 때
 * 중간 선택지를 더 선호하는 경향)은 패턴이 아니라서 안 잡히고 그대로 통과된다.
 *
 * 게다가 설령 패턴이 잡혀서 shuffleAnswers()가 돌아가도, 그건 "이미 생성된 정답 글자들의
 * 묶음"에서 어느 문제가 어느 글자를 갖는지만 재배열하는 것이다 — 즉 원래 분포가
 * {A:2, B:9, C:8, D:1}이었다면 순서를 아무리 섞어도 총합 2/9/8/1은 그대로라 쏠림이
 * 절대 안 고쳐진다.
 *
 * 진짜 해법: 패턴 감지에 기대지 말고, 매 문제마다 4개 보기(choices) 배열 자체를
 * 무조건 무작위로 섞는다 — 정답 텍스트와 isCorrect를 같이 옮기므로 정답 내용은
 * 그대로 유지되면서 어느 자리(A/B/C/D)에 놓이는지만 매 문제 독립적으로 랜덤해진다.
 * 문제 수가 많아지면 자연스럽게 각 글자가 대략 25%씩 나오게 된다.
 */
export function shuffleChoices<T extends { id: string; text: string; isCorrect?: boolean }>(choices: T[]): T[] {
  if (!Array.isArray(choices) || choices.length === 0) return choices;
  const ids = choices.map((c) => c.id);
  const shuffled = [...choices];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // id는 원래 자리 순서(A,B,C,D 등)를 그대로 유지 — 텍스트+정답여부만 자리를 옮긴다.
  return shuffled.map((c, i) => ({ ...c, id: ids[i] }));
}

/** payload(중첩 객체 또는 items 배열) 안의 모든 문제의 choices를 전부 무작위로 섞는다. */
export function shuffleAllChoicesInPayload(payload: unknown): void {
  function walk(obj: any): void {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj.questions)) {
      obj.questions.forEach((q: any) => {
        if (Array.isArray(q.choices)) q.choices = shuffleChoices(q.choices);
      });
    }
    if (Array.isArray(obj.items)) obj.items.forEach(walk);
    if (Array.isArray(obj.modules)) obj.modules.forEach(walk);
    if (obj.stage2Pool) {
      if (obj.stage2Pool.hard) walk(obj.stage2Pool.hard);
      if (obj.stage2Pool.easy) walk(obj.stage2Pool.easy);
    }
  }

  if (Array.isArray(payload)) {
    payload.forEach(walk);
  } else {
    walk(payload);
  }
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
