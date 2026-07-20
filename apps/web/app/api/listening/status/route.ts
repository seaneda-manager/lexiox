import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('sessionId') ?? '';
  if (!id) return NextResponse.json({ ok: false, error: 'BAD_REQUEST' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await supabase
    .from('listening_sessions')
    .select('id, track_id, mode, created_at, consumed_at')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ ok: false, error: 'DB_ERROR', detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, session: data }, { status: 200 });
}
