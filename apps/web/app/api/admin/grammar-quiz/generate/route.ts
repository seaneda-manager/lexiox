export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

import { NextResponse } from "next/server";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";
import { callClaudeJson, sanitizeQuizItems } from "@/lib/ai/grammarGen";
import { GRAMMAR_TRACKS, GRAMMAR_TRACK_LABEL, QUIZ_ITEM_TYPE_LABEL } from "@/models/grammar/quiz";
import type { GrammarTrack, QuizItemType } from "@/models/grammar/quiz";

const VOCAB_LEVEL_GUIDE = `어휘 수준(vocab_level) 1~5 기준:
1 = 초등~중1 기본어휘 · 2 = 중2~중3 · 3 = 고1 내신 · 4 = 고2~수능 · 5 = TOEFL/학술.
문장에서 가장 어려운 내용어를 기준으로 판정.`;

// POST /api/admin/grammar-quiz/generate
// body: { track, element_code, element_label?, item_type, count, word_count_min, word_count_max, vocab_level, seed? }
// AI가 조건에 맞는 문항 생성 → 저장하지 않고 반환 (관리자 검토 후 POST /items).
export async function POST(req: Request) {
  try {
    const authed = await getServerSupabase();
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const track: GrammarTrack = GRAMMAR_TRACKS.includes(body?.track) ? body.track : "middle";
    const item_type: QuizItemType = body?.item_type === "judgment" ? "judgment" : "fill";
    const count = Math.max(1, Math.min(Number(body?.count) || 5, 15));
    const wcMin = Math.max(3, Number(body?.word_count_min) || 6);
    const wcMax = Math.max(wcMin, Number(body?.word_count_max) || 14);
    const vocabTarget = Math.min(5, Math.max(1, Math.round(Number(body?.vocab_level) || 3)));
    const seed: string = String(body?.seed ?? "").trim();

    const db = getServiceRoleClient();
    let elementLabel: string = String(body?.element_label ?? "").trim();
    const element_code: string | null = body?.element_code || null;
    if (element_code && !elementLabel) {
      const { data: el } = await db
        .from("grammar_elements")
        .select("label_ko, label_en, category")
        .eq("code", element_code)
        .maybeSingle();
      if (el) elementLabel = `${el.label_ko} (${el.label_en}) · ${el.category}`;
    }
    if (!element_code && !elementLabel && !seed) {
      return NextResponse.json({ ok: false, error: "문법 요소 또는 seed를 지정하세요." }, { status: 400 });
    }

    const prompt = `당신은 한국 학원의 베테랑 영어 문법 출제자입니다. 아래 조건에 맞는 **문법 퀴즈 문항 ${count}개**를 만드세요.

## 조건
- 대상: ${GRAMMAR_TRACK_LABEL[track]} 트랙
- 문법 요소: ${elementLabel || "(seed 참조)"}
- 유형: ${QUIZ_ITEM_TYPE_LABEL[item_type]} (${item_type})
- 문장 길이: 단어 ${wcMin}~${wcMax}개
- 목표 어휘 수준: ${vocabTarget} (아래 기준)
${seed ? `- 참고 재료(관리자 제공):\n"""\n${seed}\n"""` : ""}

${VOCAB_LEVEL_GUIDE}

## 문항 규격
- item_type "fill": stem 문장에서 정답 위치를 정확히 "___" 하나로 표시. **정답 단어를 문장에 절대 넣지 말 것.**
  answer=빈칸에 들어갈 말. distractors=같은 품사/범주의 그럴듯한 오답 3개 (정답과 겹치지 않게).
- item_type "judgment": stem은 완전한 문장. answer는 "correct" 또는 "incorrect" 만. distractors=[].
  incorrect 문항은 해당 문법 요소를 틀리게 쓴 자연스러운 오류로.
- 각 문항: 그 문법 요소를 실제로 시험하는 문장. 다른 문법으로도 답이 갈리지 않게 문맥을 분명히.
- explanation: 정답 근거 한국어 1~2문장.
- vocab_level: 그 문장의 실제 어휘 수준 1~5 (목표에 맞추되 문장이 실제로 그러한지 판정).

## 출력: 이 JSON만 (다른 텍스트/코드블록 없이)
{ "items": [
  { "item_type":"${item_type}", "stem":"...", "answer":"...", "distractors":[${item_type === "fill" ? '"...","...","..."' : ""}],
    "vocab_level": ${vocabTarget}, "explanation":"..." }
] }`;

    const parsed = await callClaudeJson("admin/grammar-quiz/generate", prompt, 12000);
    const items = sanitizeQuizItems(parsed)
      .filter((it) => it.item_type === item_type)
      .map((it) => ({ ...it, track, element_code, source: "ai" as const }));

    if (items.length === 0) {
      return NextResponse.json({ ok: false, error: "유효한 문항이 생성되지 않았습니다. 다시 시도하세요." }, { status: 502 });
    }

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    console.error("GRAMMAR-QUIZ GENERATE ERROR", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
