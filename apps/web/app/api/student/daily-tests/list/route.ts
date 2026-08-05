export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getStudentDailyTasks, getDailyTaskWithProblems } from '@/lib/utils/problemBank';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * GET /api/student/daily-task/list
 *
 * 현재 로그인한 학생의 Daily Tasks 조회
 *
 * Query Parameters:
 * - status: "assigned" | "in_progress" | "completed" | "overdue" (optional)
 * - sort: "due_date" | "assigned_date" (default: due_date)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status') as any;
    const sort = url.searchParams.get('sort') ?? 'due_date';

    // 현재 학생 정보 조회
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // JWT에서 user_id 추출
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = user.id;

    // Daily Tasks 조회
    const tasks = await getStudentDailyTasks(studentId, status);

    // 각 task에 문제들을 populate
    const tasksWithProblems = await Promise.all(
      tasks.map(task => getDailyTaskWithProblems(task.id))
    );

    return NextResponse.json({
      ok: true,
      tasks: tasksWithProblems,
    });
  } catch (err: any) {
    console.error('[Student Daily Task] ERROR', err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}
