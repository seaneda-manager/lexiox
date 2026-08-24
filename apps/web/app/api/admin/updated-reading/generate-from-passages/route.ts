export const dynamic = 'force-dynamic';

// apps/web/app/api/admin/updated-reading/generate-from-passages/route.ts
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "crypto";
import { findBlankCountIssues } from "@/lib/utils/ensureCompleteWordsBlanks";
import { shuffleAllChoicesInPayload } from "@/lib/utils/validateAnswerDistribution";

export const runtime = "nodejs";
export const maxDuration = 120;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

type PastedItem =
  | { taskKind: "complete_words"; passageText: string }
  | {
      taskKind: "daily_life";
      contextType: "email" | "notice" | "social_post" | "web_article" | "other";
      label: string;
      questionCount: number;
      passageText: string;
    }
  | { taskKind: "academic_passage"; passageText: string; title?: string };

export async function POST(req: Request) {
  try {
    const { stage, branch, items } = (await req.json()) as {
      stage: 1 | 2;
      branch?: "hard" | "easy";
      items: PastedItem[];
    };

    if (!stage || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ ok: false, error: "stage와 items가 필요합니다." }, { status: 400 });
    }
    if (stage === 2 && branch !== "hard" && branch !== "easy") {
      return NextResponse.json({ ok: false, error: "stage 2는 branch(hard|easy)가 필요합니다." }, { status: 400 });
    }
    for (const it of items) {
      if (!it.passageText?.trim()) {
        return NextResponse.json({ ok: false, error: "모든 지문 칸을 채워주세요." }, { status: 400 });
      }
    }

    const difficulty = stage === 1 ? "core" : branch === "hard" ? "hard" : "easy";

    const sections = items.map((it, i) => {
      if (it.taskKind === "complete_words") {
        return `ITEM ${i} — complete_words:
Given paragraph (keep this exact wording — do not rewrite sentences, only insert blank markers):
"""
${it.passageText}
"""
Pick 10 suitable words across the paragraph (skip the first sentence). For each, keep the prefix and blank out the suffix (mark the blank position with __ right after the prefix, inside "paragraphHtml"). Output "paragraphHtml" (the full paragraph with __ markers inserted, wording otherwise unchanged) and "blanks" (exactly 10 items: id, order, correctToken = the removed suffix).`;
      }
      if (it.taskKind === "daily_life") {
        return `ITEM ${i} — daily_life (${it.label}, contextType="${it.contextType}"):
Given content (already final — do not repeat or rewrite it in your output):
"""
${it.passageText}
"""
Generate exactly ${it.questionCount} multiple-choice questions (detail/purpose type, 4 choices each) based on this content. Output ONLY "questions" — do not include the content itself.`;
      }
      return `ITEM ${i} — academic_passage${it.title ? ` ("${it.title}")` : ""}:
Given passage (already final — do not repeat or rewrite it in your output):
"""
${it.passageText}
"""
Generate exactly 5 questions (mix of detail/vocab/inference/purpose/insertion types, 4 choices each). For insertion type add meta: {"insertion": {"anchors": ["after sentence 1", ...], "correctIndex": N}}. Output ONLY "questions" — do not include the passage text itself.`;
    });

    const prompt = `You are an expert Updated TOEFL iBT 2026 content creator. The passages below were already finalized by a human editor — your only job is to generate the missing quiz content (blanks or questions) for each one. Do not invent new passages, do not rewrite given wording (except inserting blank markers for complete_words), and do not repeat given content back in your JSON output.

${sections.join("\n\n")}

QUESTION format: { "id": "...", "number": N, "type": "detail|vocab|inference|purpose|insertion", "stem": "...", "choices": [{"id":"...","text":"...","isCorrect":bool}, ...4 choices] }

Return ONLY valid JSON, no markdown fences. "items" must have exactly ${items.length} entries, in the same order as the ITEMs above:
{
  "items": [
    // complete_words entries: { "paragraphHtml": "...", "blanks": [{"id":"b1","order":1,"correctToken":"..."}, ...10 total] }
    // daily_life / academic_passage entries: { "questions": [...] }
  ]
}`;

    // complete_words는 반드시 blanks 10개 — Claude가 가끔 이걸 안 지켜서(예: 1개만 만들고 끝냄)
    // 검증 없이 그대로 저장되던 게 버그였음. 최대 3번까지 재시도.
    let parsed: { items: any[] } | null = null;
    let lastIssues: string[] = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      const retryNote =
        attempt > 1
          ? `\n\n⚠️ 이전 응답이 검증에 실패했습니다: ${lastIssues.join("; ")}\ncomplete_words 항목은 반드시 "blanks" 배열에 정확히 10개의 항목이 있어야 합니다. 응답하기 전에 반드시 개수를 세어 확인하세요.`
          : "";

      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt + retryNote }],
      });

      const raw = (message.content[0] as any).text as string;
      const jsonStart = raw.indexOf("{");
      const jsonEnd = raw.lastIndexOf("}");
      const candidate = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as { items: any[] };

      if (!Array.isArray(candidate.items) || candidate.items.length !== items.length) {
        lastIssues = ["모델이 예상과 다른 개수의 항목을 반환했습니다."];
        parsed = null;
        continue;
      }

      parsed = candidate;
      lastIssues = findBlankCountIssues(candidate.items);
      if (lastIssues.length === 0) break;
    }

    if (!parsed) {
      return NextResponse.json({ ok: false, error: "모델이 예상과 다른 개수의 항목을 반환했습니다 (3회 재시도 실패)." }, { status: 500 });
    }
    if (lastIssues.length > 0) {
      return NextResponse.json(
        { ok: false, error: `Complete Words 빈칸 개수 검증 실패 (3회 재시도 후): ${lastIssues.join("; ")}` },
        { status: 500 }
      );
    }

    // Merge: 사용자가 붙여넣은 지문(원문 그대로) + Claude가 생성한 blanks/questions
    const merged = items.map((it, i) => {
      const gen = parsed.items[i] ?? {};
      const id = randomUUID();
      if (it.taskKind === "complete_words") {
        return {
          id,
          taskKind: "complete_words",
          stage,
          difficulty,
          paragraphHtml: gen.paragraphHtml ?? it.passageText,
          blanks: gen.blanks ?? [],
        };
      }
      if (it.taskKind === "daily_life") {
        return {
          id,
          taskKind: "daily_life",
          stage,
          difficulty,
          contextType: it.contextType,
          contentHtml: it.passageText,
          questions: gen.questions ?? [],
        };
      }
      return {
        id,
        taskKind: "academic_passage",
        stage,
        difficulty,
        title: it.title ?? "",
        passageHtml: it.passageText,
        questions: gen.questions ?? [],
      };
    });

    // ✅ 정답 위치 무작위화 — 매 문제 choices를 무조건 섞어서 A/B/C/D 쏠림 방지
    shuffleAllChoicesInPayload(merged);

    return NextResponse.json({ ok: true, items: merged });
  } catch (err: any) {
    console.error("GENERATE-FROM-PASSAGES ERROR", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
