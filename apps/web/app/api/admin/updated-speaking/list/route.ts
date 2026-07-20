import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('speaking_tests')
      .select('id,label,is_locked,updated_at,payload')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ ok: true, tests: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
