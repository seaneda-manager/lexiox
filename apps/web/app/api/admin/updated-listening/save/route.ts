export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';

export async function POST(req: Request) {
  try {
    const { test } = await req.json();
    if (!test?.meta?.id) {
      return NextResponse.json({ ok: false, error: 'Missing test payload' }, { status: 400 });
    }

    const sb = getServiceSupabase();

    const { data: existing } = await sb
      .from('listening_tests_2026')
      .select('id')
      .eq('id', test.meta.id)
      .maybeSingle();

    const row = {
      id: test.meta.id,
      label: test.meta.label,
      exam_era: test.meta.examEra ?? 'ibt_2026',
      payload: test,
    };

    const { error } = existing
      ? await sb.from('listening_tests_2026').update(row).eq('id', test.meta.id)
      : await sb.from('listening_tests_2026').insert(row);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    // 즉시 listening_tests에 저장 (Lock 불필요)
    const { error: insertError } = await sb
      .from('listening_tests')
      .upsert(
        {
          id: test.meta.id,
          label: test.meta.label,
          exam_era: 'ibt_2026',
          content: test,
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (insertError) console.warn('listening_tests insert:', insertError);

    return NextResponse.json({ ok: true, testId: test.meta.id });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
