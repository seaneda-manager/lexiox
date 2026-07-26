import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { getAssignedTestIds } from '@/lib/supabase/assignment-guard';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const [{ data, error }, assignedIds] = await Promise.all([
      supabase
        .from('speaking_tests')
        .select('id,label,updated_at,payload')
        .order('updated_at', { ascending: false }),
      getAssignedTestIds('speaking'),
    ]);

    if (error) throw error;
    const tests = (data ?? []).map((t) => ({ ...t, assigned: assignedIds.has(t.id) }));
    return NextResponse.json({ ok: true, tests }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
