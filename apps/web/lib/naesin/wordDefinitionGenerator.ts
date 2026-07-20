// lib/naesin/wordDefinitionGenerator.ts
// Claude Haiku를 이용해 words 사전에 없는 단어의 품사/뜻을 생성 (사전 자동 확장용)

import Anthropic from "@anthropic-ai/sdk";

export type GeneratedWordDefinition = {
  lemma: string;
  pos: string;
  meaningsKo: string[];
};

type GenerateOk = { ok: true; definition: GeneratedWordDefinition };
type GenerateFail = { ok: false };

const getClient = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseJsonObject<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

type RawResult = {
  lemma?: string;
  pos?: string;
  meanings_ko?: string[];
};

export async function generateWordDefinition(
  surfaceWord: string,
): Promise<GenerateOk | GenerateFail> {
  const word = surfaceWord.trim();
  if (!word) return { ok: false };

  try {
    const client = getClient();

    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You are building a Korean-English dictionary entry for a 내신/TOEFL reading passage vocabulary drill.

Word: "${word}"

Return ONLY a valid JSON object, no markdown fences, no extra text:
{
  "lemma": "base/dictionary form of the word (lowercase)",
  "pos": "one of: noun, verb, adj, adv, prep, conj, pron, determiner, interjection, phrase",
  "meanings_ko": ["가장 흔한 한글 뜻 1-3개, 간결하게"]
}

If "${word}" is not a real English word or is unrecognizable, return {"lemma": "", "pos": "", "meanings_ko": []}.`,
        },
      ],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    const parsed = parseJsonObject<RawResult>(text);

    if (!parsed || !parsed.lemma || !parsed.pos || !parsed.meanings_ko?.length) {
      return { ok: false };
    }

    return {
      ok: true,
      definition: {
        lemma: parsed.lemma.trim().toLowerCase(),
        pos: parsed.pos.trim().toLowerCase(),
        meaningsKo: parsed.meanings_ko.map((m) => m.trim()).filter(Boolean),
      },
    };
  } catch (error) {
    console.error("[generateWordDefinition] error:", error);
    return { ok: false };
  }
}
