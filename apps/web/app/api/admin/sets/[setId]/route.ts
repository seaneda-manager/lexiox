// apps/web/app/(protected)/admin/sets/[setId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
// DbContentSetInput 별칭으로 사용
import type { DbContentSetInput as ContentSetInput } from '@/app/types/types-cms';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ setId: string }> }
) {
  const { setId } = await params;

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('content_sets')
    .select('*')
    .eq('id', setId)
    .eq('owner_id', user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ setId: string }> }
) {
  const { setId } = await params;

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json()) as ContentSetInput;

  const { data, error } = await supabase
    .from('content_sets')
    .update({
      title: body.title,
      section: body.section,
      level: body.level ?? null,
      tags: body.tags ?? [],
      description: body.description ?? null,
      is_published: !!body.is_published,
    })
    .eq('id', setId)
    .eq('owner_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ setId: string }> }
) {
  // method override: multipart/form-data 에서만 처리
  const fd = await req.formData().catch(() => null);
  if (fd?.get('_method') === 'DELETE') {
    return DELETE(req, ctx);
  }
  return NextResponse.json({ error: 'unsupported' }, { status: 400 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ setId: string }> }
) {
  const { setId } = await params;

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('content_sets')
    .delete()
    .eq('id', setId)
    .eq('owner_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
