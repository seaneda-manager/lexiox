import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';

export async function POST(req: Request) {
  try {
    const { id } = await req.json() as { id: string };
    if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });

    const sb = getServiceSupabase();

    // 1. Get the test from listening_tests_2026
    const { data: testData, error: fetchError } = await sb
      .from('listening_tests_2026')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !testData) {
      return NextResponse.json({ ok: false, error: 'Test not found' }, { status: 404 });
    }

    // 2. Update is_locked in listening_tests_2026
    const { error: updateError } = await sb
      .from('listening_tests_2026')
      .update({ is_locked: true })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    // 3. Insert into listening_tests (for student access)
    const { error: insertError } = await sb
      .from('listening_tests')
      .insert({
        id: testData.id,
        label: testData.label,
        exam_era: 'ibt_2026',
        content: testData.payload,
        status: 'locked',
        created_at: new Date().toISOString(),
      })
      .onConflict('id')
      .update({
        content: testData.payload,
        status: 'locked',
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
