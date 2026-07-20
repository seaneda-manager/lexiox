import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // admin 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if ((profile as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { redemption_id, status, admin_note } = (await req.json()) as {
      redemption_id: string;
      status: 'approved' | 'fulfilled' | 'rejected';
      admin_note?: string;
    };

    if (!redemption_id || !['approved', 'fulfilled', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    }

    const { error } = await supabase
      .from('perk_redemptions')
      .update({
        status,
        admin_note:  admin_note ?? null,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', redemption_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 반려 시 포인트 환불
    if (status === 'rejected') {
      const { data: redemption } = await supabase
        .from('perk_redemptions')
        .select('student_id, points_spent')
        .eq('id', redemption_id)
        .maybeSingle();

      if (redemption) {
        await supabase.rpc('award_points', {
          p_student_id: redemption.student_id,
          p_rule_id:    'homework_submit', // ledger 기록용 임시 룰 (환불)
          p_bonus:      redemption.points_spent,
          p_source_ref: `refund:${redemption_id}`,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/perks/resolve]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
