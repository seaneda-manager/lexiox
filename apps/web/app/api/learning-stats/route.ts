import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const supabase = await getServerSupabase();

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Reading 통계
    const { data: readingResults } = await supabase
      .from('reading_results_2026')
      .select('*')
      .eq('user_id', userId);

    // Listening 통계
    const { data: listeningResults } = await supabase
      .from('listening_results_2026')
      .select('*')
      .eq('user_id', userId);

    // Speaking 통계
    const { data: speakingResults } = await supabase
      .from('speaking_results_2026')
      .select('*')
      .eq('user_id', userId);

    // Writing 통계
    const { data: writingResults } = await supabase
      .from('writing_results_2026')
      .select('*')
      .eq('user_id', userId);

    // 통계 계산 함수
    const calculateStats = (results: any[] | null, type: string) => {
      if (!results || results.length === 0) {
        return {
          totalTests: 0,
          totalQuestions: 0,
          correctAnswers: 0,
          accuracy: 0,
          averageScore: 0,
          lastTestDate: null,
        };
      }

      let totalQuestions = 0;
      let correctAnswers = 0;
      let totalScore = 0;

      results.forEach((result) => {
        if (type === 'reading' || type === 'listening') {
          totalQuestions += result.total_questions || 0;
          correctAnswers += result.correct_count || 0;
          totalScore += (result.score || 0);
        } else {
          // speaking, writing
          totalScore += (result.score || 0);
        }
      });

      return {
        totalTests: results.length,
        totalQuestions,
        correctAnswers,
        accuracy: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
        averageScore: results.length > 0 ? Math.round(totalScore / results.length) : 0,
        lastTestDate: results[results.length - 1]?.created_at || null,
      };
    };

    const stats = {
      reading: calculateStats(readingResults, 'reading'),
      listening: calculateStats(listeningResults, 'listening'),
      speaking: calculateStats(speakingResults, 'speaking'),
      writing: calculateStats(writingResults, 'writing'),
    };

    // 전체 통계
    const allTests = [
      ...(readingResults || []),
      ...(listeningResults || []),
      ...(speakingResults || []),
      ...(writingResults || []),
    ];

    const totalStats = {
      totalTests: allTests.length,
      thisWeek: allTests.filter((t) => {
        const date = new Date(t.created_at);
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return date > oneWeekAgo;
      }).length,
      thisMonth: allTests.filter((t) => {
        const date = new Date(t.created_at);
        const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return date > oneMonthAgo;
      }).length,
    };

    return NextResponse.json({
      ok: true,
      stats,
      total: totalStats,
    });
  } catch (err: any) {
    console.error('[learning-stats] error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
