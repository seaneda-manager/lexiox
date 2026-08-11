export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { migrateListeningTestToProblembBank, migrateAllListeningTests } from '@/lib/utils/migrateListeningToProblembBank';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5분

/**
 * POST /api/admin/problem-bank/migrate-listening
 *
 * TOEFL Listening 시험을 Problem Bank로 마이그레이션
 *
 * Request (특정 시험):
 * {
 *   "testId": "uuid",
 *   "topic": "Optional topic name"
 * }
 *
 * Request (모든 시험):
 * {
 *   "migrateAll": true
 * }
 *
 * Response:
 * {
 *   "ok": true,
 *   "responseProblems": 5,
 *   "trackProblems": 2,
 *   "errors": []
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { testId, topic, migrateAll } = body as {
      testId?: string;
      topic?: string;
      migrateAll?: boolean;
    };

    if (!testId && !migrateAll) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Either testId or migrateAll must be provided',
        },
        { status: 400 }
      );
    }

    console.log('[MigrateListening] Starting migration...');

    let result;
    if (migrateAll) {
      console.log('[MigrateListening] Migrating all tests...');
      result = await migrateAllListeningTests();
      return NextResponse.json({
        ok: true,
        responseProblems: result.totalResponseProblems,
        trackProblems: result.totalTrackProblems,
        errors: result.allErrors,
      });
    } else {
      console.log(`[MigrateListening] Migrating test: ${testId}`);
      result = await migrateListeningTestToProblembBank(testId!, topic);
      return NextResponse.json({
        ok: true,
        responseProblems: result.responseCount,
        trackProblems: result.trackCount,
        errors: result.errors,
      });
    }
  } catch (err: any) {
    console.error('[MigrateListening] ERROR', err);
    return NextResponse.json(
      {
        ok: false,
        error: err.message || 'Migration failed',
      },
      { status: 500 }
    );
  }
}
