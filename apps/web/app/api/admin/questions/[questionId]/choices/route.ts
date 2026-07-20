// apps/web/app/api/admin/questions/[questionId]/choices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

type PostBody = {
  text?: string;
  is_correct?: boolean;
  order_index?: number;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const { questionId } = await params;
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from('choices')
    .select('*')
    .eq('question_id', questionId)
    .order('order_index', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const { questionId } = await params;
  const supabase = await getSupabaseServer();

  const body = (await req.json()) as PostBody;

  const { data, error } = await supabase
    .from('choices')
    .insert({
      question_id: questionId,
      text: body.text,
      is_correct: !!body.is_correct,
      order_index: body.order_index ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
