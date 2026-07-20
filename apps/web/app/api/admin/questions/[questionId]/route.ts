// apps/web/app/api/admin/questions/[questionId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

type PatchBody = {
  number?: number;
  type?: string;
  stem?: string;
  explanation?: string | null;
  clue_quote?: string | null;
  order_index?: number;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const { questionId } = await params;
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('id', questionId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const { questionId } = await params;
  const supabase = await getSupabaseServer();
  const body = (await req.json()) as PatchBody;

  const { data, error } = await supabase
    .from('questions')
    .update({
      number: body.number ?? 0,
      type: body.type,
      stem: body.stem,
      explanation: body.explanation ?? null,
      clue_quote: body.clue_quote ?? null,
      order_index: body.order_index ?? 0,
    })
    .eq('id', questionId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const { questionId } = await params;
  const supabase = await getSupabaseServer();

  const { error } = await supabase.from('questions').delete().eq('id', questionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
