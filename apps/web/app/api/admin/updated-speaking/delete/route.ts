import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ ok: false, error: 'invalid ids' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    const { data: locked } = await supabase
      .from('speaking_tests')
      .select('id,is_locked')
      .in('id', ids);

    if (locked?.some(t => t.is_locked)) {
      return NextResponse.json({ ok: false, error: 'cannot delete locked items' }, { status: 403 });
    }

    const { error } = await supabase
      .from('speaking_tests')
      .delete()
      .in('id', ids);

    if (error) throw error;
    return NextResponse.json({ ok: true, deleted: ids.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
