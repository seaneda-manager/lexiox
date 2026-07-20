import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';

export async function POST(req: Request) {
  try {
    const { id } = await req.json() as { id: string };
    if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });

    const sb = getServiceSupabase();
    const { error } = await sb
      .from('reading_tests_2026')
      .update({ is_locked: true })
      .eq('id', id);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
