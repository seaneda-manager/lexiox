export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

/**
 * POST /api/daily-task/generate
 * 학생이 Daily Task를 시작할 때 호출
 * 해당 학생의 할당된 Daily Task의 문제들을 반환
 */
export async function POST(req: Request) {
  try {
    const supabase = await getServerSupabase();

    // 현재 사용자 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 학생의 할당된 Daily Task 조회
    const { data: dailyTask, error: taskError } = await supabase
      .from('daily_tests')
      .select('*')
      .eq('student_id', user.id)
      .eq('status', 'assigned')
      .order('assigned_date', { ascending: false })
      .limit(1)
      .single();

    if (taskError || !dailyTask) {
      return NextResponse.json(
        { error: 'No assigned daily task found' },
        { status: 404 }
      );
    }

    // Daily Task의 문제 ID들 추출
    const completeWordsIds = dailyTask.complete_words_ids || [];
    const dailyLifeIds = dailyTask.daily_life_ids || [];
    const academicPassageIds = dailyTask.academic_passage_ids || [];
    const listeningResponseIds = dailyTask.listening_response_ids || [];
    const listeningTrackId = dailyTask.listening_track_id;

    // 문제들을 병렬로 조회
    const [completeWordsData, dailyLifeData, academicPassageData, listeningResponseData, listeningTrackData] = await Promise.all([
      completeWordsIds.length > 0
        ? supabase
            .from('problem_bank_complete_words_2026')
            .select('*')
            .in('id', completeWordsIds)
        : Promise.resolve({ data: [] }),
      dailyLifeIds.length > 0
        ? supabase
            .from('problem_bank_daily_life_2026')
            .select('*')
            .in('id', dailyLifeIds)
        : Promise.resolve({ data: [] }),
      academicPassageIds.length > 0
        ? supabase
            .from('problem_bank_academic_passage_2026')
            .select('*')
            .in('id', academicPassageIds)
        : Promise.resolve({ data: [] }),
      listeningResponseIds.length > 0
        ? supabase
            .from('problem_bank_listening_response_2026')
            .select('*')
            .in('id', listeningResponseIds)
        : Promise.resolve({ data: [] }),
      listeningTrackId
        ? supabase
            .from('problem_bank_listening_track_2026')
            .select('*')
            .eq('id', listeningTrackId)
        : Promise.resolve({ data: [] }),
    ]);

    // Daily Task 상태를 "in_progress"로 업데이트
    await supabase
      .from('daily_tests')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', dailyTask.id);

    return NextResponse.json({
      ok: true,
      daily_task_id: dailyTask.id,
      task_type: dailyTask.task_type,
      difficulty: dailyTask.difficulty,
      due_date: dailyTask.due_date,
      problems: {
        complete_words: completeWordsData.data || [],
        daily_life: dailyLifeData.data || [],
        academic_passage: academicPassageData.data || [],
        listening_response: listeningResponseData.data || [],
        listening_track: listeningTrackData.data?.[0] || null,
      },
    });
  } catch (err: any) {
    console.error('[DailyTaskGenerate] ERROR:', err);
    return NextResponse.json(
      { error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
