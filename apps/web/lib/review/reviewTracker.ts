/**
 * Review Attempt Tracker
 * 모든 리뷰 단계에서 사용 가능한 공통 함수
 */

export type ReviewStage =
  | 'explanation_read'      // 설명 읽기 (모든 섹션)
  | 're_do'                 // 다시 풀기 (W/S)
  | 'reason_writing'        // 오답 이유 작성 (W)
  | 'correction'            // 첨삭 보고 고쳐쓰기 (W)
  | 'final_revision'        // 안보고 다시쓰기 (W)
  | 'listen_repeat'         // 다시 듣고 따라하기 (S)
  | 'suggested_template'    // Suggested Template 적용 (S)
  | 'suggested_answer';     // Suggested Answer 말하기 (S)

export interface GrammarError {
  type: string;           // e.g., 'tense', 'subject_verb_agreement', 'article'
  position?: string;      // e.g., '10-15' (character positions)
  count: number;
  examples?: string[];    // 구체적 사례
}

export interface PronunciationError {
  sound: string;          // e.g., 'th', 'r_vs_l'
  count: number;
  examples?: string[];
}

export interface ReviewAttempt {
  attemptNum: number;
  stage: ReviewStage;
  timestamp: string;      // ISO string
  completed: boolean;
  durationSeconds?: number;

  // Grammar errors (Writing/Speaking)
  grammarErrors?: GrammarError[];

  // Pronunciation errors (Speaking only)
  pronunciationErrors?: PronunciationError[];

  // Expression/content errors (Speaking only)
  expressionErrors?: GrammarError[];

  // Metadata
  notes?: string;
  metadata?: Record<string, any>;
}

/**
 * 새로운 리뷰 시도 추가
 */
export function createReviewAttempt(
  currentAttempts: ReviewAttempt[],
  stage: ReviewStage,
  errors?: {
    grammarErrors?: GrammarError[];
    pronunciationErrors?: PronunciationError[];
    expressionErrors?: GrammarError[];
  }
): ReviewAttempt[] {
  const attemptNum = currentAttempts.length + 1;

  const newAttempt: ReviewAttempt = {
    attemptNum,
    stage,
    timestamp: new Date().toISOString(),
    completed: true,
    grammarErrors: errors?.grammarErrors,
    pronunciationErrors: errors?.pronunciationErrors,
    expressionErrors: errors?.expressionErrors,
  };

  return [...currentAttempts, newAttempt];
}

/**
 * 현재 attempt와 이전 attempt의 오류 변화 분석
 */
export function analyzeErrorProgress(
  currentAttempt: ReviewAttempt,
  previousAttempt?: ReviewAttempt
): {
  improvementPoints: string[];
  concernPoints: string[];
} {
  const improvementPoints: string[] = [];
  const concernPoints: string[] = [];

  if (!previousAttempt) {
    return { improvementPoints, concernPoints };
  }

  // Grammar error comparison
  if (currentAttempt.grammarErrors && previousAttempt.grammarErrors) {
    const prevGrammarMap = new Map(
      previousAttempt.grammarErrors.map(e => [e.type, e.count])
    );

    currentAttempt.grammarErrors.forEach(err => {
      const prevCount = prevGrammarMap.get(err.type) ?? 0;

      if (err.count === 0 && prevCount > 0) {
        improvementPoints.push(`✅ ${err.type} 오류 완전 해소됨 (${prevCount}회 → 0회)`);
      } else if (err.count < prevCount) {
        improvementPoints.push(`📈 ${err.type} 오류 감소 (${prevCount}회 → ${err.count}회)`);
      } else if (err.count > prevCount) {
        concernPoints.push(`⚠️ ${err.type} 오류 증가 (${prevCount}회 → ${err.count}회)`);
      }
    });
  }

  // Pronunciation error comparison
  if (currentAttempt.pronunciationErrors && previousAttempt.pronunciationErrors) {
    const prevPronunMap = new Map(
      previousAttempt.pronunciationErrors.map(e => [e.sound, e.count])
    );

    currentAttempt.pronunciationErrors.forEach(err => {
      const prevCount = prevPronunMap.get(err.sound) ?? 0;

      if (err.count === 0 && prevCount > 0) {
        improvementPoints.push(`✅ /${err.sound}/ 발음 완전 개선됨 (${prevCount}회 → 0회)`);
      } else if (err.count < prevCount) {
        improvementPoints.push(`📈 /${err.sound}/ 발음 개선 (${prevCount}회 → ${err.count}회)`);
      } else if (err.count > prevCount) {
        concernPoints.push(`⚠️ /${err.sound}/ 발음 악화 (${prevCount}회 → ${err.count}회)`);
      }
    });
  }

  return { improvementPoints, concernPoints };
}

/**
 * 같은 오류의 반복 감지
 */
export function detectRepeatedErrors(attempts: ReviewAttempt[]): {
  repeatedGrammar: Array<{ type: string; count: number }>;
  repeatedPronunciation: Array<{ sound: string; count: number }>;
} {
  const grammarMap = new Map<string, number>();
  const pronunciationMap = new Map<string, number>();

  attempts.forEach(attempt => {
    attempt.grammarErrors?.forEach(err => {
      if (err.count > 0) {
        grammarMap.set(err.type, (grammarMap.get(err.type) ?? 0) + 1);
      }
    });

    attempt.pronunciationErrors?.forEach(err => {
      if (err.count > 0) {
        pronunciationMap.set(err.sound, (pronunciationMap.get(err.sound) ?? 0) + 1);
      }
    });
  });

  return {
    repeatedGrammar: Array.from(grammarMap.entries())
      .filter(([_, appearCount]) => appearCount >= 2)
      .map(([type, appearCount]) => ({ type, count: appearCount })),
    repeatedPronunciation: Array.from(pronunciationMap.entries())
      .filter(([_, appearCount]) => appearCount >= 2)
      .map(([sound, appearCount]) => ({ sound, count: appearCount })),
  };
}
