import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';

export async function GET(
  req: Request,
  { params }: { params: { testId: string } }
) {
  try {
    const testId = params.testId;
    const sb = getServiceSupabase();

    const { data, error } = await sb
      .from('listening_tests_2026')
      .select('id, payload')
      .eq('id', testId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { ok: false, error: '시험을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, payload: data.payload });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
