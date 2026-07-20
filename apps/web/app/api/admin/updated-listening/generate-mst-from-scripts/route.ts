// apps/web/app/api/admin/updated-listening/generate-mst-from-scripts/route.ts
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 180;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

type Part = "module1" | "hard" | "easy";

// admin이 안 넘기면 이 기본값 사용 (choose_best_response 개수만 지정하면 되고,
// conversation/announcement/academic_lecture는 붙여넣은 스크립트 배열 길이로 결정됨)
const DEFAULT_CBR_COUNT: Record<Part, number> = { module1: 8, hard: 3, easy: 3 };

const CHOOSE_BEST_RESPONSE_SPEC = (n: number) => `"choose_best_response" — generate ${n} items from scratch. Each item is ONE short spoken prompt (a question or statement) + exactly 1 question with 4 choices (the 4 choices ARE the possible spoken responses; stem "Choose the best response.").
Cover these sub-categories, one per item where possible (cycle through them again with a fresh scenario if you need more than 8): request, auxiliary_verb_question, where_question, informative_statement, who_question, be_verb_question, how_question, advisory_statement.
Answer design — MIX styles, don't make every one indirect or every one direct:
- Sometimes indirect (implicature/condition/deflection) — e.g. Q: "How many sessions are going to be offered this semester in total?" A: "It depends mainly on the professor's teaching schedule." / Q: "Would you mind helping me set up the projector?" A: "Let me wrap up this email first."
- Sometimes fairly direct, naturally phrased — e.g. Q: "Where is the desk to register for membership?" A: "I believe it's in the main lobby." / Q: "Who is attending the board meeting tomorrow?" A: "The executives will be there."
- Distractors answer the WRONG dimension of the question (time instead of place, person instead of reason, etc.) — make them genuinely tempting.`;

function scriptSection(kind: "conversation" | "announcement" | "academic_lecture", idx: number, script: string, qCount: number, qGuidance: string): string {
  return `${kind.toUpperCase()} ITEM ${idx} — given transcript (use exactly as written — do not repeat it in your output):
"""
${script}
"""
Generate exactly ${qCount} question(s) on this: ${qGuidance} Output ONLY "questions" for this item.`;
}

function buildPrompt(
  part: Part,
  topic: string,
  cbrCount: number,
  conversations: string[],
  announcements: string[],
  lectures: string[]
): { prompt: string; expectedItems: number } {
  const sections: string[] = [];

  if (cbrCount > 0) sections.push(`SECTION A — ${CHOOSE_BEST_RESPONSE_SPEC(cbrCount)}`);

  conversations.forEach((script, i) =>
    sections.push(
      scriptSection(
        "conversation",
        i,
        script,
        2,
        `types like main_topic and detail/attitude — e.g. "What event are the speakers discussing?", "What does the woman think about ~?". Choices should be well-crafted and non-trivial: distractors paraphrase something said but distort it subtly (wrong speaker, wrong degree, wrong cause).`
      )
    )
  );

  announcements.forEach((script, i) =>
    sections.push(scriptSection("announcement", i, script, 2, `detail/purpose types.`))
  );

  lectures.forEach((script, i) =>
    sections.push(
      scriptSection(
        "academic_lecture",
        i,
        script,
        4,
        `covering: main_topic (e.g. "What is the lecture mainly about?" / "What can researchers learn about ~ from this lecture?"), a detail/inference type, a function/reason type (e.g. "Why does the speaker mention ~?"), and an organization/prediction type (e.g. "What aspect of ~ will the speaker discuss next?").`
      )
    )
  );

  const expectedItems = cbrCount + conversations.length + announcements.length + lectures.length;
  const branchNote =
    part === "module1"
      ? "Stage 1 (Module 1) — always administered to every student."
      : `Stage 2 — ${part.toUpperCase()} branch (administered only to students who scored ${part === "hard" ? "at or above" : "below"} the Stage 1 cutoff). Make the choose_best_response items you generate noticeably ${part === "hard" ? "harder" : "easier"} than typical Stage 1 material.`;

  return {
    expectedItems,
    prompt: `You are an expert Updated TOEFL iBT 2026 Listening content creator. Generate content for ${branchNote} Overall theme/topic guidance for the newly-written choose_best_response items: "${topic}".

The conversation/announcement/academic_lecture transcripts below were already finalized by a human editor — for those, only generate the missing questions. For choose_best_response, generate everything from scratch.

${sections.join("\n\n")}

QUESTION format: { "id": "...", "number": N (1-based within its item), "type": "...", "stem": "...", "choices": [{"id":"...","text":"...","correct":bool}, ...exactly 4 choices, exactly 1 correct] }

Return ONLY valid JSON, no markdown fences. "items" must have exactly ${expectedItems} entries, in this order: ${cbrCount} choose_best_response (each with its own "transcript" you invented), then ${conversations.length} conversation, then ${announcements.length} announcement, then ${lectures.length} academic_lecture (the given-script entries need only "questions" — no transcript/title needed, we already have those):
{
  "items": [
    // choose_best_response entries: { "taskKind": "choose_best_response", "title": "...", "transcript": "...", "questions": [...1 question] }
    // conversation / announcement / academic_lecture entries: { "questions": [...] }
  ]
}`,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      part: Part;
      topic: string;
      chooseBestResponseCount?: number;
      conversations: string[];
      announcements?: string[];
      lectures: string[];
    };
    const { part, topic } = body;

    if (!part || !DEFAULT_CBR_COUNT[part]) {
      return NextResponse.json({ ok: false, error: "part must be module1 | hard | easy" }, { status: 400 });
    }
    if (!topic?.trim()) {
      return NextResponse.json({ ok: false, error: "topic is required" }, { status: 400 });
    }

    const cbrCount = body.chooseBestResponseCount ?? DEFAULT_CBR_COUNT[part];
    const conversations = body.conversations ?? [];
    const announcements = body.announcements ?? [];
    const lectures = body.lectures ?? [];

    if (conversations.some((s) => !s?.trim()) || announcements.some((s) => !s?.trim()) || lectures.some((s) => !s?.trim())) {
      return NextResponse.json({ ok: false, error: "빈 스크립트가 있습니다" }, { status: 400 });
    }
    if (cbrCount + conversations.length + announcements.length + lectures.length === 0) {
      return NextResponse.json({ ok: false, error: "생성할 항목이 없습니다" }, { status: 400 });
    }

    const { prompt, expectedItems } = buildPrompt(part, topic, cbrCount, conversations, announcements, lectures);

    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: Math.min(32000, 3000 + expectedItems * 700),
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

    const toQuestions = (qs: any[]) =>
      (qs ?? []).map((q: any, qi: number) => ({
        id: randomUUID(),
        number: qi + 1,
        type: q.type ?? "detail",
        stem: q.stem ?? "",
        choices: (q.choices ?? []).map((c: any) => ({
          id: randomUUID(),
          text: c.text ?? "",
          correct: c.correct === true || c.isCorrect === true,
        })),
      }));

    const items: any[] = [];
    let idx = 0;

    for (let i = 0; i < cbrCount; i++, idx++) {
      const gen = parsed.items[idx] ?? {};
      items.push({
        id: randomUUID(),
        taskKind: "choose_best_response",
        stage,
        difficulty,
        audioUrl: "",
        illustrationUrl: "",
        title: gen.title ?? "",
        transcript: gen.transcript ?? "",
        questions: toQuestions(gen.questions),
      });
    }

    const pushScripted = (taskKind: string, scripts: string[]) => {
      for (const script of scripts) {
        const gen = parsed.items[idx] ?? {};
        idx++;
        items.push({
          id: randomUUID(),
          taskKind,
          stage,
          difficulty,
          audioUrl: "",
          illustrationUrl: "",
          title: "",
          transcript: script,
          questions: toQuestions(gen.questions),
        });
      }
    };
    pushScripted("conversation", conversations);
    pushScripted("announcement", announcements);
    pushScripted("academic_lecture", lectures);

    return NextResponse.json({ ok: true, part, items });
  } catch (err: any) {
    console.error("LISTENING-MST-FROM-SCRIPTS ERROR", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
