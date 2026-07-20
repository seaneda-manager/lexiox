// apps/web/app/api/admin/passages/[passageId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

type PatchBody = {
  title?: string;
  content?: string | null;
  order_index?: number;
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ passageId: string }> }) {
  const { passageId } = await params;
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from('passages')
    .select('*')
    .eq('id', passageId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ passageId: string }> }) {
  const { passageId } = await params;
  const supabase = await getSupabaseServer();

  const body = (await req.json()) as PatchBody;

  const { data, error } = await supabase
    .from('passages')
    .update({
      title: body.title,
      content: body.content ?? null,
      order_index: body.order_index ?? 0,
    })
    .eq('id', passageId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ passageId: string }> }) {
  const { passageId } = await params;
  const supabase = await getSupabaseServer();

  const { error } = await supabase.from('passages').delete().eq('id', passageId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
