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

    // 자동으로 speaking_rounds 생성 (새 테스트인 경우)
    const { data: existing } = await supabase
      .from('speaking_rounds')
      .select('id')
      .eq('speaking_test_id', test.id)
      .single();

    if (!existing) {
      // 다음 round_number 계산
      const { data: maxRound } = await supabase
        .from('speaking_rounds')
        .select('round_number', { count: 'exact' })
        .order('round_number', { ascending: false })
        .limit(1);

      const nextRound = (maxRound?.[0]?.round_number ?? 0) + 1;

      await supabase
        .from('speaking_rounds')
        .insert({ round_number: nextRound, speaking_test_id: test.id, is_active: true });
    }

    return NextResponse.json({ ok: true, id: test.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
