export const dynamic = "force-dynamic";

// AI 검수(proof-testing): 저장된 Updated TOEFL 시험 1개를 DB에서 읽어
// (1) 구조 검사 → (2) Reading/Listening은 AI blind 풀이, Speaking/Writing은 규격·언어 검수.
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getServiceSupabase } from "@/lib/supabase/service";
import { logAnthropicUsage } from "@/lib/ai/logAnthropicUsage";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import {
  SECTION_TABLE,
  buildBlindPrompt,
  buildContentReviewPrompt,
  chunk,
  extractBlindUnits,
  isToeflSection,
  parseJsonLoose,
  scoreBlind,
  structuralChecks,
  type ReviewIssue,
} from "@/lib/admin/toeflReview";

export const runtime = "nodejs";
export const maxDuration = 300;

const MODEL = "claude-sonnet-4-6";
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "placeholder" });

async function ask(tag: string, prompt: string, maxTokens: number) {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  void logAnthropicUsage(`admin/updated-toefl/proof:${tag}`, MODEL, msg.usage);
  return parseJsonLoose((msg.content[0] as { text: string }).text);
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { section, id, skipAi } = (await req.json()) as { section: unknown; id: string; skipAi?: boolean };
    if (!isToeflSection(section) || !id) {
      return NextResponse.json({ ok: false, error: "section/id가 올바르지 않습니다." }, { status: 400 });
    }

    const { data, error } = await getServiceSupabase()
      .from(SECTION_TABLE[section])
      .select("id,label,payload")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ ok: false, error: "시험을 찾을 수 없습니다." }, { status: 404 });

    const issues: ReviewIssue[] = structuralChecks(section, data.payload);
    let blind: { total: number; correct: number } | null = null;
    let aiError: string | null = null;

    if (!skipAi) {
      try {
        if (section === "reading" || section === "listening") {
          const units = extractBlindUnits(section, data.payload).filter(
            (u) => u.context && (u.blanks?.length || u.questions.length)
          );
          // 한 번에 너무 많이 넣으면 응답이 잘리므로 4개 단위씩 병렬 호출
          const results = await Promise.all(
            chunk(units, 4).map(async (group, i) => {
              const parsed = await ask(`${section}:${i}`, buildBlindPrompt(section, group), 6000);
              const scored = scoreBlind(group, parsed.units ?? []);
              for (const p of Array.isArray(parsed.overallProblems) ? parsed.overallProblems : [])
                scored.issues.push({ severity: "warn", where: "전체", message: String(p), source: "ai" });
              return scored;
            })
          );
          blind = {
            total: results.reduce((a, r) => a + r.total, 0),
            correct: results.reduce((a, r) => a + r.correct, 0),
          };
          results.forEach((r) => issues.push(...r.issues));
        } else {
          const parsed = await ask(section, buildContentReviewPrompt(section, data.payload), 4000);
          for (const it of Array.isArray(parsed.issues) ? parsed.issues : [])
            issues.push({
              severity: it.severity === "error" ? "error" : "warn",
              where: String(it.where ?? "전체"),
              message: String(it.message ?? ""),
              source: "ai",
            });
        }
      } catch (e: any) {
        // 구조 검사 결과는 살리고 AI 단계 실패만 별도 표시
        aiError = e?.message ?? "AI 검수 실패";
      }
    }

    const errorCount = issues.filter((i) => i.severity === "error").length;
    const warnCount = issues.length - errorCount;
    const verdict = errorCount > 0 ? "fail" : warnCount > 0 || aiError ? "warn" : "pass";

    return NextResponse.json({
      ok: true,
      id: data.id,
      label: data.label,
      verdict,
      errorCount,
      warnCount,
      blind,
      aiError,
      issues,
    });
  } catch (e: any) {
    console.error("TOEFL PROOF ERROR", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
