import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { isTestAssigned } from '@/lib/supabase/assignment-guard';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { test } = await req.json();
    if (!test?.id) return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 });

    const supabase = getServiceSupabase();

    // 이미 배정된 시험은 수정 불가 (수동 Lock 대신 배정 여부로 자동 판단)
    if (await isTestAssigned('speaking', test.id)) {
      return NextResponse.json({ ok: false, error: '이미 학생에게 배정된 시험은 수정할 수 없습니다.' }, { status: 403 });
    }

    const { error: testError } = await supabase
      .from('speaking_tests')
      .upsert({ id: test.id, label: test.label ?? '', payload: test }, { onConflict: 'id' });

    if (testError) throw testError;

    return NextResponse.json({ ok: true, id: test.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
