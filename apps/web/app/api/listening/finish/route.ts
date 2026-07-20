// apps/web/app/api/listening/finish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from "@/lib/supabaseServer";
import { awardPoints } from "@/lib/gamification/awardPoints";

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServer();

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr) return NextResponse.json({ ok: false, error: userErr.message }, { status: 500 });
    if (!user)  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const { sessionId } = (await req.json()) as { sessionId?: string };
    if (!sessionId?.trim()) {
      return NextResponse.json({ ok: false, error: 'sessionId required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('listening_sessions')
      .update({ finished_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select('id'); // ????踰덉㎏ ?몄옄 ?쒓굅

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    if (!data || data.length === 0) {
      return NextResponse.json({ ok: false, error: 'not found or forbidden' }, { status: 404 });
    }

    void awardPoints({ studentId: user.id, ruleId: 'listening_session', sourceRef: sessionId });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}




