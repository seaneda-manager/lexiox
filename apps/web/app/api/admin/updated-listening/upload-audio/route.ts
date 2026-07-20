import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const testId = formData.get('testId') as string;
    const trackId = formData.get('trackId') as string;
    const file = formData.get('file') as File;

    if (!testId || !trackId || !file) {
      return NextResponse.json(
        { ok: false, error: 'testId, trackId, and file required' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `listening/${testId}/${trackId}.mp3`;

    const { error } = await supabase.storage
      .from('content')
      .upload(fileName, buffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from('content')
      .getPublicUrl(fileName);

    return NextResponse.json({ ok: true, audioUrl: data.publicUrl });
  } catch (err: any) {
    console.error('AUDIO UPLOAD ERROR', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
