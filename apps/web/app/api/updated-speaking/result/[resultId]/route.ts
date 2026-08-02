import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ resultId: string }> }
) {
  try {
    const { resultId } = await params;
    const supabase = await getServerSupabase();

    // result id 또는 assignment_id로 조회
    let resultData;
    let resultError;

    const { data: byId, error: byIdError } = await supabase
      .from('speaking_results_2026')
      .select('*')
      .eq('id', resultId)
      .single();

    if (!byIdError && byId) {
      resultData = byId;
      resultError = null;
    } else {
      const { data: byAssignmentId, error: byAssignmentError } = await supabase
        .from('speaking_results_2026')
        .select('*')
        .eq('assignment_id', resultId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      resultData = byAssignmentId;
      resultError = byAssignmentError;
    }

    if (resultError || !resultData) {
      return NextResponse.json(
        { ok: false, error: 'Result not found' },
        { status: 404 }
      );
    }

    // 테스트 정보 조회
    const { data: testData, error: testError } = await supabase
      .from('speaking_tests_2026')
      .select('*')
      .eq('id', resultData.test_id)
      .single();

    if (testError || !testData) {
      return NextResponse.json(
        { ok: false, error: 'Test not found' },
        { status: 404 }
      );
    }

    const testJson = testData.payload as any;

    // Task 정보 추출
    const taskId = resultData.task_id;
    const taskInfo = testJson?.tasks?.find((t: any) => t.id === taskId) || {};

    return NextResponse.json({
      testId: resultData.test_id,
      testLabel: testJson.meta?.label ?? testData.label ?? 'Speaking Test',
      taskId: taskId,
      taskType: taskInfo.type || 'unknown',
      taskQuestion: taskInfo.prompt || resultData.prompt || '',

      // 사용자 답변
      userScript: resultData.script || '',
      userAudioUrl: resultData.audio_url || null,
      userWordCount: resultData.approx_words || 0,
      userSentenceCount: resultData.approx_sentences || 0,

      // AI 피드백
      aiFeedback: resultData.ai_feedback || '',
      aiScore: resultData.ai_total_score || 0,

      // 모범 답안 (테스트 데이터에서)
      modelAnswer: taskInfo.modelAnswer || '',
      modelScript: taskInfo.transcript || '',

      // 메타 정보
      createdAt: resultData.created_at,
      recordingDuration: resultData.recording_duration || 0,
    });
  } catch (err: any) {
    console.error('[updated-speaking/result] error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
