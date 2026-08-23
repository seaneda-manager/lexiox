#!/usr/bin/env node

/**
 * 레벨 테스트 문제은행 초기 시딩 (트랙 지정).
 * grammar/vocab/reading × 해당 트랙의 전체 단계 각 1문항 + speaking/writing(중급) 각 1문항.
 *
 * lib/level-test/generateQuestion.ts, lib/supabase/service.ts는 `import "server-only"`가 있어
 * 이 standalone 스크립트에서 직접 import할 수 없다 (Next 서버 컨텍스트 밖에서는 무조건 throw).
 * 그래서 같은 프롬프트/삽입 로직을 여기에 인라인으로 복제했다 — 원본 로직이 바뀌면 이 스크립트도 같이 봐야 함.
 *
 * Usage:
 * npx tsx scripts/seed-level-test.ts toefl
 * npx tsx scripts/seed-level-test.ts jr
 */

import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { getSectionDescriptor, levelLabel, TRACK_LEVELS, type Track, type Section, type SubLevel } from "../lib/level-test/proficiencyLevels";

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const idx = line.indexOf("=");
      if (idx === -1) return;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !key.startsWith("#")) process.env[key] = value;
    });
  }
}

loadEnv();

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "",
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

const CHOICE_IDS = ["a", "b", "c", "d", "e"];

// generate-speech.ts는 ELEVENLABS_API_KEY를 모듈 top-level에서 읽으므로, loadEnv() 이후
// 동적 import로 불러와야 한다 (정적 import는 loadEnv()보다 먼저 평가되어 빈 키를 캡처함).
let generateSpeech: typeof import("../lib/elevenlabs/generate-speech").generateSpeech;

type GeneratedQuestion = {
  prompt: string;
  passageText: string | null;
  choices: { text: string }[] | null;
  correctIndex: number | null;
  audioUrl?: string | null;
  topicLabel: string | null;
};

// lib/level-test/generateQuestion.ts의 buildPrompt/generateLevelTestQuestion을 그대로 복제.
function buildPrompt(track: Track, section: Section, subLevel: SubLevel, topic: string, avoidTopics: string[]): string {
  const level = levelLabel(track, subLevel);
  const descriptor = getSectionDescriptor(track, subLevel, section);
  const topicLine = topic.trim() ? `주제/소재: ${topic.trim()}` : "주제/소재는 자유롭게 정하되 학습자에게 흥미로운 것으로.";
  const avoidLine = avoidTopics.length > 0
    ? `\n이미 사용된 주제들이니 반드시 피하세요 (같은 소재나 인물, 이론을 다시 쓰지 마세요): ${avoidTopics.join(", ")}`
    : "";

  const common = `당신은 영어 레벨 테스트 문제를 만드는 전문 출제자입니다.
대상 레벨: ${level}
이 레벨의 ${section} 영역 기준: ${descriptor}
${topicLine}${avoidLine}

반드시 이 레벨 기준에 맞는 난이도로 만드세요 — 너무 쉽거나 어려우면 안 됩니다.
JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.
JSON에는 항상 "topicLabel" 필드를 포함하세요 — 이 문항의 소재/주제를 3~6단어의 짧은 한국어 라벨로 요약한 것.`;

  switch (section) {
    case "grammar":
      return `${common}\n\n문법 객관식 문제 1개를 만드세요. 빈칸이 있는 영어 문장과 4개의 보기, 정답 인덱스, 간단한 한국어 해설을 만드세요.\nJSON: {"prompt":"빈칸____이 있는 영어 문장","choices":["보기1","보기2","보기3","보기4"],"correctIndex":0,"explanation":"한국어 해설 1줄","topicLabel":"짧은 라벨"}`;
    case "vocab":
      return `${common}\n\n어휘 객관식 문제 1개를 만드세요. 영어 단어를 실제 문맥(짧은 영어 문장) 속에서 제시하고, 그 단어의 뜻으로 가장 적절한 것을 고르게 하세요. 보기는 한국어 뜻 4개.\nJSON: {"prompt":"밑줄 친 단어의 뜻으로 가장 적절한 것은? \\"...문장 속 word...\\"","choices":["뜻1","뜻2","뜻3","뜻4"],"correctIndex":0,"topicLabel":"짧은 라벨 (테스트하는 단어)"}`;
    case "reading":
      return `${common}\n\n짧은 영어 지문과 이해도 객관식 문제 1개를 만드세요. 지문 길이와 문장 복잡도는 반드시 이 레벨 기준에 맞추세요.\nJSON: {"passageText":"영어 지문 (레벨에 맞는 길이)","prompt":"문제 (예: What is the main idea of the passage?)","choices":["보기1","보기2","보기3","보기4"],"correctIndex":0,"topicLabel":"짧은 라벨"}`;
    case "listening":
      return `${common}\n\nTTS(음성 합성)로 읽힐 영어 대본과 이해도 객관식 문제 1개를 만드세요. 대본은 한 명의 화자가 말하는 안내방송/짧은 강의/이야기 형식으로, 자연스러운 구어체로 쓰고 실제로 소리 내어 읽었을 때 어색하지 않아야 합니다. 길이와 문장 복잡도는 반드시 이 레벨 기준에 맞추세요.\nJSON: {"script":"TTS로 읽을 영어 대본 (레벨에 맞는 길이, 구어체)","prompt":"문제 (예: What is the speaker mainly talking about?)","choices":["보기1","보기2","보기3","보기4"],"correctIndex":0,"topicLabel":"짧은 라벨"}`;
    case "speaking":
      return `${common}\n\n말하기 프롬프트 1개를 만드세요 (객관식 아님 — 학생이 이 프롬프트를 보고 영어로 말하며 녹음합니다). 이 레벨 학생이 도전할 만한 주제와, 몇 초 정도 말하면 되는지 한국어로 안내하세요.\nJSON: {"prompt":"한국어 안내문 + 영어로 답해야 할 질문/주제. 예: 'oo에 대해 20초 동안 영어로 설명해 보세요: (English prompt)'","topicLabel":"짧은 라벨"}`;
    case "writing":
      return `${common}\n\n쓰기 프롬프트 1개를 만드세요 (서술형 — 학생이 이 프롬프트를 보고 영어로 글을 씁니다). 이 레벨에 맞는 주제와 분량(단어 수)을 한국어로 안내하세요.\nJSON: {"prompt":"한국어 안내문 + 영어 작문 주제. 예: '다음 주제에 대해 3~5문장으로 영어로 써 보세요: (English prompt)'","topicLabel":"짧은 라벨"}`;
    default:
      throw new Error(`Unsupported section: ${section}`);
  }
}

async function generateLevelTestQuestion(track: Track, section: Section, subLevel: SubLevel, avoidTopics: string[]): Promise<GeneratedQuestion> {
  const prompt = buildPrompt(track, section, subLevel, "", avoidTopics);
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });
  const raw = (message.content[0] as any).text as string;
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found in Claude response");
  const payload = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

  const topicLabel: string | null = payload.topicLabel ?? null;

  if (section === "speaking" || section === "writing") {
    return { prompt: payload.prompt, passageText: null, choices: null, correctIndex: null, topicLabel };
  }

  const choices: { text: string }[] = (payload.choices ?? []).map((text: string) => ({ text }));
  const correctText = choices[payload.correctIndex]?.text;
  const shuffled = [...choices].sort(() => Math.random() - 0.5);
  const correctIndex = shuffled.findIndex((c) => c.text === correctText);

  if (section === "listening") {
    const { url } = await generateSpeech(payload.script, { voiceIndex: Math.floor(Math.random() * 8) });
    return { prompt: payload.prompt, passageText: null, choices: shuffled, correctIndex, audioUrl: url, topicLabel };
  }

  return { prompt: payload.prompt, passageText: payload.passageText ?? null, choices: shuffled, correctIndex, topicLabel };
}

async function main() {
  const track = process.argv[2] as Track | undefined;
  if (!track || !TRACK_LEVELS[track]) {
    throw new Error(`Usage: npx tsx scripts/seed-level-test.ts <jr|middle|high|toefl> (got: ${track ?? "(none)"})`);
  }
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Missing env: ANTHROPIC_API_KEY");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
  if (!process.env.ELEVENLABS_API_KEY) throw new Error("Missing env: ELEVENLABS_API_KEY");
  ({ generateSpeech } = await import("../lib/elevenlabs/generate-speech"));

  const levels = TRACK_LEVELS[track];
  const scoredJobs: { section: "grammar" | "vocab" | "reading" | "listening"; subLevel: SubLevel }[] = [];
  for (const section of ["grammar", "vocab", "reading", "listening"] as const) {
    for (const subLevel of levels) {
      scoredJobs.push({ section, subLevel });
    }
  }
  const openJobs: { section: "speaking" | "writing"; subLevel: SubLevel }[] = [
    { section: "speaking", subLevel: "mid" },
    { section: "writing", subLevel: "mid" },
  ];

  let ok = 0;
  let failed = 0;
  let skipped = 0;

  for (const job of [...scoredJobs, ...openJobs]) {
    const label = `${track}/${job.subLevel}/${job.section}`;
    try {
      const { count } = await svc
        .from("level_test_questions")
        .select("id", { count: "exact", head: true })
        .eq("track", track)
        .eq("section", job.section)
        .eq("sub_level", job.subLevel)
        .eq("generated_by_ai", true);
      if (count && count > 0) {
        console.log(`⏭️  ${label}: 이미 존재, 건너뜀`);
        skipped += 1;
        continue;
      }

      const { data: avoidRows } = await svc
        .from("level_test_questions")
        .select("topic_label")
        .eq("track", track)
        .eq("section", job.section)
        .not("topic_label", "is", null)
        .order("created_at", { ascending: false })
        .limit(30);
      const avoidTopics = [...new Set((avoidRows ?? []).map((r) => r.topic_label as string))];

      const q = await generateLevelTestQuestion(track, job.section, job.subLevel, avoidTopics);

      const { data: existing } = await svc
        .from("level_test_questions")
        .select("order_index")
        .eq("section", job.section)
        .order("order_index", { ascending: false })
        .limit(1);
      const nextOrder = ((existing ?? [])[0]?.order_index ?? 0) + 1;

      const isOpenResponse = job.section === "speaking" || job.section === "writing";
      const choicesPayload = isOpenResponse || !q.choices ? null : q.choices.map((c, i) => ({ id: CHOICE_IDS[i], text: c.text }));
      const correctChoiceId = isOpenResponse || q.correctIndex == null ? null : CHOICE_IDS[q.correctIndex] ?? null;

      const { error } = await svc.from("level_test_questions").insert({
        section: job.section,
        order_index: nextOrder,
        prompt: q.prompt,
        passage_text: q.passageText,
        audio_url: q.audioUrl ?? null,
        choices: choicesPayload,
        correct_choice_id: correctChoiceId,
        track,
        sub_level: job.subLevel,
        generated_by_ai: true,
        topic_label: q.topicLabel,
        is_active: true,
      });
      if (error) throw new Error(error.message);

      console.log(`✅ ${label} [${q.topicLabel ?? "-"}]: ${q.prompt.slice(0, 60)}${q.prompt.length > 60 ? "…" : ""}`);
      ok += 1;
    } catch (e: any) {
      console.error(`❌ ${label}: ${e?.message ?? e}`);
      failed += 1;
    }
  }

  console.log(`\n완료: ${ok}개 성공, ${skipped}개 건너뜀, ${failed}개 실패`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
