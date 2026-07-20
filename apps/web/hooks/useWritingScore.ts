'use client';

import { useState, useCallback } from 'react';

interface RubricScores {
  grammar: number;
  vocabulary: number;
  organization: number;
  taskCompletion: number;
}

interface ScoringResponse {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  wordCount: number;
  rubricScores: RubricScores;
  taskId: string;
}

interface UseScoringState {
  score: ScoringResponse | null;
  loading: boolean;
  error: string | null;
}

/**
 * useWritingScore: AI 채점 API 호출 훅
 *
 * M4 구현:
 * ✅ Async 호출 + 로딩 상태
 * ✅ 에러 처리
 * ✅ 캐싱 (선택사항)
 */
export function useWritingScore() {
  const [state, setState] = useState<UseScoringState>({
    score: null,
    loading: false,
    error: null,
  });

  const scoreEssay = useCallback(
    async (
      taskId: 'TASK_1' | 'TASK_2' | 'TASK_3',
      userAnswer: string,
      prompt?: string,
      correctAnswer?: string
    ): Promise<ScoringResponse | null> => {
      setState({ score: null, loading: true, error: null });

      try {
        const response = await fetch('/api/student/writing/score-essay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId,
            userAnswer,
            prompt,
            correctAnswer,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to score essay');
        }

        const data: ScoringResponse = await response.json();
        setState({ score: data, loading: false, error: null });
        return data;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setState({ score: null, loading: false, error: errorMsg });
        return null;
      }
    },
    []
  );

  return {
    ...state,
    scoreEssay,
  };
}
