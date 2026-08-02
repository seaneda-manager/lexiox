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
      .from('listening_results_2026')
      .select('*')
      .eq('id', resultId)
      .single();

    if (!byIdError && byId) {
      resultData = byId;
      resultError = null;
    } else {
      const { data: byAssignmentId, error: byAssignmentError } = await supabase
        .from('listening_results_2026')
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
      .from('listening_tests_2026')
      .select('*')
      .eq('id', resultData.test_id)
      .single();

    if (testError || !testData) {
      return NextResponse.json(
        { ok: false, error: 'Test not found' },
        { status: 404 }
      );
    }

    // 사용자 답변 정규화
    const normalizeAnswers = (raw: unknown): Record<string, string> => {
      if (!raw) return {};
      const flatten = (v: unknown): string =>
        Array.isArray(v) ? v.map(String).sort().join(',') : String(v ?? '');
      if (Array.isArray(raw)) {
        const map: Record<string, string> = {};
        for (const entry of raw as any[]) {
          const id = entry?.questionId ?? entry?.question_id;
          if (!id) continue;
          map[id] = flatten(entry?.chosenChoiceId ?? entry?.answer ?? entry?.value);
        }
        return map;
      }
      if (typeof raw === 'object') {
        const map: Record<string, string> = {};
        for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
          map[k] = flatten(v);
        }
        return map;
      }
      return {};
    };

    const userAnswers = normalizeAnswers(resultData.answers);
    const testJson = testData.payload as any;

    if (!testJson?.conversations?.length) {
      return NextResponse.json(
        { ok: false, error: 'Test payload is empty or malformed' },
        { status: 500 }
      );
    }

    // 모든 질문 수집
    const allQuestions = testJson.conversations.flatMap((conv: any) =>
      (conv.questions || []).map((q: any, idx: number) => ({
        ...q,
        conversationId: conv.id,
        conversationIndex: testJson.conversations.indexOf(conv) + 1,
      }))
    );

    // 질문별 결과 구성
    const questions = allQuestions.map((q: any, idx: number) => {
      const correctChoice = q.choices?.find(
        (c: any) => c.isCorrect === true || c.is_correct === true
      );
      const isCorrect = userAnswers[q.id] === correctChoice?.id;

      return {
        id: q.id,
        number: idx + 1,
        conversationNumber: q.conversationIndex,
        stem: q.stem,
        type: q.type || 'detail',
        itemType: `Conversation ${q.conversationIndex}`,
        userAnswer: userAnswers[q.id] ?? null,
        correctAnswer: correctChoice?.text ?? 'Unknown',
        isCorrect,
        explanation: null,
      };
    });

    // 점수 계산
    const correctCount = questions.filter((q) => q.isCorrect).length;
    const totalCount = questions.length;

    return NextResponse.json({
      testId: resultData.test_id,
      testLabel: testJson.meta?.label ?? testData.label ?? 'Listening Test',
      correctCount,
      totalCount,
      score: totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0,
      questions,
    });
  } catch (err: any) {
    console.error('[updated-listening/result] error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
