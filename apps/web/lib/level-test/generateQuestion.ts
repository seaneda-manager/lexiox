import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { logAnthropicUsage } from "@/lib/ai/logAnthropicUsage";
import { getSectionDescriptor, levelLabel, type Track, type SubLevel, type Section } from "./proficiencyLevels";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "placeholder" });

export type GeneratedQuestion = {
  prompt: string;
  passageText: string | null;
  choices: { text: string }[] | null; // null = 서술형(speaking/writing)
  correctIndex: number | null;
};

function buildPrompt(section: Section, track: Track, subLevel: SubLevel, topic: string): string {
  const level = levelLabel(track, subLevel);
  const descriptor = getSectionDescriptor(track, subLevel, section);
  const topicLine = topic.trim() ? `주제/소재: ${topic.trim()}` : "주제/소재는 자유롭게 정하되 학습자에게 흥미로운 것으로.";

  const common = `당신은 영어 레벨 테스트 문제를 만드는 전문 출제자입니다.
대상 레벨: ${level}
이 레벨의 ${section} 영역 기준: ${descriptor}
${topicLine}

반드시 이 레벨 기준에 맞는 난이도로 만드세요 — 너무 쉽거나 어려우면 안 됩니다.
JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.`;

  switch (section) {
    case "grammar":
      return `${common}

문법 객관식 문제 1개를 만드세요. 빈칸이 있는 영어 문장과 4개의 보기, 정답 인덱스, 간단한 한국어 해설을 만드세요.
JSON: {"prompt":"빈칸____이 있는 영어 문장","choices":["보기1","보기2","보기3","보기4"],"correctIndex":0,"explanation":"한국어 해설 1줄"}`;

    case "vocab":
      return `${common}

어휘 객관식 문제 1개를 만드세요. 영어 단어를 실제 문맥(짧은 영어 문장) 속에서 제시하고, 그 단어의 뜻으로 가장 적절한 것을 고르게 하세요. 보기는 한국어 뜻 4개.
JSON: {"prompt":"밑줄 친 단어의 뜻으로 가장 적절한 것은? \\"...문장 속 word...\\"","choices":["뜻1","뜻2","뜻3","뜻4"],"correctIndex":0}`;

    case "reading":
      return `${common}

짧은 영어 지문과 이해도 객관식 문제 1개를 만드세요. 지문 길이와 문장 복잡도는 반드시 이 레벨 기준에 맞추세요.
JSON: {"passageText":"영어 지문 (레벨에 맞는 길이)","prompt":"문제 (예: What is the main idea of the passage?)","choices":["보기1","보기2","보기3","보기4"],"correctIndex":0}`;

    case "speaking":
      return `${common}

말하기 프롬프트 1개를 만드세요 (객관식 아님 — 학생이 이 프롬프트를 보고 영어로 말하며 녹음합니다). 이 레벨 학생이 도전할 만한 주제와, 몇 초 정도 말하면 되는지 한국어로 안내하세요.
JSON: {"prompt":"한국어 안내문 + 영어로 답해야 할 질문/주제. 예: 'oo에 대해 20초 동안 영어로 설명해 보세요: (English prompt)'"}`;

    case "writing":
      return `${common}

쓰기 프롬프트 1개를 만드세요 (서술형 — 학생이 이 프롬프트를 보고 영어로 글을 씁니다). 이 레벨에 맞는 주제와 분량(단어 수)을 한국어로 안내하세요.
JSON: {"prompt":"한국어 안내문 + 영어 작문 주제. 예: '다음 주제에 대해 3~5문장으로 영어로 써 보세요: (English prompt)'"}`;

    default:
      throw new Error(`Unsupported section: ${section}`);
  }
}

export async function generateLevelTestQuestion(
  section: Section,
  track: Track,
  subLevel: SubLevel,
  topic: string,
): Promise<GeneratedQuestion> {
  const prompt = buildPrompt(section, track, subLevel, topic);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });
  void logAnthropicUsage(`level-test/generate:${section}`, "claude-sonnet-4-6", message.usage);

  const raw = (message.content[0] as any).text as string;
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found in Claude response");

  const payload = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

  if (section === "speaking" || section === "writing") {
    return { prompt: payload.prompt, passageText: null, choices: null, correctIndex: null };
  }

  const choices: { text: string }[] = (payload.choices ?? []).map((text: string) => ({ text }));
  // 정답 위치가 항상 첫 보기에 몰리지 않도록 섞는다 (4지선다 정답 분포 규칙).
  const correctText = choices[payload.correctIndex]?.text;
  const shuffled = [...choices].sort(() => Math.random() - 0.5);
  const correctIndex = shuffled.findIndex((c) => c.text === correctText);

  return {
    prompt: payload.prompt,
    passageText: payload.passageText ?? null,
    choices: shuffled,
    correctIndex,
  };
}
