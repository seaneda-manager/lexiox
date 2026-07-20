import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, english_passage, difficulty, level, textbook } = body;

    if (!english_passage) {
      return NextResponse.json(
        { error: '영문 지문이 필요합니다' },
        { status: 400 }
      );
    }

    // Mock AI generation (placeholder)
    const mockVocabulary = generateMockVocabulary(english_passage);
    const mockJikdok = generateMockJikdok(english_passage);
    const mockKeySentences = generateMockKeySentences(english_passage);
    const mockQuestions = generateMockQuestions();

    return NextResponse.json({
      id: Date.now().toString(),
      title: title || 'Untitled Reading',
      english_passage,
      difficulty,
      level,
      textbook,
      translation: {
        full_text: mockTranslate(english_passage),
      },
      vocabulary: mockVocabulary,
      jikdok_jihae_base: mockJikdok,
      key_sentences: mockKeySentences,
      comprehension_questions: mockQuestions,
      status: 'AWAITING_REVIEW',
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Reading Generation Error]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Mock functions
function generateMockVocabulary(text: string) {
  const words = text.match(/\b[a-z]+\b/gi) || [];
  const unique = [...new Set(words.slice(0, 15))];

  return unique.map((word) => ({
    word: word.toLowerCase(),
    pos: getRandomPOS(),
    meaning: `${word}의 한글 의미`,
    interpretation_tip: '어원이나 용법 팁',
    example: `Example sentence with ${word}.`,
  }));
}

function generateMockJikdok(text: string) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  return sentences.slice(0, 3).map((sent) => ({
    text: sent
      .trim()
      .split(/,|;/)
      .join(' / ')
      .substring(0, 200),
  }));
}

function generateMockKeySentences(text: string) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  return sentences.slice(0, 3).map((english, i) => ({
    sentence_id: i + 1,
    english: english.trim(),
    translation: `이 문장의 한글 의역입니다.`,
    sentence_type: ['단문', '중문', '복문'][i % 3],
    conjunction: i === 2 ? 'because' : undefined,
    structure_analysis: {
      s: 'Subject',
      v: 'Verb',
      o: 'Object (optional)',
      modifiers: ['PP', 'Participle'],
      clauses: ['Relative clause (adj)'],
    },
    simple_version: `Simplified version of key sentence ${i + 1}`,
  }));
}

function generateMockQuestions() {
  return [
    {
      type: 'main_idea',
      question: '이 지문의 주제는?',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correct_answer: 'Option A',
      explanation: '이것이 정답인 이유 설명',
    },
    {
      type: 'inference',
      question: '저자가 암시하는 것은?',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correct_answer: 'Option B',
      explanation: '이것이 정답인 이유 설명',
    },
    {
      type: 'vocabulary',
      question: '"~"가 의미하는 것은?',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correct_answer: 'Option C',
      explanation: '이것이 정답인 이유 설명',
    },
  ];
}

function mockTranslate(text: string): string {
  return `이것은 "${text.substring(0, 50)}..."의 한글 번역입니다. 실제 Claude API 연동 후 정확한 해석이 생성됩니다.`;
}

function getRandomPOS(): string {
  const pos = ['명사', '동사', '형용사', '부사', '전치사'];
  return pos[Math.floor(Math.random() * pos.length)];
}
