import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ resultId: string }> }
) {
  try {
    const { resultId } = await params;
    const supabase = await getServerSupabase();

    let resultData;
    let resultError;

    const { data: byId, error: byIdError } = await supabase
      .from('writing_results_2026')
      .select('*')
      .eq('id', resultId)
      .single();

    if (!byIdError && byId) {
      resultData = byId;
      resultError = null;
    } else {
      const { data: byAssignmentId, error: byAssignmentError } = await supabase
        .from('writing_results_2026')
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

    const { data: testData, error: testError } = await supabase
      .from('writing_tests_2026')
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

    return NextResponse.json({
      testId: resultData.test_id,
      testLabel: testJson.meta?.label ?? testData.label ?? 'Writing Test',

      // 사용자 답변
      userEssay: resultData.essay_text || resultData.content || '',
      userWordCount: resultData.word_count || 0,

      // AI 피드백
      aiFeedback: resultData.ai_feedback || '',
      aiScore: resultData.ai_score || 0,

      // 태스크 정보
      tasks: (testJson?.tasks || []).map((task: any, idx: number) => ({
        taskNumber: idx + 1,
        taskType: task.taskType || task.type || 'writing',
        prompt: task.prompt || '',
        timeLimit: task.timeLimit || 25,
        wordRange: task.wordRange || { min: 100, max: 300 },
        userAnswer: resultData[`task${idx + 1}_answer`] || '',
      })),

      createdAt: resultData.created_at,
    });
  } catch (err: any) {
    console.error('[updated-writing/result] error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
