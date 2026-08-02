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

    const recommendations = [];
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. 약한 분야 분석
    const { data: readingResults } = await supabase
      .from('reading_results_2026')
      .select('score')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: listeningResults } = await supabase
      .from('listening_results_2026')
      .select('score')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: speakingResults } = await supabase
      .from('speaking_results_2026')
      .select('score')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: writingResults } = await supabase
      .from('writing_results_2026')
      .select('score')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const avgReading = readingResults && readingResults.length > 0
      ? readingResults.reduce((sum, r) => sum + (r.score || 0), 0) / readingResults.length
      : 100;

    const avgListening = listeningResults && listeningResults.length > 0
      ? listeningResults.reduce((sum, r) => sum + (r.score || 0), 0) / listeningResults.length
      : 100;

    const avgSpeaking = speakingResults && speakingResults.length > 0
      ? speakingResults.reduce((sum, r) => sum + (r.score || 0), 0) / speakingResults.length
      : 100;

    const avgWriting = writingResults && writingResults.length > 0
      ? writingResults.reduce((sum, r) => sum + (r.score || 0), 0) / writingResults.length
      : 100;

    const sections = [
      { name: 'Reading', score: avgReading, minScore: 70 },
      { name: 'Listening', score: avgListening, minScore: 70 },
      { name: 'Speaking', score: avgSpeaking, minScore: 70 },
      { name: 'Writing', score: avgWriting, minScore: 70 },
    ];

    sections.forEach((section) => {
      if (section.score < section.minScore) {
        recommendations.push({
          type: 'weak_section',
          title: `${section.name} 강화 필요`,
          description: `최근 ${section.name} 평균 점수가 ${Math.round(section.score)}점입니다. 복습을 추천합니다.`,
          section: section.name.toLowerCase(),
          priority: 'high',
        });
      }
    });

    // 2. 오래된 복습 추천
    const { data: oldReviews } = await supabase
      .from('reading_results_2026')
      .select('id, created_at')
      .eq('user_id', userId)
      .lt('created_at', sevenDaysAgo.toISOString())
      .limit(1);

    if (oldReviews && oldReviews.length > 0) {
      recommendations.push({
        type: 'review_overdue',
        title: '지난 학습 복습',
        description: '7일 이상 지난 학습 내용을 복습해보세요.',
        section: 'reading',
        priority: 'medium',
      });
    }

    // 3. 최근 오답 복습
    const { data: recentWrong } = await supabase
      .from('reading_results_2026')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', threeDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(3);

    if (recentWrong && recentWrong.length > 0) {
      const wrongCount = recentWrong.filter((r) => {
        const correct = r.correct_count || 0;
        const total = r.total_questions || 1;
        return (correct / total) < 0.6;
      }).length;

      if (wrongCount > 0) {
        recommendations.push({
          type: 'recent_mistakes',
          title: '최근 오답 복습',
          description: `최근 3일간 ${wrongCount}개 테스트에서 60% 이하의 정답률을 기록했습니다.`,
          section: 'reading',
          priority: 'high',
        });
      }
    }

    // 4. 균형잡힌 학습 추천
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'balanced_study',
        title: '균형잡힌 학습 진행 중',
        description: '현재 학습 진행이 좋습니다. 계속 진행해주세요.',
        section: null,
        priority: 'low',
      });
    }

    return NextResponse.json({
      ok: true,
      recommendations: recommendations.sort(
        (a, b) =>
          (a.priority === 'high' ? 0 : a.priority === 'medium' ? 1 : 2) -
          (b.priority === 'high' ? 0 : b.priority === 'medium' ? 1 : 2)
      ),
    });
  } catch (err: any) {
    console.error('[review-recommendations] error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
