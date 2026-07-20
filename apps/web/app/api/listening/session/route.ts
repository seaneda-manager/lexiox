// normalized utf8
// app/api/<<your-endpoint>>/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  // ??await ?占쎌닔
  const supabase = await getSupabaseServer();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) {
    return NextResponse.json({ error: userErr.message }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // body: { setId: string, mode: 'p' | 't' | 'r' }
  const { setId, mode } = (await req.json()) as {
    setId?: string;
    mode?: 'p' | 't' | 'r';
  };
  if (!setId) {
    return NextResponse.json({ error: 'setId required' }, { status: 400 });
  }

  // 沅뚰븳/?占쎌쑀 媛??
  const { data: allow, error: allowErr } = await supabase
    .from('v_user_listening_sets')
    .select('id, downloaded')
    .eq('user_id', user.id)
    .eq('id', setId)
    .maybeSingle();

  if (allowErr) {
    return NextResponse.json({ error: allowErr.message }, { status: 400 });
  }
  if (!allow || allow.downloaded !== true) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // ?占쎌뀡 ?占쎌꽦
  const { data, error } = await supabase
    .from('listening_sessions')
    .insert({
      user_id: user.id,
      set_id: setId,
      mode: mode ?? 't',
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ sessionId: data.id }, { status: 201 });
}




