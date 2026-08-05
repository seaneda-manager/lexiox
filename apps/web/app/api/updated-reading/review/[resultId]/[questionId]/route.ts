export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ resultId: string; questionId: string }> }
) {
  try {
    const { resultId, questionId } = await params;
    const supabase = await getServerSupabase();
    const body = await req.json();

    const { stage, stageData } = body;

    if (!stage || !stageData) {
      return NextResponse.json(
        { ok: false, error: 'Missing stage or stageData' },
        { status: 400 }
      );
    }

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // review_progress 테이블에 저장 (새 테이블 가정)
    // 또는 reading_results_2026.metadata에 JSON으로 저장
    const { error } = await supabase
      .from('reading_review_progress')
      .upsert(
        {
          result_id: resultId,
          question_id: questionId,
          user_id: userId,
          stage,
          stage_data: stageData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'result_id,question_id,user_id,stage' }
      );

    if (error) {
      console.error('Error saving progress:', error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Stage ${stage} saved successfully`,
    });
  } catch (err: any) {
    console.error('[reading/review/progress] error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ resultId: string; questionId: string }> }
) {
  try {
    const { resultId, questionId } = await params;
    const supabase = await getServerSupabase();

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // 해당 질문의 모든 stage 진행 상황 조회
    const { data, error } = await supabase
      .from('reading_review_progress')
      .select('*')
      .eq('result_id', resultId)
      .eq('question_id', questionId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching progress:', error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    // stage별로 정렬해서 반환
    const progressMap: Record<string, any> = {};
    (data || []).forEach((item) => {
      progressMap[item.stage] = item.stage_data;
    });

    return NextResponse.json({
      ok: true,
      progress: progressMap,
    });
  } catch (err: any) {
    console.error('[reading/review/progress GET] error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
