// apps/web/app/api/admin/reports/reading/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServer();

  // ?몄쬆 + admin 媛??
  const { data: { user }, error: uerr } = await supabase.auth.getUser();
  if (uerr) return NextResponse.json({ error: uerr.message }, { status: 500 });
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me, error: perr } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (perr) return NextResponse.json({ error: perr.message }, { status: 500 });
  if (me?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // 吏臾몃퀎 吏묎퀎
  const { data: rows, error: rerr } = await supabase
    .from('v_reading_attempts_enriched')
    .select('passage_id, is_correct, elapsed_ms, session_id, user_id');
  if (rerr) return NextResponse.json({ error: rerr.message }, { status: 500 });

  // 硫붾え由?吏묎퀎
  const byPassage: Record<string, any> = {};
  const sessions = new Set<string>();
  const users    = new Set<string>();

  for (const r of rows ?? []) {
    const pid = r.passage_id as string;
    sessions.add(r.session_id as string);
    users.add(r.user_id as string);

    byPassage[pid] ??= { answers: 0, correct: 0, total_ms: 0, samples: 0 };
    byPassage[pid].answers += 1;
    byPassage[pid].correct += r.is_correct ? 1 : 0;
    if (typeof r.elapsed_ms === 'number') {
      byPassage[pid].total_ms += r.elapsed_ms;
      byPassage[pid].samples += 1;
    }
  }

  const passageIds = Object.keys(byPassage);
  let titles: Record<string, { title: string }> = {};
  if (passageIds.length) {
    const { data: ps, error: perr2 } = await supabase
      .from('reading_passages')
      .select('id, title')
      .in('id', passageIds);
    if (perr2) return NextResponse.json({ error: perr2.message }, { status: 500 });
    ps?.forEach(p => { titles[p.id] = { title: p.title }; });
  }

  const list = passageIds.map(pid => {
    const v = byPassage[pid];
    const acc = v.answers ? (v.correct / v.answers) : 0;
    const avg = v.samples ? Math.round(v.total_ms / v.samples) : null;
    return {
      passage_id: pid,
      title: titles[pid]?.title ?? '(untitled)',
      answers: v.answers,
      correct: v.correct,
      accuracy: Number((acc * 100).toFixed(1)),
      avg_ms: avg,
    };
  }).sort((a,b)=> b.answers - a.answers);

  const summary = {
    passages: passageIds.length,
    sessions: sessions.size,
    users: users.size,
    answers: rows?.length ?? 0,
    accuracy: (() => {
      const tot = list.reduce((s,x)=>s+x.answers,0);
      const cor = list.reduce((s,x)=>s+x.correct,0);
      return tot ? Number(((cor/tot)*100).toFixed(1)) : 0;
    })(),
  };

  return NextResponse.json({ summary, list });
}




