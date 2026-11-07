export const dynamic = "force-dynamic";
export const maxDuration = 300;

// apps/web/app/api/admin/updated-reading/evidence/route.ts
//
// 정답 근거 문장: AI가 초안(draft)을 만들고 선생님이 검수(approved)한다.
// - 근거는 시험 payload 안 question.explanation.evidence 에 저장한다(스키마 변경 없음).
// - 채점과 무관한 해설 필드만 수정하므로, 저장 API의 "배정된 시험 수정 불가" 잠금은 적용하지 않는다.
// - AI가 돌려준 인용문은 지문 원문에 실제로 있는지 검증하고, 없으면 버린다(환각 방지).

import { NextResponse } from "next/server";
import { Anthropic } from "@anthropic-ai/sdk";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireTeacherOrAdmin } from "@/lib/auth/requireTeacherOrAdmin";
import { htmlToPlain, quoteExistsInPassage } from "@/lib/reading/evidence";
import type { REvidence } from "@/models/reading/types";

type QRef = { q: any; passagePlain: string };

/** payload 안의 모든 지문형 문항(Complete the Words 제외)을 모은다. */
function collectQuestions(test: any): QRef[] {
  const out: QRef[] = [];
  const modules: any[] = [
    ...(test?.modules ?? []),
    test?.stage2Pool?.easy,
    test?.stage2Pool?.hard,
  ].filter(Boolean);
  for (const mod of modules) {
    for (const item of mod?.items ?? []) {
      if (item.taskKind !== "academic_passage" && item.taskKind !== "daily_life") continue;
      const html = item.taskKind === "academic_passage" ? item.passageHtml : item.contentHtml;
      const passagePlain = htmlToPlain(html ?? "");
      for (const q of item.questions ?? []) out.push({ q, passagePlain });
    }
  }
  return out;
}

const isCorrect = (c: any) => c?.isCorrect === true || c?.is_correct === true;

function extractJson(text: string): any | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

async function generateForQuestion(client: Anthropic, ref: QRef): Promise<string[]> {
  const { q, passagePlain } = ref;
  const choices = (q.choices ?? []) as any[];
  const correct = choices.find(isCorrect);
  const prompt = `You are helping a TOEFL teacher. Find the sentence(s) in the passage that give the evidence for the correct answer.

PASSAGE:
${passagePlain}

QUESTION (${q.type ?? "detail"}): ${q.stem}

CHOICES:
${choices.map((c, i) => `${String.fromCharCode(65 + i)}. ${c.text}${isCorrect(c) ? "   <-- CORRECT" : ""}`).join("\n")}

Rules:
- Return 1 or 2 quotes. Each quote must be copied EXACTLY, word for word, from the PASSAGE (one sentence or one clause; no ellipses, no paraphrase).
- Choose the text that a student must read to confirm the correct answer ("${correct?.text ?? ""}").
- Reply with JSON only: {"evidence":[{"quote":"..."}]}`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });
  const text = msg.content[0]?.type === "text" ? msg.content[0].text : "";
  const parsed = extractJson(text);
  const quotes: string[] = (parsed?.evidence ?? [])
    .map((e: any) => String(e?.quote ?? "").trim())
    .filter(Boolean);
  // 지문에 실제로 있는 인용만 통과
  return quotes.filter((qt) => quoteExistsInPassage(passagePlain, qt)).slice(0, 2);
}

async function runPool<T>(items: T[], limit: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]);
    }
  });
  await Promise.all(workers);
}

export async function POST(req: Request) {
  try {
    const { user } = await requireTeacherOrAdmin();
    const body = (await req.json().catch(() => null)) as any;
    const action = body?.action as "generate" | "review" | "set_correct" | undefined;
    const testId = body?.testId as string | undefined;
    if (!action || !testId) return NextResponse.json({ ok: false, error: "action, testId required" }, { status: 400 });

    const supabase = await getServerSupabase();
    const { data: row, error: loadErr } = await supabase
      .from("reading_tests_2026")
      .select("payload")
      .eq("id", testId)
      .maybeSingle();
    if (loadErr || !row?.payload) return NextResponse.json({ ok: false, error: "시험을 찾을 수 없습니다." }, { status: 404 });

    const test = row.payload as any;
    const refs = collectQuestions(test);

    if (action === "generate") {
      const onlyMissing = body?.onlyMissing !== false;
      const targets = refs.filter(({ q }) => {
        if (q.type === "insertion" || q.type === "summary") return false; // 지문 전체/삽입 위치 문제는 단일 근거가 없다
        const ev: REvidence[] = q.explanation?.evidence ?? [];
        return onlyMissing ? ev.length === 0 : !ev.some((e) => e.status === "approved");
      });

      const client = new Anthropic();
      let generated = 0;
      let failed = 0;
      await runPool(targets, 4, async (ref) => {
        try {
          const quotes = await generateForQuestion(client, ref);
          if (quotes.length === 0) { failed++; return; }
          ref.q.explanation = {
            ...(ref.q.explanation ?? {}),
            evidence: quotes.map((quote) => ({ quote, status: "draft", source: "ai" } as REvidence)),
          };
          generated++;
        } catch {
          failed++;
        }
      });

      if (generated > 0) {
        const { error } = await supabase
          .from("reading_tests_2026")
          .update({ payload: test, updated_at: new Date().toISOString() })
          .eq("id", testId);
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, generated, failed, total: targets.length });
    }

    if (action === "set_correct") {
      // 정답 오류 수정(관리자 전용). 근거 검수 중 정답과 지문이 충돌할 때 쓴다.
      // 안전장치: 현재 정답 위치(expectedCurrentIndex)가 맞을 때만 바꾸고, 변경 이력을 meta.keyFix에 남긴다.
      const { role } = await requireTeacherOrAdmin();
      if (role !== "admin") return NextResponse.json({ ok: false, error: "정답 수정은 관리자만 할 수 있습니다." }, { status: 403 });
      const stemPrefix = String(body?.stemPrefix ?? "");
      const matches = refs.filter((r) => (body?.questionId ? r.q.id === body.questionId : stemPrefix && String(r.q.stem ?? "").startsWith(stemPrefix)));
      if (matches.length > 1) return NextResponse.json({ ok: false, error: "문항이 여러 개 일치합니다. questionId로 지정해 주세요." }, { status: 409 });
      const target = matches[0];
      if (!target) return NextResponse.json({ ok: false, error: "문항을 찾을 수 없습니다." }, { status: 404 });
      const choices = (target.q.choices ?? []) as any[];
      const newIdx = Number(body?.choiceIndex);
      const expectedIdx = Number(body?.expectedCurrentIndex);
      const curIdx = choices.findIndex(isCorrect);
      if (!Number.isInteger(newIdx) || newIdx < 0 || newIdx >= choices.length) {
        return NextResponse.json({ ok: false, error: "choiceIndex가 올바르지 않습니다." }, { status: 400 });
      }
      if (choices.filter(isCorrect).length !== 1 || curIdx !== expectedIdx) {
        return NextResponse.json({ ok: false, error: `현재 정답이 예상(${expectedIdx})과 다릅니다(${curIdx}). 변경하지 않았습니다.` }, { status: 409 });
      }
      choices.forEach((c, i) => {
        if ("isCorrect" in c || !("is_correct" in c)) c.isCorrect = i === newIdx;
        if ("is_correct" in c) c.is_correct = i === newIdx;
      });
      target.q.meta = {
        ...(target.q.meta ?? {}),
        keyFix: { from: curIdx, to: newIdx, by: user.id, at: new Date().toISOString(), reason: String(body?.reason ?? "") },
      };
      const { error } = await supabase
        .from("reading_tests_2026")
        .update({ payload: test, updated_at: new Date().toISOString() })
        .eq("id", testId);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, from: curIdx, to: newIdx });
    }

    // action === "review": 선생님이 근거를 수정/승인/반려
    const questionId = body?.questionId as string | undefined;
    const incoming = (body?.evidence ?? []) as { quote: string; status: REvidence["status"] }[];
    const ref = refs.find((r) => r.q.id === questionId);
    if (!ref) return NextResponse.json({ ok: false, error: "문항을 찾을 수 없습니다." }, { status: 404 });

    const now = new Date().toISOString();
    const next: REvidence[] = [];
    for (const e of incoming) {
      const quote = String(e.quote ?? "").trim();
      if (!quote) continue;
      if (e.status === "approved" && !quoteExistsInPassage(ref.passagePlain, quote)) {
        return NextResponse.json({ ok: false, error: "지문에 없는 문장은 승인할 수 없습니다. 지문에서 그대로 복사해 주세요." }, { status: 422 });
      }
      next.push({ quote, status: e.status, source: "teacher", reviewedAt: now, reviewedBy: user.id });
    }
    ref.q.explanation = { ...(ref.q.explanation ?? {}), evidence: next };
    const { error } = await supabase
      .from("reading_tests_2026")
      .update({ payload: test, updated_at: now })
      .eq("id", testId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const status = msg.startsWith("401") ? 401 : msg.startsWith("403") ? 403 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
