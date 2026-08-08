export const dynamic = 'force-dynamic';

import { Anthropic } from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: Request) {
  try {
    const { passage, question, choices } = await req.json();

    if (!passage || !question || !choices || choices.length === 0) {
      return Response.json(
        { error: "passage, question, choices are required" },
        { status: 400 }
      );
    }

    const prompt = `지문(passage)과 문제(question), 선택지(choices)가 주어졌습니다.
각 선택지의 문법 구조와 의미를 "직독직해" 스타일로 분석해주세요.

지문:
${passage}

문제: ${question}

선택지:
${choices.map((c: any, i: number) => `${String.fromCharCode(65 + i)}. ${c.text}`).join("\n")}

각 선택지를 문법 구조에 따라 직독직해하고, 해당 표현의 의미를 간결하게 설명해주세요.
- 문법 구조 살리기 (주어+동사, 수식어 등)
- 직독직해 방식으로 단계적 해석
- 핵심 의미만 간단히 (1-2문장)
- 선생님 검수용이므로 정확도 중시

응답 형식:
A. [직독직해 분석]
B. [직독직해 분석]
C. [직독직해 분석]
D. [직독직해 분석]`;

    const message = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse response: "A. explanation\nB. explanation\nC. explanation\nD. explanation"
    const explanations: string[] = [];
    const lines = responseText.split("\n").filter((l) => l.trim());

    for (const line of lines) {
      const match = line.match(/^[A-Z]\.\s*(.+)/);
      if (match) {
        explanations.push(match[1].trim());
      }
    }

    // 만약 파싱 실패했으면 각 선택지마다 하나씩 할당
    if (explanations.length === 0) {
      return Response.json(
        { error: "Failed to parse AI response", response: responseText },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      explanations: explanations.slice(0, choices.length),
    });
  } catch (e: any) {
    console.error("Generate explanations error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
