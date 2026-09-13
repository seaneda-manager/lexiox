import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type CompletedPassage = {
  id: string;
  title: string;
  body_en: string;
  source: 'reading' | 'listening' | 'hi_naesin';
  completed_at: string;
};

/**
 * GET /api/typing-practice/completed-passages
 * Passages/transcripts the current student has already completed — TOEFL reading
 * (reading_sessions.finished_at), TOEFL listening (listening_sessions.finished_at),
 * and Hi-내신 drills (hi_naesin_sessions.status = 'submitted') — so they can retype
 * material they've already studied instead of only fresh/admin-curated content.
 */
export async function GET() {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const items: CompletedPassage[] = [];

    // TOEFL reading
    const { data: readingSessions } = await supabase
      .from('reading_sessions')
      .select('passage_id, finished_at')
      .eq('user_id', user.id)
      .not('finished_at', 'is', null)
      .order('finished_at', { ascending: false })
      .limit(50);

    const readingPassageIds = Array.from(
      new Set((readingSessions ?? []).map((r: any) => r.passage_id).filter(Boolean))
    );
    if (readingPassageIds.length > 0) {
      const { data: passages } = await supabase
        .from('reading_passages')
        .select('id, title, content')
        .in('id', readingPassageIds);

      const finishedAtByPassage = new Map<string, string>();
      for (const r of readingSessions ?? []) {
        if (r.passage_id && !finishedAtByPassage.has(r.passage_id)) {
          finishedAtByPassage.set(r.passage_id, r.finished_at as string);
        }
      }

      for (const p of passages ?? []) {
        if (!p.content) continue;
        items.push({
          id: `reading:${p.id}`,
          title: p.title,
          body_en: p.content,
          source: 'reading',
          completed_at: finishedAtByPassage.get(p.id) ?? '',
        });
      }
    }

    // TOEFL listening
    const { data: listeningSessions } = await supabase
      .from('listening_sessions')
      .select('track_id, finished_at')
      .eq('user_id', user.id)
      .not('finished_at', 'is', null)
      .order('finished_at', { ascending: false })
      .limit(50);

    const trackIds = Array.from(
      new Set((listeningSessions ?? []).map((r: any) => r.track_id).filter(Boolean))
    );
    if (trackIds.length > 0) {
      const { data: tracks } = await supabase
        .from('listening_tracks')
        .select('id, title, transcript')
        .in('id', trackIds);

      const finishedAtByTrack = new Map<string, string>();
      for (const r of listeningSessions ?? []) {
        if (r.track_id && !finishedAtByTrack.has(r.track_id)) {
          finishedAtByTrack.set(r.track_id, r.finished_at as string);
        }
      }

      for (const t of tracks ?? []) {
        if (!t.transcript) continue;
        items.push({
          id: `listening:${t.id}`,
          title: t.title,
          body_en: t.transcript,
          source: 'listening',
          completed_at: finishedAtByTrack.get(t.id) ?? '',
        });
      }
    }

    // Hi-내신 drills
    const { data: hiNaesinSessions } = await supabase
      .from('hi_naesin_sessions')
      .select('passage_id, status, submitted_at')
      .eq('student_id', user.id)
      .eq('session_type', 'drill')
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })
      .limit(50);

    const hiNaesinPassageIds = Array.from(
      new Set((hiNaesinSessions ?? []).map((r: any) => r.passage_id).filter(Boolean))
    );
    if (hiNaesinPassageIds.length > 0) {
      const { data: passages } = await supabase
        .from('hi_naesin_passages')
        .select('id, title, passage_text')
        .in('id', hiNaesinPassageIds);

      const submittedAtByPassage = new Map<string, string>();
      for (const r of hiNaesinSessions ?? []) {
        if (r.passage_id && !submittedAtByPassage.has(r.passage_id)) {
          submittedAtByPassage.set(r.passage_id, r.submitted_at as string);
        }
      }

      for (const p of passages ?? []) {
        if (!p.passage_text) continue;
        items.push({
          id: `hi_naesin:${p.id}`,
          title: p.title,
          body_en: p.passage_text,
          source: 'hi_naesin',
          completed_at: submittedAtByPassage.get(p.id) ?? '',
        });
      }
    }

    items.sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''));

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    console.error('[/api/typing-practice/completed-passages] GET error:', e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
