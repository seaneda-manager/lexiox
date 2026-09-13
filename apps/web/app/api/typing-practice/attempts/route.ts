import { NextResponse } from 'next/server';
import { getServerSupabase, getServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type AttemptBody = {
  contentId: string | null;
  contentRef?: string | null;
  contentSource: 'vocab' | 'content' | 'completed';
  revealMode: 'full' | 'partial' | 'blind';
  shuffled: boolean;
  strict: boolean;
  wpm: number;
  accuracy: number;
  errorCount: number;
  durationSec: number;
  weakWords: string[];
};

/**
 * POST /api/typing-practice/attempts
 * Persists one typing-practice session's aggregate metrics for the current student.
 */
export async function POST(req: Request) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as AttemptBody;

    const admin = getServiceRoleClient();
    const { error } = await admin.from('typing_practice_attempts').insert({
      student_id: user.id,
      content_id: body.contentId,
      content_ref: body.contentRef ?? null,
      content_source: body.contentSource,
      reveal_mode: body.revealMode,
      shuffled: body.shuffled,
      strict: body.strict,
      wpm: body.wpm,
      accuracy: body.accuracy,
      error_count: body.errorCount,
      duration_sec: body.durationSec,
      weak_words: body.weakWords ?? [],
    } as any);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[/api/typing-practice/attempts] POST error:', e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
