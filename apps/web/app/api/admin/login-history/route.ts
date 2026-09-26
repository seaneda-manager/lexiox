export const dynamic = 'force-dynamic';

// apps/web/app/api/admin/login-history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../../lib/supabaseServer';

const PAGE_SIZE = 30;

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
  const q = searchParams.get('q')?.trim() || '';
  const cursor = searchParams.get('cursor'); // created_at 기준 커서

  let matchingUserIds: string[] | null = null;
  if (q) {
    const { data: matches, error: merr } = await supabase
      .from('profiles')
      .select('id')
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(200);
    if (merr) return NextResponse.json({ error: merr.message }, { status: 500 });
    matchingUserIds = (matches ?? []).map((m) => m.id);
  }

  let query = supabase
    .from('login_history')
    .select('id, user_id, email, ip_address, user_agent, created_at, profiles(full_name, email, role)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (q) {
    const orParts = [`email.ilike.%${q}%`];
    if (matchingUserIds && matchingUserIds.length > 0) {
      orParts.push(`user_id.in.(${matchingUserIds.join(',')})`);
    }
    query = query.or(orParts.join(','));
  }

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let nextCursor: string | null = null;
  let items = data ?? [];
  if (items.length > PAGE_SIZE) {
    const last = items[PAGE_SIZE - 1];
    nextCursor = last.created_at;
    items = items.slice(0, PAGE_SIZE);
  }

  return NextResponse.json({
    items,
    nextCursor,
    total: count ?? undefined,
  });
}
