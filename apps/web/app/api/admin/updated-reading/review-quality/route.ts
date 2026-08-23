export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { logAnthropicUsage } from "@/lib/ai/logAnthropicUsage";

export const runtime = "nodejs";
export const maxDuration = 180;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "placeholder" });

type PersonaKey = "beginner" | "advanced";

const PERSONA_LABEL: Record<PersonaKey, string> = {
  beginner: "초급",
  advanced: "고급",
};

const PERSONA_DESCRIPTION: Record<PersonaKey, string> = {
  beginner:
    "기초 문법과 어휘만 아는 초급 학습자. 어려운 단어나 복잡한 문장 구조는 자주 헷갈려하고, 문맥 추론이 서툽니다.",
  advanced:
    "상당한 실력을 갖춘 고급 학습자이지만 최고급(원어민 수준)은 아닙니다. 대부분의 문제를 풀 수 있지만 미묘한 뉘앙스나 아주 어려운 어휘에서는 실수할 수 있습니다.",
};

interface BlindItem {
  itemId: string;
  taskKind: string;
  label: string;
  prompt: string;
  answerKind: "blanks" | "choices";
  expectedCount: number;
}

function buildBlindItems(items: any[]): BlindItem[] {
  return items.map((item, i) => {
    if (item.taskKind === "complete_words") {
      return {
        itemId: item.id,
        taskKind: item.taskKind,
        label: `Complete the Words #${i + 1}`,
        prompt: `단락 (빈칸은 __ 로 표시됨, order 순서대로 총 ${item.blanks?.length ?? 0}개):\n${item.paragraphHtml}`,
        answerKind: "blanks",
        expectedCount: item.blanks?.length ?? 0,
      };
    }
    const questions = item.questions ?? [];
    const passageText = item.taskKind === "academic_passage" ? item.passageHtml : item.contentHtml;
    const qText = questions
      .map(
        (q: any, qi: number) =>
          `Q${qi + 1}. ${q.stem}\n${(q.choices ?? [])
            .map((c: any, ci: number) => `${String.fromCharCode(65 + ci)}. ${c.text}`)
            .join("\n")}`
      )
      .join("\n\n");
    return {
      itemId: item.id,
      taskKind: item.taskKind,
      label: `${item.taskKind === "academic_passage" ? "Academic Passage" : "Daily Life"} #${i + 1}`,
      prompt: `지문:\n${passageText}\n\n문제:\n${qText}`,
      answerKind: "choices",
      expectedCount: questions.length,
    };
  });
}

function buildPersonaPrompt(persona: PersonaKey, blindItems: BlindItem[]): string {
  const itemsText = blindItems
    .map((bi, i) => `=== ITEM ${i} (${bi.label}, id="${bi.itemId}") ===\n${bi.prompt}`)
    .join("\n\n");

  return `당신은 지금 ${PERSONA_LABEL[persona]} 수준의 실제 학생 역할을 맡습니다: ${PERSONA_DESCRIPTION[persona]}

아래 리딩 문제들을 이 학생의 실력으로 실제로 풀어보세요. 정답을 미리 아는 척하지 말고, 이 레벨 학생이라면 자연스럽게 틀릴 만한 곳에서는 실제로 틀리세요.

동시에 출제자 관점에서 문제 자체에 이상이 없는지도 관찰하세요. 예:
- complete_words: 문맥만으로는 정답을 확신할 수 없는 빈칸, 부자연스러운 단어 선택
- daily_life/academic: 정답이 2개 이상 그럴듯한 선택지, 지문에 없는 내용을 묻는 문제, 부자연스러운 영어, 이 레벨에 비해 너무 쉽거나 어려운 문제

${itemsText}

각 ITEM에 대해 답하세요. complete_words는 blankGuesses(빈칸 order 순서대로, 각 빈칸의 나머지 부분 추측), 그 외는 choiceAnswers(문제 순서대로 A/B/C/D)를 채우세요. 문제가 있으면 problems에 한국어로 짧게 적으세요 (없으면 빈 배열).

반드시 이 JSON 형식으로만 응답하세요 (다른 텍스트 없이, 코드블록 없이):
{
  "items": [
    {"itemId": "...", "blankGuesses": ["단어조각1", "..."], "choiceAnswers": [], "problems": ["..."]},
    {"itemId": "...", "blankGuesses": [], "choiceAnswers": ["A", "B"], "problems": []}
  ],
  "overallProblems": ["전체적으로 느낀 문제점 (없으면 빈 배열)"]
}`;
}

function scoreItems(items: any[], blindItems: BlindItem[], modelItems: any[]) {
  return blindItems.map((bi) => {
    const orig = items.find((it) => it.id === bi.itemId);
    const modelItem = modelItems.find((mi: any) => mi.itemId === bi.itemId) ?? {};

    if (bi.answerKind === "blanks") {
      const guesses: string[] = Array.isArray(modelItem.blankGuesses) ? modelItem.blankGuesses : [];
      const blanks = orig?.blanks ?? [];
      let correct = 0;
      const details = blanks.map((b: any, i: number) => {
        const guess = String(guesses[i] ?? "").trim().toLowerCase();
        const actual = String(b.correctToken ?? "").trim().toLowerCase();
        const isRight = guess.length > 0 && guess === actual;
        if (isRight) correct++;
        return { order: b.order, guess: guesses[i] ?? "(무응답)", correct: b.correctToken, isRight };
      });
      return {
        itemId: bi.itemId,
        label: bi.label,
        taskKind: bi.taskKind,
        total: blanks.length,
        correct,
        details,
        problems: Array.isArray(modelItem.problems) ? modelItem.problems : [],
      };
    }

    const answers: string[] = Array.isArray(modelItem.choiceAnswers) ? modelItem.choiceAnswers : [];
    const questions = orig?.questions ?? [];
    let correct = 0;
    const details = questions.map((q: any, i: number) => {
      const picked = String(answers[i] ?? "").trim().toUpperCase();
      const choices = q.choices ?? [];
      const pickedIdx = picked.charCodeAt(0) - 65;
      const isRight = choices[pickedIdx]?.isCorrect === true;
      if (isRight) correct++;
      const correctIdx = choices.findIndex((c: any) => c.isCorrect);
      return {
        question: i + 1,
        picked: answers[i] ?? "(무응답)",
        correct: correctIdx >= 0 ? String.fromCharCode(65 + correctIdx) : "?",
        isRight,
      };
    });
    return {
      itemId: bi.itemId,
      label: bi.label,
      taskKind: bi.taskKind,
      total: questions.length,
      correct,
      details,
      problems: Array.isArray(modelItem.problems) ? modelItem.problems : [],
    };
  });
}

export async function POST(req: Request) {
  try {
    const { items } = (await req.json()) as { items: any[] };
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ ok: false, error: "items가 필요합니다." }, { status: 400 });
    }

    const blindItems = buildBlindItems(items);

    async function runPersona(persona: PersonaKey) {
      const prompt = buildPersonaPrompt(persona, blindItems);
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }],
      });
      void logAnthropicUsage(`admin/updated-reading/review-quality:${persona}`, "claude-sonnet-4-6", message.usage);

      const raw = (message.content[0] as any).text as string;
      const jsonStart = raw.indexOf("{");
      const jsonEnd = raw.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) throw new Error(`${PERSONA_LABEL[persona]} 리뷰 응답에서 JSON을 찾을 수 없습니다.`);
      const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

      return {
        results: scoreItems(items, blindItems, parsed.items ?? []),
        overallProblems: Array.isArray(parsed.overallProblems) ? parsed.overallProblems : [],
      };
    }

    const [beginner, advanced] = await Promise.all([runPersona("beginner"), runPersona("advanced")]);

    return NextResponse.json({ ok: true, report: { beginner, advanced } });
  } catch (err: any) {
    console.error("REVIEW-QUALITY ERROR", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
