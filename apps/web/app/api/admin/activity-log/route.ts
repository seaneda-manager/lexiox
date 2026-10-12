export const dynamic = 'force-dynamic';

// apps/web/app/api/admin/activity-log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../../lib/supabaseServer';

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServer();

  const { data: { user }, error: uerr } = await supabase.auth.getUser();
  if (uerr) return NextResponse.json({ error: uerr.message }, { status: 500 });
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me, error: perr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (perr) return NextResponse.json({ error: perr.message }, { status: 500 });
  if (me?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q')?.trim() || '').replace(/[,()%]/g, ' ');
  const action = searchParams.get('action')?.trim() || '';
  const cursor = searchParams.get('cursor');

  let query = supabase
    .from('user_activity_log')
    .select('id, user_id, action, path, metadata, ip_address, user_agent, created_at, profiles(full_name, email, role)')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (action) query = query.eq('action', action);
  if (cursor) query = query.lt('created_at', cursor);

  if (q) {
    const { data: matches, error: merr } = await supabase
      .from('profiles')
      .select('id')
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(200);
    if (merr) return NextResponse.json({ error: merr.message }, { status: 500 });
    const ids = (matches ?? []).map((m) => m.id);
    const parts = [`path.ilike.%${q}%`];
    if (ids.length > 0) parts.push(`user_id.in.(${ids.join(',')})`);
    query = query.or(parts.join(','));
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let items = data ?? [];
  let nextCursor: string | null = null;
  if (items.length > PAGE_SIZE) {
    nextCursor = items[PAGE_SIZE - 1].created_at;
    items = items.slice(0, PAGE_SIZE);
  }
  return NextResponse.json({ items, nextCursor });
}
