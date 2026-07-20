import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';

export async function GET(req: Request) {
  try {
    const sb = getServiceSupabase();

    // Get all unlocked tests (available for students)
    const { data, error } = await sb
      .from('listening_tests_2026')
      .select('id, label, is_locked, updated_at')
      .eq('is_locked', false)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      tests: data || [],
    });
  } catch (err: any) {
    console.error('Error fetching listening tests:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
