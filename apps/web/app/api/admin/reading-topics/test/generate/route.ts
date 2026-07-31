import { NextResponse } from 'next/server';

const SAMPLE_PASSAGES = {
  complete_words: {
    topic: 'Photosynthesis',
    type: 'complete_words',
    difficulty: 'medium',
    content: 'Photosynthesis is one of the most important biological processes on Earth. The process of photosynthesis, which occurs in the chloroplast and involves both light-dependent and light-independent reactions, converts water and carbon dioxide into glucose and oxygen through a complex series of chemical reactions where chlorophyll molecules absorb light energy. Plants transfer electrons through the electron transport chain and the Calvin cycle uses ATP and NADPH to synthesize glucose, making this metabolic process essential for nearly all life on Earth. This process sustains virtually all ecosystems and produces the oxygen we breathe.',
  },
  daily_life_short: {
    topic: 'Library Hours',
    type: 'daily_life_short',
    difficulty: 'easy',
    content: 'LIBRARY OPERATING HOURS\n\nMonday - Friday: 8:00 AM - 10:00 PM\nSaturday: 9:00 AM - 8:00 PM\nSunday: 10:00 AM - 6:00 PM\n\nClosed on national holidays.',
  },
  daily_life_long: {
    topic: 'Coffee Order',
    type: 'daily_life_long',
    difficulty: 'medium',
    content: 'Subject: Coffee Order for Office\n\nFrom: sarah@company.com\nTo: orders@coffeeshop.com\nDate: Monday, 9:00 AM\n\nHello,\n\nI would like to order coffee for our office meeting:\n- 10 cups of espresso\n- 5 cups of cappuccino\n- 3 cups of latte\n\nPlease deliver by 2:00 PM today.\n\nThank you!\nSarah',
  },
  academic_passage: {
    topic: 'Climate Change Effects',
    type: 'academic_passage',
    difficulty: 'hard',
    content: 'Climate change represents one of the most significant environmental challenges of our time, with far-reaching consequences for ecosystems and human societies alike. Rising global temperatures have led to observable shifts in weather patterns, melting of polar ice, and rising sea levels. These phenomena are not merely isolated environmental concerns but interconnected processes that influence biodiversity, agriculture, and resource availability.\n\nThe primary driver of contemporary climate change is the accumulation of greenhouse gases in the atmosphere, particularly carbon dioxide from fossil fuel combustion. This mechanism, understood through the greenhouse effect, allows solar radiation to enter the atmosphere while trapping heat energy. The resulting temperature increase triggers cascading effects throughout natural systems.\n\nMitigation and adaptation strategies have become essential for societies to address climate change impacts. Transitioning to renewable energy sources, implementing sustainable agricultural practices, and developing climate-resilient infrastructure represent pathways toward environmental stability. International cooperation and policy frameworks provide the necessary structure for coordinated global response.',
  },
};

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'generate_samples') {
      return NextResponse.json({
        ok: true,
        passages: SAMPLE_PASSAGES,
        message: '4가지 유형의 샘플 지문이 생성되었습니다.',
      });
    }

    if (action === 'reset') {
      return NextResponse.json({
        ok: true,
        message: 'Test 데이터가 초기화되었습니다.',
      });
    }

    return NextResponse.json(
      { ok: false, error: 'Unknown action' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('[/api/admin/reading-topics/test/generate] error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
