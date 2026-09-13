import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/typing-practice/content       -> list (id, title, source_type only)
 * GET /api/typing-practice/content?id=.. -> single record with full body text
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const { data, error } = await supabase
        .from('typing_practice_content')
        .select('id, title, source_type, body_en, body_ko')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

      return NextResponse.json({ ok: true, content: data });
    }

    const { data, error } = await supabase
      .from('typing_practice_content')
      .select('id, title, source_type, tags, difficulty, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    return NextResponse.json({ ok: true, items: data ?? [] });
  } catch (e: any) {
    console.error('[/api/typing-practice/content] GET error:', e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
