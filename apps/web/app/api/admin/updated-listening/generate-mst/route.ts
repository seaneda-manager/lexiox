// apps/web/app/api/admin/updated-listening/generate-mst/route.ts
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ElevenLabsClient } from "elevenlabs";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 300;

const client = new Anthropic();
const elevenlabs = new ElevenLabsClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

function getRandomVoiceId(): string {
  try {
    const voicePool = JSON.parse(process.env.VOICE_POOL || '{}') as Record<string, string[]>;
    const random = Math.random() * 100;

    let selectedCountry: string;
    if (random < 60) {
      selectedCountry = 'us';
    } else if (random < 80) {
      selectedCountry = 'au';
    } else {
      selectedCountry = 'uk';
    }

    const voices = voicePool[selectedCountry] || [];
    if (voices.length === 0) return process.env.ELEVENLABS_KEY_ID || '';

    return voices[Math.floor(Math.random() * voices.length)];
  } catch (err) {
    console.error('Error parsing VOICE_POOL:', err);
    return process.env.ELEVENLABS_KEY_ID || '';
  }
}

type Part = "module1" | "hard" | "easy";

type Composition = {
  chooseBestResponse: number; // 1 question each
  conversation: number;       // 2 questions each
  announcement: number;       // 2 questions each
  academicLecture: number;    // 4 questions each
};

// 기본 구성 — admin이 composition을 안 보내면 이 값을 씀
const DEFAULT_COMPOSITION: Record<Part, Composition> = {
  module1: { chooseBestResponse: 8, conversation: 4, announcement: 0, academicLecture: 1 },
  hard: { chooseBestResponse: 3, conversation: 2, announcement: 0, academicLecture: 2 },
  easy: { chooseBestResponse: 3, conversation: 2, announcement: 0, academicLecture: 2 },
};

const QUESTIONS_PER_ITEM = { chooseBestResponse: 1, conversation: 2, announcement: 2, academicLecture: 4 } as const;

function totalQuestions(c: Composition): number {
  return (
    c.chooseBestResponse * QUESTIONS_PER_ITEM.chooseBestResponse +
    c.conversation * QUESTIONS_PER_ITEM.conversation +
    c.announcement * QUESTIONS_PER_ITEM.announcement +
    c.academicLecture * QUESTIONS_PER_ITEM.academicLecture
  );
}

function totalItems(c: Composition): number {
  return c.chooseBestResponse + c.conversation + c.announcement + c.academicLecture;
}

const CHOOSE_BEST_RESPONSE_SPEC = (n: number) => `"choose_best_response" — generate ${n} items. Each item is ONE short spoken prompt (a question or statement) + exactly 1 question with 4 choices (the 4 choices ARE the possible spoken responses; stem "Choose the best response.").
Cover these sub-categories, one per item where possible (cycle through them again with a fresh scenario if you need more than 8): request, auxiliary_verb_question, where_question, informative_statement, who_question, be_verb_question, how_question, advisory_statement.
Answer design — MIX styles, don't make every one indirect or every one direct:
- Sometimes indirect (implicature/condition/deflection) — e.g. Q: "How many sessions are going to be offered this semester in total?" A: "It depends mainly on the professor's teaching schedule." / Q: "Would you mind helping me set up the projector?" A: "Let me wrap up this email first."
- Sometimes fairly direct, naturally phrased — e.g. Q: "Where is the desk to register for membership?" A: "I believe it's in the main lobby." / Q: "Who is attending the board meeting tomorrow?" A: "The executives will be there."
- Distractors answer the WRONG dimension of the question (time instead of place, person instead of reason, etc.) — make them genuinely tempting.`;

const CONVERSATION_SPEC = (n: number) => `"conversation" — generate ${n} items. Each is a natural 2-speaker spoken exchange (~100-150 words), 2 questions per item (types like main_topic and detail/attitude — e.g. "What event are the speakers discussing?", "What does the woman think about the layoffs?"). Choices should be well-crafted and non-trivial — distractors paraphrase something said but distort it subtly (wrong speaker, wrong degree, wrong cause).`;

const ANNOUNCEMENT_SPEC = (n: number) => `"announcement" — generate ${n} items. Each is a short single-speaker spoken announcement or message in a campus context (classroom announcement, student meeting announcement, club/dorm notice, etc.), ~80-120 words, 2 questions per item (detail/purpose types).`;

const LECTURE_SPEC = (n: number) => `"academic_lecture" — generate ${n} item(s). Each is a professor monologue (~220-280 words) on an academic topic, with exactly 4 questions per item, covering: main_topic (e.g. "What can researchers learn about ~ from this lecture?" / "What is the lecture mainly about?"), a detail/inference type, a function/reason type (e.g. "Why does the speaker mention ~?"), and an organization/prediction type (e.g. "What aspect of ~ will the speaker discuss next?").`;

function buildPrompt(part: Part, topic: string, comp: Composition): { prompt: string; expectedItems: number } {
  const sections: string[] = [];
  if (comp.chooseBestResponse > 0) sections.push(`A. ${CHOOSE_BEST_RESPONSE_SPEC(comp.chooseBestResponse)}`);
  if (comp.conversation > 0) sections.push(`B. ${CONVERSATION_SPEC(comp.conversation)}`);
  if (comp.announcement > 0) sections.push(`C. ${ANNOUNCEMENT_SPEC(comp.announcement)}`);
  if (comp.academicLecture > 0) sections.push(`D. ${LECTURE_SPEC(comp.academicLecture)}`);

  const expectedItems = totalItems(comp);
  const qTotal = totalQuestions(comp);

  const branchNote =
    part === "module1"
      ? "Stage 1 (Module 1) — always administered to every student."
      : `Stage 2 — ${part.toUpperCase()} branch (administered only to students who scored ${part === "hard" ? "at or above" : "below"} the Stage 1 cutoff). Make the content noticeably ${part === "hard" ? "harder" : "easier"} than typical Stage 1 material.`;

  return {
    expectedItems,
    prompt: `You are an expert Updated TOEFL iBT 2026 Listening content creator. Generate content for ${branchNote} Overall theme/topic guidance: "${topic}" (vary specific settings/subjects around this, don't repeat the same scenario across items). Total: ${expectedItems} items, ${qTotal} questions.

${sections.join("\n\n")}

Each question: { "id": "...", "number": N (1-based within its item), "type": "...", "stem": "...", "choices": [{"id":"...","text":"...","correct":bool}, ...exactly 4 choices, exactly 1 correct] }
Each item: { "id": "...", "taskKind": "choose_best_response|conversation|announcement|academic_lecture", "title": "short label", "transcript": "realistic spoken English (for conversation: alternating \\"Man: ...\\\\nWoman: ...\\" turns; for academic_lecture/announcement: \\"Professor: ...\\" or \\"Announcer: ...\\"; for choose_best_response: the single spoken prompt line)", "questions": [...] }

Return ONLY valid JSON, no markdown fences. "items" must have exactly ${expectedItems} entries, grouped in this order: choose_best_response, then conversation, then announcement, then academic_lecture:
{ "items": [ ... ] }`,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { part: Part; topic: string; composition?: Partial<Composition> };
    const { part, topic } = body;

    if (!part || !DEFAULT_COMPOSITION[part]) {
      return NextResponse.json({ ok: false, error: "part must be module1 | hard | easy" }, { status: 400 });
    }
    if (!topic?.trim()) {
      return NextResponse.json({ ok: false, error: "topic is required" }, { status: 400 });
    }

    const composition: Composition = { ...DEFAULT_COMPOSITION[part], ...(body.composition ?? {}) };
    if (totalItems(composition) === 0) {
      return NextResponse.json({ ok: false, error: "composition의 항목 수 합이 0입니다" }, { status: 400 });
    }

    const { prompt, expectedItems } = buildPrompt(part, topic, composition);

    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: Math.min(32000, 4000 + expectedItems * 900),
      messages: [{ role: "user", content: prompt }],
    });
    const message = await stream.finalMessage();

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as { items: any[] };

    if (!Array.isArray(parsed.items) || parsed.items.length !== expectedItems) {
      return NextResponse.json(
        { ok: false, error: `모델이 예상(${expectedItems}개)과 다른 개수(${parsed.items?.length ?? 0}개)의 항목을 반환했습니다.` },
        { status: 500 }
      );
    }

    const stage = part === "module1" ? 1 : 2;
    const difficulty = part === "module1" ? "core" : part;
    const testId = randomUUID();

    const items = parsed.items.map((it) => ({
      id: randomUUID(),
      taskKind: it.taskKind,
      stage,
      difficulty,
      audioUrl: "",
      illustrationUrl: "",
      title: it.title ?? "",
      transcript: it.transcript ?? "",
      questions: (it.questions ?? []).map((q: any, qi: number) => ({
        id: randomUUID(),
        number: qi + 1,
        type: q.type ?? "detail",
        stem: q.stem ?? "",
        choices: (q.choices ?? []).map((c: any) => ({
          id: randomUUID(),
          text: c.text ?? "",
          correct: c.correct === true || c.isCorrect === true,
        })),
      })),
    }));

    // Generate audio for each item
    console.log(`[Audio] Generating ${part} audio for ${items.length} items...`);
    for (const item of items) {
      try {
        const voiceId = getRandomVoiceId();
        const audio = await elevenlabs.generate({
          voice: voiceId,
          text: item.transcript,
          model_id: 'eleven_turbo_v2_5',
        });

        let audioBuffer: Buffer;
        if (Buffer.isBuffer(audio)) {
          audioBuffer = audio;
        } else if (audio instanceof ArrayBuffer) {
          audioBuffer = Buffer.from(audio);
        } else {
          const chunks: Buffer[] = [];
          for await (const chunk of audio) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          audioBuffer = Buffer.concat(chunks);
        }

        const fileName = `listening/${testId}/${item.id}.mp3`;
        const { error } = await supabase.storage.from('content').upload(fileName, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true,
        });

        if (error) throw error;

        const { data } = supabase.storage.from('content').getPublicUrl(fileName);
        item.audioUrl = data.publicUrl;
      } catch (err) {
        console.error(`[Audio] Generation failed for item ${item.id}:`, err);
        throw new Error(`Audio generation failed for ${part} item ${item.id}: ${(err as any)?.message}`);
      }
    }

    return NextResponse.json({ ok: true, part, items, testId });
  } catch (err: any) {
    console.error("LISTENING-MST GENERATE ERROR", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
