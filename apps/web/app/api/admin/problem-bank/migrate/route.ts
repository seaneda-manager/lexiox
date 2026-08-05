import { NextResponse } from 'next/server';
import { migrateAllTestsToBank } from '@/lib/utils/problemBankExtract';

export const runtime = 'nodejs';
export const maxDuration = 600; // 10분 (많은 테스트 처리용)

/**
 * POST /api/admin/problem-bank/migrate
 *
 * 기존 모든 Reading Test를 Problem Bank로 마이그레이션
 * (한번만 실행하면 됨 - 이후로는 새 테스트 생성/수정시 자동 저장)
 *
 * Admin only
 */
export async function POST(req: Request) {
  try {
    console.log('[Migrate] Starting migration...');

    const result = await migrateAllTestsToBank();

    if (!result) {
      return NextResponse.json({
        ok: false,
        error: 'No tests found or migration failed',
      });
    }

    // 통계
    const totalProblems = result.reduce((sum, r) => sum + r.total, 0);
    const completedTests = result.filter(r => r.total > 0).length;

    return NextResponse.json({
      ok: true,
      summary: {
        total_tests_processed: result.length,
        tests_with_problems: completedTests,
        total_problems_extracted: totalProblems,
        by_type: {
          complete_words: result.reduce((sum, r) => sum + r.complete_words, 0),
          daily_life: result.reduce((sum, r) => sum + r.daily_life, 0),
          academic_passage: result.reduce((sum, r) => sum + r.academic_passage, 0),
        },
      },
      details: result,
    });
  } catch (err: any) {
    console.error('[Migrate] ERROR', err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}
