// apps/web/app/api/listening/consume/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import type { ConsumePlayRow, ConsumePlayResponse, Mode, CanonicalMode } from '@/app/types/listening';
import { normalizeMode } from '@/app/types/listening';

/** NULL-??臾몄젣 諛⑹?瑜??꾪븳 ?쇳떚?? DB?먮뒗 臾몄옄?대줈 ??? ?묐떟?먯꽌??null濡?蹂듭썝 */
const TRACK_ALL = '__ALL__' as const;

/** ?뺢퇋??紐⑤뱶 湲곗? 湲곕낯 ?덉슜 ?뚯닔 */
const DEFAULT_ALLOWED: Record<CanonicalMode, number> = {
  test: 1,
  study: 3,
  review: 2,
};

export async function POST(req: Request) {
  try {
    const { sessionId, trackId, mode } = (await req.json()) as {
      sessionId?: string;
      trackId?: string | null;
      mode?: Mode;
    };

    if (!sessionId || !mode) {
      const body: ConsumePlayResponse = { ok: false, error: 'Missing sessionId or mode' };
      return NextResponse.json(body, { status: 400 });
    }

    const canon = normalizeMode(mode); // ???뺢퇋?뺤쑝濡?怨좎젙

    // ?뵍 ?몄쬆
    const supabase = await getSupabaseServer();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr) throw authErr;
    if (!user) {
      const body: ConsumePlayResponse = { ok: false, error: 'Not authenticated' };
      return NextResponse.json(body, { status: 401 });
    }

    // 1) ?몄뀡 ?뚯쑀???뺤씤
    const { data: session, error: sErr } = await supabase
      .from('listening_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .single();

    if (sErr) throw sErr;
    if (!session || session.user_id !== user.id) {
      const body: ConsumePlayResponse = { ok: false, error: 'Forbidden' };
      return NextResponse.json(body, { status: 403 });
    }

    // 2) ?뚮젅??移댁슫??議고쉶 (?쇳떚?????ъ슜)
    const trackKey = trackId ?? TRACK_ALL;

    const { data: existing, error: qErr } = await supabase
      .from('listening_play_counters')
      .select('session_id, track_id, mode, plays_allowed, plays_used')
      .match({ session_id: sessionId, track_id: trackKey, mode: canon })
      .maybeSingle();

    if (qErr) throw qErr;

    const allowed = existing?.plays_allowed ?? DEFAULT_ALLOWED[canon];
    let used = existing?.plays_used ?? 0;

    // 3) 1??李④컧 (?쒕룄 ?댁뿉?쒕쭔)
    if (used < allowed) {
      used += 1;
      const { error: upErr } = await supabase
        .from('listening_play_counters')
        .upsert(
          {
            session_id: sessionId,
            track_id: trackKey,   // DB?먮뒗 ?쇳떚?щ줈 ???
            mode: canon,
            plays_allowed: allowed,
            plays_used: used,
          },
          { onConflict: 'session_id,track_id,mode' }
        );
      if (upErr) throw upErr;
    }

    // ?묐떟????(?몃옓 ?꾩껜??null濡?蹂듭썝)
    const row: ConsumePlayRow = {
      session_id: sessionId,
      track_id: trackKey === TRACK_ALL ? null : trackKey, // ??types媛 string|null ?대?濡?OK
      mode: canon,
      plays_allowed: allowed,
      plays_used: used,
      remaining: Math.max(0, allowed - used),
    };

    const body: ConsumePlayResponse = { ok: true, data: [row] };
    return NextResponse.json(body);
  } catch (e: any) {
    const body: ConsumePlayResponse = { ok: false, error: e?.message ?? String(e) };
    return NextResponse.json(body, { status: 500 });
  }
}




