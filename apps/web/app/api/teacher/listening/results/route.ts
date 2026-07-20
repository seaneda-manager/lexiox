import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const testId = searchParams.get('testId');

    const sb = getServiceSupabase();

    // Get test details
    const { data: testData, error: testError } = await sb
      .from('listening_tests_2026')
      .select('id, label, payload')
      .eq('id', testId)
      .maybeSingle();

    if (testError || !testData) {
      return NextResponse.json(
        { ok: false, error: 'Test not found' },
        { status: 404 }
      );
    }

    // Get all results for this test
    const { data: results, error: resultsError } = await sb
      .from('listening_results')
      .select(`
        id,
        student_id,
        module1_correct_count,
        module1_total,
        module1_correct_rate,
        module2_mode,
        module2_correct_count,
        module2_total,
        combined_correct,
        combined_total,
        final_score_band,
        final_cefr,
        created_at,
        student:student_id(email, user_metadata)
      `)
      .eq('test_id', testId)
      .order('created_at', { ascending: false });

    if (resultsError) throw resultsError;

    // Calculate statistics
    const totalStudents = results?.length || 0;
    const avgBand = results && results.length > 0
      ? (results.reduce((sum, r) => sum + (r.final_score_band || 0), 0) / results.length).toFixed(1)
      : 0;
    const avgCorrectRate = results && results.length > 0
      ? (results.reduce((sum, r) => sum + ((r.combined_correct / r.combined_total) * 100), 0) / results.length).toFixed(1)
      : 0;

    return NextResponse.json({
      ok: true,
      test: testData,
      stats: {
        totalStudents,
        avgBand,
        avgCorrectRate,
      },
      results: results || [],
    });
  } catch (err: any) {
    console.error('Error fetching results:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
