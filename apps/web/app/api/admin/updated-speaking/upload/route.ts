import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const folder = (form.get('folder') as string | null) ?? 'speaking-assets';

    if (!file) {
      return NextResponse.json({ ok: false, error: 'file required' }, { status: 400 });
    }

    const ext = file.name.split('.').pop() ?? 'bin';
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const supabase = getServiceSupabase();
    const { error } = await supabase.storage
      .from('speaking-assets')
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('speaking-assets')
      .getPublicUrl(path);

    return NextResponse.json({ ok: true, url: publicUrl, path });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
