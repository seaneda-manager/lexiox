// apps/web/app/api/admin/set-program/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { getServiceSupabase } from '@/lib/supabase/service';

const VALID_PROGRAMS = ['gap', 'toefl', 'lexiox', null] as const;
type Program = 'gap' | 'toefl' | 'lexiox' | null;

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();

  const { data: { user }, error: uerr } = await supabase.auth.getUser();
  if (uerr) return NextResponse.json({ error: uerr.message }, { status: 500 });
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Caller must be admin
  const { data: me, error: perr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (perr) return NextResponse.json({ error: perr.message }, { status: 500 });
  if (me?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { userId, program } = body as { userId?: string; program?: Program };

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }
  if (!VALID_PROGRAMS.includes(program as Program)) {
    return NextResponse.json(
      { error: `program must be one of: gap, toefl, lexiox, or null` },
      { status: 400 }
    );
  }

  // Use service role to bypass RLS for profile updates
  const adminDb = getServiceSupabase();
  const { error: updateErr } = await adminDb
    .from('profiles')
    .update({ program: program ?? null })
    .eq('id', userId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
