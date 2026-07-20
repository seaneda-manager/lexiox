import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { test } = await req.json();
    if (!test?.meta?.id) {
      return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    const { data: existing } = await supabase
      .from('writing_tests')
      .select('is_locked')
      .eq('id', test.meta.id)
      .maybeSingle();

    if (existing?.is_locked) {
      return NextResponse.json({ ok: false, error: 'locked' }, { status: 403 });
    }

    const { error } = await supabase
      .from('writing_tests')
      .upsert({
        id: test.meta.id,
        label: test.meta.label ?? '',
        exam_era: test.meta.examEra ?? 'updated',
        payload: test,
      }, { onConflict: 'id' });

    if (error) throw error;
    return NextResponse.json({ ok: true, id: test.meta.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
