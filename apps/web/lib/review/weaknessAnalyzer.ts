/**
 * 학생의 약점을 분석하고 LXGym 게임을 추천하는 시스템
 */

import { ReviewAttempt } from './reviewTracker';

export interface Weakness {
  type: 'grammar' | 'pronunciation' | 'expression' | 'vocabulary';
  skill: string; // e.g., 'tense', 'th_sound', 'word_choice'
  count: number;
  severity: 'low' | 'medium' | 'high'; // based on frequency
}

export interface LXGymRecommendation {
  gameId: string;
  gameName: string;
  category: string;
  targetSkill: string;
  description: string;
  difficulty: 'easy' | 'normal' | 'hard';
  estimatedMinutes: number;
}

// 약점 → 게임 매핑
const WEAKNESS_TO_GAME_MAP: Record<string, LXGymRecommendation[]> = {
  // Grammar weaknesses
  'grammar:tense': [
    {
      gameId: 'grammar-tense-drill-1',
      gameName: 'Tense Master',
      category: 'Grammar',
      targetSkill: '시제 일치',
      description: '다양한 상황에서 정확한 시제를 선택하는 드릴',
      difficulty: 'normal',
      estimatedMinutes: 10,
    },
    {
      gameId: 'grammar-tense-drill-2',
      gameName: '시제 퀘스트',
      category: 'Grammar',
      targetSkill: '시제 일치',
      description: '스토리 기반의 시제 연습',
      difficulty: 'easy',
      estimatedMinutes: 15,
    },
  ],
  'grammar:subject_verb_agreement': [
    {
      gameId: 'grammar-agreement-1',
      gameName: 'Agreement Challenge',
      category: 'Grammar',
      targetSkill: '주어-동사 일치',
      description: '복잡한 주어 구조에서의 동사 일치 연습',
      difficulty: 'normal',
      estimatedMinutes: 12,
    },
  ],
  'grammar:article': [
    {
      gameId: 'grammar-article-1',
      gameName: 'A/The Puzzle',
      category: 'Grammar',
      targetSkill: '관사 사용',
      description: '관사 선택의 규칙을 배우고 적용하기',
      difficulty: 'easy',
      estimatedMinutes: 10,
    },
  ],
  'grammar:preposition': [
    {
      gameId: 'grammar-prep-1',
      gameName: 'Preposition Navigator',
      category: 'Grammar',
      targetSkill: '전치사 선택',
      description: '상황에 맞는 전치사 선택하기',
      difficulty: 'normal',
      estimatedMinutes: 12,
    },
  ],

  // Pronunciation weaknesses
  'pronunciation:th_sound': [
    {
      gameId: 'pronunciation-th-1',
      gameName: 'TH Sound Master',
      category: 'Pronunciation',
      targetSkill: '/θ/ 발음',
      description: 'TH 음소 정확한 발음 연습',
      difficulty: 'easy',
      estimatedMinutes: 8,
    },
  ],
  'pronunciation:r_vs_l': [
    {
      gameId: 'pronunciation-r-l-1',
      gameName: 'R vs L Challenge',
      category: 'Pronunciation',
      targetSkill: '/r/ vs /l/ 구분',
      description: 'R과 L 음소 구분 및 발음 연습',
      difficulty: 'normal',
      estimatedMinutes: 10,
    },
  ],
  'pronunciation:stress': [
    {
      gameId: 'pronunciation-stress-1',
      gameName: 'Stress Pattern Game',
      category: 'Pronunciation',
      targetSkill: '단어 강세',
      description: '단어 강세 위치 인식 및 발음',
      difficulty: 'easy',
      estimatedMinutes: 10,
    },
  ],

  // Expression weaknesses
  'expression:word_choice': [
    {
      gameId: 'vocabulary-archery-1',
      gameName: 'Vocabulary Archery',
      category: 'Vocabulary',
      targetSkill: '정확한 어휘 선택',
      description: '상황에 맞는 정확한 단어 선택하기',
      difficulty: 'normal',
      estimatedMinutes: 15,
    },
  ],
  'expression:formality': [
    {
      gameId: 'expression-formality-1',
      gameName: 'Register Matcher',
      category: 'Expression',
      targetSkill: '존댓말/반말 구분',
      description: '상황에 따른 올바른 표현 선택',
      difficulty: 'normal',
      estimatedMinutes: 12,
    },
  ],
};

/**
 * 리뷰 데이터에서 약점 추출
 */
export function analyzeWeaknesses(attempts: ReviewAttempt[]): Weakness[] {
  const weaknessMap = new Map<string, number>();

  attempts.forEach((attempt) => {
    // Grammar errors
    attempt.grammarErrors?.forEach((err) => {
      if (err.count > 0) {
        const key = `grammar:${err.type}`;
        weaknessMap.set(key, (weaknessMap.get(key) ?? 0) + err.count);
      }
    });

    // Pronunciation errors
    attempt.pronunciationErrors?.forEach((err) => {
      if (err.count > 0) {
        const key = `pronunciation:${err.sound}`;
        weaknessMap.set(key, (weaknessMap.get(key) ?? 0) + err.count);
      }
    });

    // Expression errors
    attempt.expressionErrors?.forEach((err) => {
      if (err.count > 0) {
        const key = `expression:${err.type}`;
        weaknessMap.set(key, (weaknessMap.get(key) ?? 0) + err.count);
      }
    });
  });

  // Convert to Weakness array with severity
  const weaknesses: Weakness[] = Array.from(weaknessMap.entries()).map(
    ([key, count]) => {
      const [type, skill] = key.split(':') as [
        'grammar' | 'pronunciation' | 'expression' | 'vocabulary',
        string,
      ];

      // Severity 판단 (시도 횟수 기반)
      let severity: 'low' | 'medium' | 'high';
      if (count >= 5) severity = 'high';
      else if (count >= 3) severity = 'medium';
      else severity = 'low';

      return {
        type,
        skill,
        count,
        severity,
      };
    }
  );

  // 심각도 순서로 정렬
  return weaknesses.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * 약점 기반 LXGym 게임 추천
 */
export function recommendGames(
  weaknesses: Weakness[]
): LXGymRecommendation[] {
  const recommendations = new Map<string, LXGymRecommendation>();

  // High severity 약점부터 추천
  weaknesses
    .filter((w) => w.severity === 'high' || w.severity === 'medium')
    .slice(0, 5) // 최대 5개만 추천
    .forEach((weakness) => {
      const key = `${weakness.type}:${weakness.skill}`;
      const games = WEAKNESS_TO_GAME_MAP[key] || [];

      if (games.length > 0) {
        // 첫 번째 게임만 추천 (가장 효과적인 것)
        recommendations.set(key, games[0]);
      }
    });

  return Array.from(recommendations.values());
}

/**
 * 약점 요약 (한 줄 피드백)
 */
export function generateWeaknessInsight(weaknesses: Weakness[]): string {
  if (weaknesses.length === 0) {
    return '축하합니다! 주요 약점이 없습니다. 계속 학습을 진행하세요.';
  }

  const topWeakness = weaknesses[0];
  const typeLabel =
    {
      grammar: '문법',
      pronunciation: '발음',
      expression: '표현',
      vocabulary: '어휘',
    }[topWeakness.type] || '오류';

  return `주의 필요: ${typeLabel} 약점 "${topWeakness.skill}"이(가) ${topWeakness.count}회 반복되고 있습니다. LXGym 게임으로 집중 연습하세요.`;
}
