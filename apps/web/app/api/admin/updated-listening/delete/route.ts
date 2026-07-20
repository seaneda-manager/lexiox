import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: Request) {
  try {
    const { id } = await req.json() as { id: string };

    if (!id?.trim()) {
      return NextResponse.json({ ok: false, error: 'Test ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('listening_tests_2026')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('DELETE TEST ERROR', err);
    return NextResponse.json({ ok: false, error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}
