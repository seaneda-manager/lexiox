import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });

    const supabase = getServiceSupabase();
    const { error } = await supabase
      .from('speaking_tests')
      .update({ is_locked: false })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
