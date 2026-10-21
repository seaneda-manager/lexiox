export const dynamic = 'force-dynamic';

// apps/web/app/api/admin/set-program/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { getServiceSupabase } from '@/lib/supabase/service';

const VALID_PROGRAMS = ['gap', 'toefl', 'lexiox', null] as const;
type Program = 'gap' | 'toefl' | 'lexiox' | null;

// 트랙(서로 겹치지 않음) + TOEFL 여부. 허용 조합: 단독 4가지 + TOEFL 과의 복수 3가지.
const VALID_TRACKS = ['hi_naesin', 'middle', 'jr', null] as const;
type Track = 'hi_naesin' | 'middle' | 'jr' | null;

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
  const { userId, program, track, hasToefl } = body as {
    userId?: string;
    program?: Program;
    track?: Track;
    hasToefl?: boolean;
  };

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  // ── 새 방식: 트랙 + TOEFL 여부 ─────────────────────────────
  if ('track' in body || 'hasToefl' in body) {
    if (!VALID_TRACKS.includes((track ?? null) as Track)) {
      return NextResponse.json({ error: 'track must be one of: hi_naesin, middle, jr, or null' }, { status: 400 });
    }
    if (typeof hasToefl !== 'boolean') {
      return NextResponse.json({ error: 'hasToefl must be boolean' }, { status: 400 });
    }
    const t: Track = track ?? null;
    const db = getServiceSupabase();

    // 기존 program 값은 호환을 위해 함께 맞춰 둔다 (메뉴가 아직 이 값을 쓴다).
    //   TOEFL 포함 → 'toefl' (기존이 'gap' 이면 그대로 유지), TOEFL 없이 트랙만 → 'lexiox', 둘 다 없음 → null
    const { data: cur } = await db.from('profiles').select('program').eq('id', userId).maybeSingle();
    const legacy: Program = hasToefl ? (cur?.program === 'gap' ? 'gap' : 'toefl') : t ? 'lexiox' : null;

    const { error: e } = await db
      .from('profiles')
      .update({ track: t, has_toefl: hasToefl, program: legacy })
      .eq('id', userId);
    if (e) {
      const missing = /track|has_toefl/i.test(e.message);
      return NextResponse.json(
        { error: missing ? 'DB 마이그레이션(20261021000001_profiles_track_and_toefl.sql)을 먼저 실행하세요.' : e.message },
        { status: missing ? 409 : 500 },
      );
    }
    return NextResponse.json({ ok: true, program: legacy, track: t, hasToefl });
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
