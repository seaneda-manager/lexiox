import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { randomUUID } from 'crypto';

type ResultPayload = {
  testId: string;
  module1: {
    answers: Record<string, number>;
    correctCount: number;
    totalQuestions: number;
    correctRate: number;
  };
  module2: {
    answers: Record<string, number>;
    correctCount: number;
    totalQuestions: number;
    mode: 'hard' | 'easy';
  };
  combinedCorrect: number;
  combinedTotal: number;
};

function calculateScore(correctRate: number): { band: number; cefr: string } {
  // correctRate: 0-100
  const band = Math.min(6, Math.max(1, Math.round((correctRate / 100) * 6 * 2) / 2));
  const cefr =
    band >= 5 ? 'C1' :
    band >= 4.5 ? 'B2' :
    band >= 3.5 ? 'B1' :
    band >= 2.5 ? 'A2' :
    'A1';

  return { band, cefr };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ResultPayload & { studentId?: string };
    const { testId, module1, module2, combinedCorrect, combinedTotal } = body;

    if (!testId || !module1 || !module2 || combinedTotal === undefined) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const sb = getServiceSupabase();

    // Get current user
    const { data: { user }, error: authError } = await sb.auth.admin.getUserById(body.studentId || '');
    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const correctRate = (combinedCorrect / combinedTotal) * 100;
    const { band, cefr } = calculateScore(correctRate);

    // Insert result into database
    const { data, error } = await sb.from('listening_results').insert({
      id: randomUUID(),
      student_id: user.id,
      test_id: testId,
      module1_answers: module1.answers,
      module1_correct_count: module1.correctCount,
      module1_total: module1.totalQuestions,
      module1_correct_rate: module1.correctRate,
      module2_mode: module2.mode,
      module2_answers: module2.answers,
      module2_correct_count: module2.correctCount,
      module2_total: module2.totalQuestions,
      combined_correct: combinedCorrect,
      combined_total: combinedTotal,
      final_score_band: band,
      final_cefr: cefr,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Database insert error:', error);
      throw error;
    }

    return NextResponse.json({
      ok: true,
      result: {
        id: data?.[0]?.id,
        band,
        cefr,
        correctRate: correctRate.toFixed(1),
      },
    });
  } catch (err: any) {
    console.error('Error submitting result:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
