/**
 * Complete Words 자동 생성 엔진
 * - 지문 → 10개 단어 선택 → blanks 배열 생성
 * - ETS 패턴 준수 (70-120 단어, 품사 비율 70/30)
 */

import Anthropic from "@anthropic-ai/sdk";

interface BlankItem {
  order: number;
  word: string;
  visible: string;
  hidden: string;
  correctToken: string;
  partOfSpeech: string;
}

interface GenerateCompleteWordsRequest {
  passage: string; // 원문 지문
  topic: string;
  difficulty: "easy" | "core" | "hard";
}

interface GenerateCompleteWordsResponse {
  id: string;
  topic: string;
  difficulty: string;
  passage: string;
  blanks: BlankItem[];
  metadata?: {
    sentenceCount: number;
    wordCount: number;
    contentWordRatio: number;
  };
}

/**
 * Claude AI를 사용해 Complete Words 문제 생성
 */
export async function generateCompleteWordsWithAI(
  req: GenerateCompleteWordsRequest
): Promise<GenerateCompleteWordsResponse> {
  const client = new Anthropic();

  const systemPrompt = `당신은 TOEFL 시험의 "Complete Words" 문제 출제 전문가입니다.

주어진 지문에서 정확히 10개의 단어를 선택하여 다음 규칙을 따르는 JSON을 생성하세요:

## COMPLETE WORDS 규칙 (필수):

1. **정확히 10개의 blanks**
   - 가변 개수 금지 (반드시 10개)

2. **지문 요구사항**
   - 단어 수: 70~120개
   - 문장 수: 3~4개

3. **단어 선택**
   - 내용어 (70%): 명사 > 동사 > 형용사 > 부사
   - 기능어 (30%): is, the, from, to, by, in 등
   - 동일 단어 중복 없음

4. **문장별 분배**
   - 첫 문장: 0~2개
   - 중간 문장: 각각 최대 5개
   - 마지막 문장: 2~5개
   - 총 최대 5개/문장

5. **앞부분 표시 (visible) 규칙**
   - 2~3글자: 1글자 표시 (is → i)
   - 4~6글자: 2~3글자 표시 (from → fr, people → peo)
   - 7~9글자: 3글자 표시 (record → rec)
   - 10글자 이상: 3~4글자 표시 (However → How)

   **검증**: visible 글자로 시작하는 같은 길이 단어가 3개 이하여야 함

## JSON 형식 (필수):

\`\`\`json
{
  "blanks": [
    {
      "order": 1,
      "word": "people",
      "visible": "peo",
      "hidden": "ple",
      "partOfSpeech": "noun"
    },
    ...
  ]
}
\`\`\`

## 체크리스트:
- [ ] 정확히 10개의 blank
- [ ] 70~120단어 지문
- [ ] 중복 단어 없음
- [ ] 내용어 70%, 기능어 30%
- [ ] 각 문장 ≤5개
- [ ] visible 후보 ≤3개
- [ ] 첫 문장 0~2개
- [ ] 마지막 문장 2~5개`;

  const userPrompt = `다음 지문으로 Complete Words 문제를 생성하세요:

지문:
"""
${req.passage}
"""

난이도: ${req.difficulty}
주제: ${req.topic}

JSON만 반환하세요 (설명 없음).`;

  try {
    const message = await client.messages.create({
      model: "claude-opus-5-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    // JSON 추출
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // 검증
    if (!Array.isArray(parsed.blanks) || parsed.blanks.length !== 10) {
      throw new Error(`Expected 10 blanks, got ${parsed.blanks.length}`);
    }

    // 응답 구성
    return {
      id: `cw-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      topic: req.topic,
      difficulty: req.difficulty,
      passage: req.passage,
      blanks: parsed.blanks.map((b: any, idx: number) => ({
        order: idx + 1,
        word: b.word,
        visible: b.visible,
        hidden: b.hidden,
        correctToken: b.hidden, // hidden이 정답
        partOfSpeech: b.partOfSpeech || "unknown",
      })),
      metadata: {
        sentenceCount: (req.passage.match(/[.!?]/g) || []).length,
        wordCount: req.passage.split(/\s+/).length,
        contentWordRatio: 70,
      },
    };
  } catch (error) {
    console.error("[generateCompleteWordsWithAI] Error:", error);
    throw error;
  }
}

/**
 * 단순 검증 (별도로 필요시 사용)
 */
export function validateCompleteWords(response: GenerateCompleteWordsResponse): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 정확히 10개
  if (response.blanks.length !== 10) {
    errors.push(`Expected 10 blanks, got ${response.blanks.length}`);
  }

  // 단어 수
  const wordCount = response.passage.split(/\s+/).length;
  if (wordCount < 70 || wordCount > 120) {
    errors.push(`Word count ${wordCount} not in range [70, 120]`);
  }

  // 중복 검사
  const words = new Set(response.blanks.map(b => b.word.toLowerCase()));
  if (words.size !== response.blanks.length) {
    errors.push("Duplicate words detected");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
