export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { getAssignedTestIds } from '@/lib/supabase/assignment-guard';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ ok: false, error: 'invalid ids' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // 이미 배정된 시험은 삭제 불가 (FK on delete cascade로 학생 배정 기록까지 날아감)
    const assignedIds = await getAssignedTestIds('speaking');
    if (ids.some((id: string) => assignedIds.has(id))) {
      return NextResponse.json({ ok: false, error: '이미 배정된 시험은 삭제할 수 없습니다.' }, { status: 403 });
    }

    const { error } = await supabase
      .from('speaking_tests')
      .delete()
      .in('id', ids);

    if (error) throw error;
    return NextResponse.json({ ok: true, deleted: ids.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
