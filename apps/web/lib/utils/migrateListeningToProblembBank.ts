/**
 * TOEFL Listening → Problem Bank 마이그레이션
 * 기존 Listening 시험에서 문제를 추출해서 Problem Bank에 저장
 */

import { createClient } from '@supabase/supabase-js';
import type { LListeningTest2026, LBaseItem, LQuestion2026 } from '@/models/listening';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface ListeningResponseProblem {
  topic: string;
  difficulty: 'easy' | 'core' | 'hard';
  audio_url: string;
  question: {
    id: string;
    stem: string;
    choices: Array<{ id: string; text: string; correct?: boolean }>;
    correct: 'a' | 'b' | 'c' | 'd';
  };
  transcript?: string;
  source_test_id?: string;
}

interface ListeningTrackProblem {
  topic: string;
  difficulty: 'easy' | 'core' | 'hard';
  track_type: 'conversation' | 'announcement' | 'lecture';
  audio_url: string;
  transcript?: string;
  questions: Array<{
    id: string;
    number: number;
    stem: string;
    choices: Array<{ id: string; text: string; correct?: boolean }>;
    correct: 'a' | 'b' | 'c' | 'd';
  }>;
  source_test_id?: string;
}

/**
 * 선택지에서 정답 여부 확인 (한글/영문 필드 모두 지원)
 */
function isChoiceCorrect(choice: any): boolean {
  return choice.correct === true || choice.isCorrect === true || choice.is_correct === true;
}

/**
 * 선택지 배열에서 정답의 문자(A/B/C/D) 찾기
 */
function findCorrectAnswer(choices: any[]): 'a' | 'b' | 'c' | 'd' {
  const idx = choices.findIndex(c => isChoiceCorrect(c));
  return (idx >= 0 && idx < 4) ? String.fromCharCode(97 + idx) : 'a'; // 97 = 'a'
}

/**
 * TOEFL Listening 시험에서 모든 문제 추출 및 Problem Bank에 저장
 */
export async function migrateListeningTestToProblembBank(
  testId: string,
  topic?: string
): Promise<{ responseCount: number; trackCount: number; errors: string[] }> {
  const errors: string[] = [];
  let responseCount = 0;
  let trackCount = 0;

  try {
    // 1. TOEFL Listening 시험 조회
    const { data: testData, error: fetchError } = await supabase
      .from('listening_tests_2026')
      .select('id, label, payload')
      .eq('id', testId)
      .single();

    if (fetchError || !testData) {
      errors.push(`Failed to fetch test ${testId}: ${fetchError?.message}`);
      return { responseCount, trackCount, errors };
    }

    const test = testData.payload as LListeningTest2026;
    if (!test?.modules) {
      errors.push('Invalid test structure: no modules found');
      return { responseCount, trackCount, errors };
    }

    const baseTopic = topic || testData.label || 'Unknown';
    const difficulty = (test.meta?.id?.includes('hard') ? 'hard' : test.meta?.id?.includes('easy') ? 'easy' : 'core') as 'easy' | 'core' | 'hard';

    // 2. 모든 모듈의 아이템 수집
    for (const module of test.modules) {
      if (!module?.items) continue;

      for (const item of module.items) {
        try {
          // Response (1문항/세트) vs Track (4문항/세트)
          if (item.taskKind === 'choose_best_response') {
            // Listen-Response: 1문항만
            if (item.questions && item.questions.length > 0) {
              const q = item.questions[0] as LQuestion2026;
              const responseProblem: ListeningResponseProblem = {
                topic: baseTopic,
                difficulty,
                audio_url: item.audioUrl,
                question: {
                  id: q.id,
                  stem: q.stem || '',
                  choices: (q.choices || []).map((c: any) => ({
                    id: c.id,
                    text: c.text,
                    correct: isChoiceCorrect(c),
                  })),
                  correct: findCorrectAnswer(q.choices || []),
                },
                transcript: item.transcript,
                source_test_id: testId,
              };

              const { error: insertError } = await supabase
                .from('problem_bank_listening_response_2026')
                .insert({
                  topic: responseProblem.topic,
                  difficulty: responseProblem.difficulty,
                  audio_url: responseProblem.audio_url,
                  question: responseProblem.question,
                  transcript: responseProblem.transcript,
                  source_test_id: responseProblem.source_test_id,
                });

              if (insertError) {
                errors.push(`Failed to insert response problem: ${insertError.message}`);
              } else {
                responseCount++;
              }
            }
          } else {
            // Track (Conversation/Announcement/Lecture): 여러 문항
            const trackType = item.taskKind === 'conversation' ? 'conversation'
                            : item.taskKind === 'announcement' ? 'announcement'
                            : 'lecture';

            if (item.questions && item.questions.length > 0) {
              const trackProblem: ListeningTrackProblem = {
                topic: baseTopic,
                difficulty,
                track_type: trackType,
                audio_url: item.audioUrl,
                transcript: item.transcript,
                questions: (item.questions as LQuestion2026[]).map(q => ({
                  id: q.id,
                  number: q.number,
                  stem: q.stem || '',
                  choices: (q.choices || []).map((c: any) => ({
                    id: c.id,
                    text: c.text,
                    correct: isChoiceCorrect(c),
                  })),
                  correct: findCorrectAnswer(q.choices || []),
                })),
                source_test_id: testId,
              };

              const { error: insertError } = await supabase
                .from('problem_bank_listening_track_2026')
                .insert({
                  topic: trackProblem.topic,
                  difficulty: trackProblem.difficulty,
                  track_type: trackProblem.track_type,
                  audio_url: trackProblem.audio_url,
                  transcript: trackProblem.transcript,
                  questions: trackProblem.questions,
                  source_test_id: trackProblem.source_test_id,
                });

              if (insertError) {
                errors.push(`Failed to insert track problem: ${insertError.message}`);
              } else {
                trackCount++;
              }
            }
          }
        } catch (itemError) {
          errors.push(`Error processing item: ${itemError instanceof Error ? itemError.message : 'Unknown error'}`);
        }
      }
    }

    console.log(`[MigrateListening] Migration complete: ${responseCount} responses, ${trackCount} tracks`);
  } catch (err) {
    errors.push(`Migration failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  return { responseCount, trackCount, errors };
}

/**
 * 모든 TOEFL Listening 시험 마이그레이션
 */
export async function migrateAllListeningTests(): Promise<{
  totalResponseProblems: number;
  totalTrackProblems: number;
  allErrors: string[];
}> {
  let totalResponseProblems = 0;
  let totalTrackProblems = 0;
  const allErrors: string[] = [];

  try {
    // 모든 Listening 시험 조회
    const { data: tests, error: fetchError } = await supabase
      .from('listening_tests_2026')
      .select('id, label')
      .order('created_at', { ascending: false });

    if (fetchError || !tests) {
      allErrors.push(`Failed to fetch all tests: ${fetchError?.message}`);
      return { totalResponseProblems, totalTrackProblems, allErrors };
    }

    console.log(`[MigrateAllListening] Found ${tests.length} tests to migrate`);

    // 각 시험별로 마이그레이션
    for (const test of tests) {
      console.log(`[MigrateAllListening] Migrating test: ${test.label}`);
      const result = await migrateListeningTestToProblembBank(test.id, test.label);
      totalResponseProblems += result.responseCount;
      totalTrackProblems += result.trackCount;
      allErrors.push(...result.errors);
    }

    console.log(`[MigrateAllListening] Complete: ${totalResponseProblems} responses, ${totalTrackProblems} tracks`);
  } catch (err) {
    allErrors.push(`Batch migration failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  return { totalResponseProblems, totalTrackProblems, allErrors };
}
