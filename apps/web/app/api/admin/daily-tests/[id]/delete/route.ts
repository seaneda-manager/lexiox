export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();

    // 권한 확인 (선생님/admin만)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Daily Task 존재 확인 및 배포 상태 확인
    const { data: task, error: fetchError } = await supabase
      .from('daily_tasks')
      .select('id, status, started_at, completed_at')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !task) {
      return NextResponse.json(
        { ok: false, error: 'Daily Task not found' },
        { status: 404 }
      );
    }

    // 배포 상태 확인: 시작되었거나 완료된 상태면 배포된 것
    const isDeployed = task.status !== 'assigned' || task.started_at !== null || task.completed_at !== null;

    if (isDeployed) {
      // 배포된 문제: Soft delete (deleted_at 마킹)
      // 학생 데이터는 보존하고 선생님 대시보드에서만 숨김
      const { error: updateError } = await supabase
        .from('daily_tasks')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        console.error('[DeleteDailyTask] Soft delete error:', updateError);
        return NextResponse.json(
          { ok: false, error: 'Failed to archive task' },
          { status: 500 }
        );
      }

      console.log(`[DeleteDailyTask] ✅ Soft deleted (archived) task ${id} - Status: ${task.status}`);

      return NextResponse.json({
        ok: true,
        type: 'soft_delete',
        message: '⚠️ 이미 배포된 과제입니다. 보관 처리되었습니다. (학생 기록은 유지됨)',
      });
    } else {
      // 배포 전 문제: Hard delete (완전 삭제)
      const { error: deleteError } = await supabase
        .from('daily_tasks')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('[DeleteDailyTask] Hard delete error:', deleteError);
        return NextResponse.json(
          { ok: false, error: 'Failed to delete task' },
          { status: 500 }
        );
      }

      console.log(`[DeleteDailyTask] ✅ Hard deleted task ${id}`);

      return NextResponse.json({
        ok: true,
        type: 'hard_delete',
        message: '✅ 배포 전 과제가 완전히 삭제되었습니다',
      });
    }
  } catch (err: any) {
    console.error('[DeleteDailyTask] ERROR:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
