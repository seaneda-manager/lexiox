import { NextResponse } from 'next/server';
import { TOEFL_DICTIONARY } from '@/lib/dictionary/words';
import { getServiceRoleClient } from '@/lib/supabase/server';
import { Anthropic } from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const word = searchParams.get('word');

  if (!word) {
    return NextResponse.json(
      { error: 'word parameter is required' },
      { status: 400 }
    );
  }

  const lowerWord = word.toLowerCase();

  // 1. 사전에 있으면 반환
  if (TOEFL_DICTIONARY[lowerWord]) {
    return NextResponse.json({
      word,
      meaning: TOEFL_DICTIONARY[lowerWord],
      source: 'dictionary',
    });
  }

  // 2. 없으면 AI로 생성
  try {
    const message = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: `영어 단어 "${word}"의 한글 뜻을 간단하게 1-2줄로 설명해주세요. 품사도 포함해주세요. 예: "rapid (형용사): 빠른, 신속한"`,
        },
      ],
    });

    const meaning =
      message.content[0]?.type === 'text' ? message.content[0].text : '뜻을 찾을 수 없습니다';

    // 3. Supabase에 저장 (백그라운드)
    try {
      const supabase = getServiceRoleClient();
      await supabase.from('custom_words').insert({
        word: lowerWord,
        meaning,
        source: 'ai',
        created_at: new Date().toISOString(),
      });
    } catch (dbError) {
      console.warn('Failed to save word to database:', dbError);
      // 실패해도 계속 진행 (사용자에게는 뜻을 반환함)
    }

    return NextResponse.json({
      word,
      meaning,
      source: 'ai',
    });
  } catch (error) {
    console.error('Error generating meaning:', error);
    return NextResponse.json(
      { error: 'Failed to generate meaning' },
      { status: 500 }
    );
  }
}
