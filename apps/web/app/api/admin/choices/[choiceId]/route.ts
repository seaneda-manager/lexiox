// apps/web/app/api/admin/choices/[choiceId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ choiceId: string }> }) {
  const { choiceId } = await params;

  const supabase = await getSupabaseServer();
  const body = await req.json();

  const { data, error } = await supabase
    .from('choices')
    .update({
      text: body.text,
      is_correct: !!body.is_correct,
      order_index: body.order_index ?? 0,
    })
    .eq('id', choiceId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ choiceId: string }> }) {
  const { choiceId } = await params;

  const supabase = await getSupabaseServer();
  const { error } = await supabase.from('choices').delete().eq('id', choiceId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
