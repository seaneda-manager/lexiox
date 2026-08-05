/**
 * Problem Bank Extraction
 * Full Test의 문제들을 Problem Bank로 저장
 */

import { createClient } from '@supabase/supabase-js';
import type { RReadingTest2026 } from '@/models/reading';
import type { LListeningTest2026Linear } from '@/models/listening';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Topic 추출 헬퍼
function getTopic(item: any): string {
  return item.topic ?? item.title ?? 'Unknown';
}

/**
 * Reading Test에서 Complete Words 추출 및 저장
 */
export async function extractAndSaveCompleteWords(
  test: RReadingTest2026,
  testId: string
) {
  const extracted: Array<{
    topic: string;
    difficulty: string;
    paragraph_html: string;
    blanks: any[];
  }> = [];

  // Module 1 + Module 2 (hard/easy) 모든 item 순회
  const allModules = [
    ...(test.modules ?? []),
    ...(test.stage2Pool?.hard ? [test.stage2Pool.hard] : []),
    ...(test.stage2Pool?.easy ? [test.stage2Pool.easy] : []),
  ];

  for (const module of allModules) {
    for (const item of module.items ?? []) {
      if (item.taskKind === 'complete_words') {
        extracted.push({
          topic: getTopic(item),
          difficulty: item.difficulty ?? 'core',
          paragraph_html: item.paragraphHtml ?? '',
          blanks: item.blanks ?? [],
        });
      }
    }
  }

  if (extracted.length === 0) return [];

  // Supabase에 저장
  const { data, error } = await supabase
    .from('problem_bank_complete_words_2026')
    .insert(
      extracted.map(item => ({
        ...item,
        source_test_id: testId,
      }))
    )
    .select();

  if (error) {
    console.error('Error saving complete words:', error);
    return [];
  }

  console.log(`✅ Saved ${data?.length ?? 0} complete words to problem bank`);
  return data ?? [];
}

/**
 * Reading Test에서 Daily Life 추출 및 저장
 */
export async function extractAndSaveDailyLife(
  test: RReadingTest2026,
  testId: string
) {
  const extracted: Array<{
    topic: string;
    difficulty: string;
    context_type: string;
    content_html: string;
    questions: any[];
  }> = [];

  const allModules = [
    ...(test.modules ?? []),
    ...(test.stage2Pool?.hard ? [test.stage2Pool.hard] : []),
    ...(test.stage2Pool?.easy ? [test.stage2Pool.easy] : []),
  ];

  for (const module of allModules) {
    for (const item of module.items ?? []) {
      if (item.taskKind === 'daily_life') {
        extracted.push({
          topic: getTopic(item),
          difficulty: item.difficulty ?? 'core',
          context_type: item.contextType ?? 'other',
          content_html: item.contentHtml ?? '',
          questions: item.questions ?? [],
        });
      }
    }
  }

  if (extracted.length === 0) return [];

  const { data, error } = await supabase
    .from('problem_bank_daily_life_2026')
    .insert(
      extracted.map(item => ({
        ...item,
        source_test_id: testId,
      }))
    )
    .select();

  if (error) {
    console.error('Error saving daily life:', error);
    return [];
  }

  console.log(`✅ Saved ${data?.length ?? 0} daily life items to problem bank`);
  return data ?? [];
}

/**
 * Reading Test에서 Academic Passage 추출 및 저장
 */
export async function extractAndSaveAcademicPassage(
  test: RReadingTest2026,
  testId: string
) {
  const extracted: Array<{
    topic: string;
    difficulty: string;
    title: string;
    passage_html: string;
    questions: any[];
  }> = [];

  const allModules = [
    ...(test.modules ?? []),
    ...(test.stage2Pool?.hard ? [test.stage2Pool.hard] : []),
    ...(test.stage2Pool?.easy ? [test.stage2Pool.easy] : []),
  ];

  for (const module of allModules) {
    for (const item of module.items ?? []) {
      if (item.taskKind === 'academic_passage') {
        extracted.push({
          topic: (item as any).topic ?? 'Unknown',
          difficulty: item.difficulty ?? 'core',
          title: (item as any).title ?? 'Untitled',
          passage_html: (item as any).passageHtml ?? '',
          questions: item.questions ?? [],
        });
      }
    }
  }

  if (extracted.length === 0) return [];

  const { data, error } = await supabase
    .from('problem_bank_academic_passage_2026')
    .insert(
      extracted.map(item => ({
        ...item,
        source_test_id: testId,
      }))
    )
    .select();

  if (error) {
    console.error('Error saving academic passage:', error);
    return [];
  }

  console.log(`✅ Saved ${data?.length ?? 0} academic passages to problem bank`);
  return data ?? [];
}

/**
 * Reading Test 전체를 Problem Bank로 저장
 */
export async function extractReadingTestToBank(
  test: RReadingTest2026,
  testId: string
) {
  console.log(`[Extract] Processing Reading Test ${testId}...`);

  const results = await Promise.all([
    extractAndSaveCompleteWords(test, testId),
    extractAndSaveDailyLife(test, testId),
    extractAndSaveAcademicPassage(test, testId),
  ]);

  const totalCount = results.reduce((sum, arr) => sum + (arr?.length ?? 0), 0);
  console.log(`[Extract] ✅ Extracted ${totalCount} problems from test ${testId}`);

  return {
    complete_words: results[0]?.length ?? 0,
    daily_life: results[1]?.length ?? 0,
    academic_passage: results[2]?.length ?? 0,
    total: totalCount,
  };
}

/**
 * Listening Test에서 문제 추출 및 저장
 * (Listening은 구조가 다르므로 별도 구현)
 */
export async function extractListeningTestToBank(
  test: LListeningTest2026Linear,
  testId: string
) {
  console.log(`[Extract] Processing Listening Test ${testId}...`);
  // TODO: Listening specific extraction
  // 현재는 구현하지 않음 (Reading 우선)
  console.log(`[Extract] Listening extraction not yet implemented`);
  return { total: 0 };
}

/**
 * 기존 테스트 벌크 마이그레이션
 * (관리자용: 기존 모든 테스트를 Problem Bank로 변환)
 */
export async function migrateAllTestsToBank() {
  console.log(`[Migrate] Starting migration of all Reading tests to Problem Bank...`);

  const { data: tests, error: fetchError } = await supabase
    .from('reading_tests_2026')
    .select('id, payload');

  if (fetchError) {
    console.error('Error fetching tests:', fetchError);
    return null;
  }

  if (!tests || tests.length === 0) {
    console.log('[Migrate] No tests found');
    return null;
  }

  console.log(`[Migrate] Found ${tests.length} tests to migrate`);

  const results = [];
  for (const test of tests) {
    try {
      const result = await extractReadingTestToBank(test.payload, test.id);
      results.push({
        testId: test.id,
        ...result,
      });
    } catch (err) {
      console.error(`Error migrating test ${test.id}:`, err);
    }
  }

  console.log(`[Migrate] ✅ Migration complete`);
  console.log(
    `[Migrate] Total: ${results.reduce((sum, r) => sum + r.total, 0)} problems`
  );

  return results;
}
