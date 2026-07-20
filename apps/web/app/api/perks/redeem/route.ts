import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { perk_id } = (await req.json()) as { perk_id?: string };
    if (!perk_id) return NextResponse.json({ error: 'perk_id required' }, { status: 400 });

    // perk 조회
    const { data: perk } = await supabase
      .from('perk_catalog')
      .select('id, name, point_cost, stock, is_active')
      .eq('id', perk_id)
      .eq('is_active', true)
      .maybeSingle();

    if (!perk) return NextResponse.json({ error: '존재하지 않는 Perk입니다.' }, { status: 404 });

    // 재고 확인 (실물)
    if (perk.stock !== null && perk.stock <= 0) {
      return NextResponse.json({ error: '재고가 소진되었습니다.' }, { status: 400 });
    }

    // 학생 포인트 확인
    const { data: gami } = await supabase
      .from('student_gamification')
      .select('total_points')
      .eq('student_id', user.id)
      .maybeSingle();

    const currentPoints = gami?.total_points ?? 0;
    if (currentPoints < perk.point_cost) {
      return NextResponse.json({
        error: `포인트가 부족합니다. (보유: ${currentPoints}P / 필요: ${perk.point_cost}P)`,
      }, { status: 400 });
    }

    // 이미 pending/approved 상태의 동일 perk 교환 확인
    const { data: existing } = await supabase
      .from('perk_redemptions')
      .select('id')
      .eq('student_id', user.id)
      .eq('perk_id', perk_id)
      .in('status', ['pending', 'approved'])
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: '이미 교환 신청 중인 Perk입니다.' }, { status: 400 });
    }

    // 포인트 차감
    const { error: deductErr } = await supabase
      .from('student_gamification')
      .update({ total_points: currentPoints - perk.point_cost, updated_at: new Date().toISOString() })
      .eq('student_id', user.id);

    if (deductErr) return NextResponse.json({ error: deductErr.message }, { status: 500 });

    // 교환 내역 생성
    const { data: redemption, error: redeemErr } = await supabase
      .from('perk_redemptions')
      .insert({ student_id: user.id, perk_id, points_spent: perk.point_cost })
      .select('id, status')
      .single();

    if (redeemErr) {
      // 롤백: 포인트 복구
      await supabase
        .from('student_gamification')
        .update({ total_points: currentPoints })
        .eq('student_id', user.id);
      return NextResponse.json({ error: redeemErr.message }, { status: 500 });
    }

    // 실물 재고 감소
    if (perk.stock !== null) {
      await supabase
        .from('perk_catalog')
        .update({ stock: perk.stock - 1 })
        .eq('id', perk_id);
    }

    return NextResponse.json({ ok: true, redemption, remaining_points: currentPoints - perk.point_cost });
  } catch (err) {
    console.error('[perks/redeem]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
