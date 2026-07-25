import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';

export async function POST(req: Request) {
  try {
    const { test } = await req.json();
    if (!test?.meta?.id) {
      return NextResponse.json({ ok: false, error: 'Missing test payload' }, { status: 400 });
    }

    const sb = getServiceSupabase();

    const { data: existing } = await sb
      .from('listening_tests_2026')
      .select('id, is_locked')
      .eq('id', test.meta.id)
      .maybeSingle();

    if (existing?.is_locked) {
      return NextResponse.json({ ok: false, error: '이 시험은 Lock되어 수정할 수 없습니다.' }, { status: 403 });
    }

    const row: any = {
      id: test.meta.id,
      label: test.meta.label,
      exam_era: test.meta.examEra ?? 'ibt_2026',
      payload: test,
    };

    // 주제가 저장된 경우 추가 필드에도 저장 (선택사항)
    if (test.meta.conversationTopic) row.conversation_topic = test.meta.conversationTopic;
    if (test.meta.lectureTopic) row.lecture_topic = test.meta.lectureTopic;
    if (test.meta.campusTopic) row.campus_topic = test.meta.campusTopic;

    const { error } = existing
      ? await sb.from('listening_tests_2026').update(row).eq('id', test.meta.id)
      : await sb.from('listening_tests_2026').insert(row);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
