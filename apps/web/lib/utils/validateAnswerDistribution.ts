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

function correctIndexOf(choices: any[]): number {
  const idx = choices.map((c, i) => (c && (c.correct === true || c.isCorrect === true) ? i : -1)).filter((i) => i >= 0);
  return idx.length === 1 ? idx[0] : -1; // 정답이 정확히 1개인 문제만 다룬다
}

/**
 * 정답 위치 균형 배정 (2026-11-14).
 *
 * 문제마다 보기를 독립적으로 섞는(shuffleChoices) 것만으로는 문항 수가 적을 때 우연히 한쪽에 몰릴 수 있다
 * (실제로 Listening 테스트에서 B/C 에 몰린 사례가 있었다). 그래서 한 번에 처리하는 문항 묶음 안에서
 * 정답 위치 A/B/C/D 가 최대한 고르게(개수 차이 1 이내) 나오고, 같은 위치가 3번 연속 나오지 않도록
 * 목표 위치를 미리 정한 뒤 정답 보기를 그 자리로 옮긴다. 정답 텍스트와 정답 표시는 그대로고 위치만 바뀐다.
 */
export function makeBalancedTargets(n: number, k = 4): number[] {
  const targets: number[] = [];
  const base = Math.floor(n / k);
  for (let i = 0; i < k; i++) for (let j = 0; j < base; j++) targets.push(i);
  const extra = Array.from({ length: k }, (_, i) => i);
  for (let i = extra.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [extra[i], extra[j]] = [extra[j], extra[i]];
  }
  for (let i = 0; i < n - base * k; i++) targets.push(extra[i]);

  const shuffle = () => {
    for (let i = targets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [targets[i], targets[j]] = [targets[j], targets[i]];
    }
  };
  const hasRun = () => targets.some((t, i) => i >= 2 && targets[i - 1] === t && targets[i - 2] === t);
  shuffle();
  for (let tries = 0; tries < 300 && hasRun(); tries++) shuffle();
  return targets;
}

/** 문제 목록의 정답 위치를 균형 있게 재배정한다. 보기 id 는 위치 순서(c1..c4)를 그대로 유지한다. */
export function balanceCorrectPositions(questions: any[]): void {
  const usable = questions.filter((q) => Array.isArray(q?.choices) && q.choices.length >= 2 && correctIndexOf(q.choices) >= 0);
  if (usable.length < 2) return;
  const targets = makeBalancedTargets(usable.length, Math.min(4, Math.max(...usable.map((q) => q.choices.length))));
  usable.forEach((q, n) => {
    const ids = q.choices.map((c: any) => c.id);
    const ci = correctIndexOf(q.choices);
    const t = Math.min(targets[n], q.choices.length - 1);
    if (ci !== t) {
      const next = [...q.choices];
      [next[ci], next[t]] = [next[t], next[ci]];
      q.choices = next.map((c: any, i: number) => ({ ...c, id: ids[i] }));
    }
  });
}

/** payload(중첩 객체 또는 items 배열) 안의 모든 문제의 choices를 섞고, 정답 위치를 균형 있게 배정한다. */
export function shuffleAllChoicesInPayload(payload: unknown): void {
  const collected: any[] = [];
  function walk(obj: any): void {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj.questions)) {
      obj.questions.forEach((q: any) => {
        if (Array.isArray(q.choices)) q.choices = shuffleChoices(q.choices);
        collected.push(q);
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
  balanceCorrectPositions(collected);
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

/**
 * payload(모듈1/모듈2 pool/items 배열) 안 모든 문항의 "정답 위치"(A/B/C/D)를 순서대로 수집한다.
 * 선택지 id 숫자(c1..c4)가 아니라 배열 위치로 계산하므로 id가 "A"~"D"(Reading)든 "c1"~"c4"(Listening)든 동일하게 동작한다.
 * isCorrect(Reading) / correct(Listening) 어느 쪽이든 인식한다. 정답 표시가 없는 문항은 건너뛴다.
 */
export function collectCorrectLetters(payload: unknown): string[] {
  const letters: string[] = [];
  function walk(obj: any): void {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      obj.forEach(walk);
      return;
    }
    if (Array.isArray(obj.questions)) {
      obj.questions.forEach((q: any) => {
        if (!Array.isArray(q?.choices)) return;
        const idx = q.choices.findIndex((c: any) => c?.isCorrect === true || c?.correct === true);
        if (idx >= 0 && idx < 4) letters.push("ABCD"[idx]);
      });
    }
    if (Array.isArray(obj.items)) obj.items.forEach(walk);
    if (Array.isArray(obj.modules)) obj.modules.forEach(walk);
    if (obj.stage2Pool) {
      walk(obj.stage2Pool.hard);
      walk(obj.stage2Pool.easy);
    }
  }
  walk(payload);
  return letters;
}

/**
 * 관리자 편집 화면의 "셔플" 버튼용. 선택지 글자만 재배정하면 정답 표시가 엉뚱한 보기로 옮겨가
 * 정답이 틀어진다(예전 버그). 반드시 보기 텍스트와 정답 표시를 함께 옮기는 shuffleAllChoicesInPayload를 쓴다.
 * 반환: 셔플 전/후 정답 위치 분포 요약.
 */
export function shuffleChoicesAndSummarize(payload: unknown): { before: AnswerDistribution; after: AnswerDistribution } {
  const count = (arr: string[]): AnswerDistribution => ({
    A: arr.filter((x) => x === "A").length,
    B: arr.filter((x) => x === "B").length,
    C: arr.filter((x) => x === "C").length,
    D: arr.filter((x) => x === "D").length,
  });
  const before = count(collectCorrectLetters(payload));
  shuffleAllChoicesInPayload(payload);
  const after = count(collectCorrectLetters(payload));
  return { before, after };
}
