// lib/hi-naesin/passage-analyzer.ts
// Claude Sonnet을 이용한 지문 분석 (문법, 단어, 연결어, 빈칸추론)

import Anthropic from '@anthropic-ai/sdk';

export type GrammarItem = {
  highlight: string;   // 지문에서 해당 구문
  label: string;       // 문법 요소 이름 (e.g. "관계대명사 that")
  explanation: string; // 한국어 설명
};

export type VocabItem = {
  word: string;
  pos: string;         // 품사
  meaning: string;     // 한국어 뜻
  explanation: string; // 문맥 설명
};

export type ConnectorItem = {
  highlight: string;   // 연결어 원문
  type: string;        // 유형 (e.g. "역접", "인과", "예시")
  reason: string;      // 왜 이 연결어인지 설명
};

export type BlankItem = {
  highlight: string;   // 빈칸으로 나올 수 있는 구문
  why: string;         // 왜 빈칸추론 포인트인지
  hint: string;        // 풀이 힌트
};

export type PassageAnalysis = {
  grammar: GrammarItem[];
  vocab: VocabItem[];
  connectors: ConnectorItem[];
  blanks: BlankItem[];
};

const getClient = () =>
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseJson<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]) as T; } catch { return null; }
}

export async function analyzePassage(passageText: string): Promise<PassageAnalysis | null> {
  const client = getClient();

  const prompt = `You are an expert Korean high school English teacher. Analyze the following English passage and return a JSON object with exactly these 4 keys:

"grammar": array of grammar points students should study. For each:
  - highlight: the exact phrase from the passage (keep it short, 2-10 words)
  - label: grammar element name in Korean (e.g. "분사구문", "관계대명사 which", "가정법 과거")
  - explanation: clear Korean explanation of why/how this grammar works here (2-3 sentences)

"vocab": array of 5-8 key vocabulary words. For each:
  - word: the word as it appears in the passage
  - pos: part of speech in Korean (명사/동사/형용사/부사/etc)
  - meaning: Korean definition
  - explanation: how it's used in this context (1-2 sentences in Korean)

"connectors": array of ALL connective words/phrases (however, therefore, for example, in addition, etc). For each:
  - highlight: exact connective word/phrase from passage
  - type: connector type in Korean (역접/인과/예시/첨가/대조/결론/etc)
  - reason: Korean explanation of why this connector is used here and what it connects (2 sentences)

"blanks": array of 3-5 phrases most likely to appear as blank inference (빈칸추론) questions in Korean exams. For each:
  - highlight: exact phrase from the passage that could become a blank
  - why: Korean explanation of why this is a likely blank inference target
  - hint: how a student should approach finding the answer (Korean, 2 sentences)

Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.

PASSAGE:
${passageText}`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const parsed = parseJson<PassageAnalysis>(text);
    if (!parsed) return null;

    return {
      grammar: parsed.grammar ?? [],
      vocab: parsed.vocab ?? [],
      connectors: parsed.connectors ?? [],
      blanks: parsed.blanks ?? [],
    };
  } catch {
    return null;
  }
}
