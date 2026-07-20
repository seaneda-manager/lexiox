// apps/web/app/api/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServer(); // ??await

  const { data: { user }, error: uerr } = await supabase.auth.getUser();
  if (uerr) return NextResponse.json({ ok: false, error: uerr.message }, { status: 500 });
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit') ?? '20');

  const { data, error } = await supabase
    .from('study_sessions') // ?ㅽ궎留덉뿉 留욊쾶 ?좎?
    .select('id, started_at, finished_at, set_id')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(Number.isFinite(limit) ? limit : 20);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, items: data ?? [] }, { status: 200 });
}




