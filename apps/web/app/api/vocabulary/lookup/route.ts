export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { words } = await req.json();

    if (!words || !Array.isArray(words) || words.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No words provided' },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();

    // vocabulary 테이블에서 단어 조회
    const { data, error } = await supabase
      .from('vocabulary')
      .select('word, pos, meaning, example')
      .in('word', words.map((w: string) => w.toLowerCase()));

    if (error) {
      console.error('Error looking up vocabulary:', error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    // 결과를 word별로 맵으로 변환
    const vocabularyMap: Record<string, any> = {};
    (data || []).forEach((item: any) => {
      vocabularyMap[item.word] = {
        pos: item.pos || 'n.',
        meaning: item.meaning || '[뜻 없음]',
        example: item.example || '',
      };
    });

    return NextResponse.json({
      ok: true,
      vocabulary: vocabularyMap,
    });
  } catch (err: any) {
    console.error('[vocabulary/lookup] error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
