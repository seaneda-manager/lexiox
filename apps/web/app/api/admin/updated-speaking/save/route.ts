import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { test } = await req.json();
    if (!test?.id) return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 });

    const supabase = getServiceSupabase();

    const { data: existing } = await supabase
      .from('speaking_tests')
      .select('is_locked')
      .eq('id', test.id)
      .maybeSingle();

    if (existing?.is_locked) {
      return NextResponse.json({ ok: false, error: 'locked' }, { status: 403 });
    }

    const { error } = await supabase
      .from('speaking_tests')
      .upsert({ id: test.id, label: test.label ?? '', payload: test }, { onConflict: 'id' });

    if (error) throw error;
    return NextResponse.json({ ok: true, id: test.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
