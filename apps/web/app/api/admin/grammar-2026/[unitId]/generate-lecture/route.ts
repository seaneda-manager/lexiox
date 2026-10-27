export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";
import { generateMixedSpeech } from "@/lib/elevenlabs/generate-speech";
import { prepareNarrationForTts } from "@/lib/elevenlabs/prepare-narration";
import { callClaudeJson, sanitizeSegments, existingSegmentsBlock, insertDroppingMissing } from "@/lib/ai/grammarGen";

function buildPrompt(unit: any, manualSegs: any[], drills: any[]): string {
  const drillText = drills
    .slice(0, 6)
    .map((d) => `- (${d.type}) 문장: ${d.sentence} / 정답: ${d.answer} / 오답보기: ${JSON.stringify(d.distractors)}`)
    .join("\n");

  return `당신은 한국 학원의 베테랑 영어 문법 강사입니다. 아래 문법 유닛으로 **짧은 수업 강의**의 대본과 화면 연출을 만드세요.

## 유닛
- 제목(한): ${unit.label_ko}
- 제목(영): ${unit.label_en}
- 설명: ${unit.description ?? "(없음)"}
- 레벨: ${unit.level}
- 관리자 메모(반드시 반영): ${unit.admin_note ?? "(없음)"}

## 관리자가 직접 넣어 유지 중인 세그먼트 (이것과 중복 없이 이어지도록)
${existingSegmentsBlock(manualSegs)}

## 기존 드릴 (예문/포인트 소스)
${drillText || "(없음)"}

## 만들 것: 세그먼트 6~10개의 시퀀스
흐름: ①제목/개요 → ②문법 핵심 설명(공식·규칙) → ③예문 1~3개 walkthrough → ④대표 드릴 1~2개를 실제로 풀며 설명 → ⑤한 줄 요약.

세그먼트 타입:
- "text": 짧은 도입/전환/요약 문단. content = { "text": "화면에 띄울 짧은 문장(한국어)" }
- "board": 칠판 판서. content = { "title"?: "소제목", "lines": [{ "text": "한 줄(영어 예문/공식 등)", "emphasis"?: [{ "from": 문자시작index, "to": 문자끝index, "kind": "highlight"|"circle"|"underline" }] }] }
- "blank": 학생이 직접 채우는 빈칸(설명 팝업퀴즈). content = { "prompt": "___ 문장", "answer": "정답", "hint_ko"?: "힌트" }
  - ⚠️ prompt 문장에는 정답 단어가 절대 들어가면 안 됨 (정답 자리는 ___ 하나만).
  - ⚠️ board에서 이미 보여준 예문을 blank로 재사용 금지. 학생이 처음 보는 새 문장으로 출제.
  - 정답이 명백히 노출되는 문맥(바로 앞 board가 같은 구조를 answer와 함께 보여준 경우 등) 회피.

## narration (필수, 모든 세그먼트)
강사의 말. 한국어. 영어 예문·표현은 그대로 영어로 읽어줌. 1~4문장.
음성(TTS)으로 읽히므로: 기호(→, =, /, ~, 괄호)와 "S+V", "to V", "-ing" 같은 약어 대신 말로 풀어 쓰고(예: "주어 동사", "to부정사", "ing 형태"), 영어 단어는 한 번에 짧은 덩어리(예문 1개 단위)로만 섞으세요.

주의: "blank" 세그먼트의 narration은 정답을 절대 말하거나 암시하지 말 것 (어차피 고정 안내로 대체됨). 정답은 직전 board/text 세그먼트에서 충분히 설명한 뒤에 blank로 묻고, blank 바로 앞 설명에서 "정답 단어가 그대로 문제에 보이게" 하지 말 것.

## 출력: 이 JSON만 (다른 텍스트/코드블록 없이)
{ "segments": [ { "type": "board", "narration": "...", "content": { "lines": [{ "text": "...", "emphasis": [] }] } } ] }`;
}

export async function POST(req: Request, { params }: { params: Promise<{ unitId: string }> }) {
  try {
    const { unitId } = await params;

    const authed = await getServerSupabase();
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    let bodyVoiceId: string | undefined;
    try {
      const body = await req.json();
      if (body?.voiceId && typeof body.voiceId === "string") bodyVoiceId = body.voiceId.trim();
    } catch {
      /* 바디 없음 */
    }

    const db = getServiceRoleClient();
    const [unitRes, segRes, drillRes] = await Promise.all([
      db.from("grammar_2026_units").select("*").eq("id", unitId).single(),
      db.from("grammar_2026_explanation_segments").select("*").eq("unit_id", unitId).order("order_index"),
      db.from("grammar_2026_drills").select("*").eq("unit_id", unitId).order("order_index"),
    ]);
    if (unitRes.error || !unitRes.data) {
      return NextResponse.json({ ok: false, error: "유닛을 찾을 수 없습니다." }, { status: 404 });
    }

    const allSegs = segRes.data ?? [];
    const manualSegs = allSegs.filter((s: any) => s.source === "manual");

    // 1) LLM: 강의 세그먼트
    const parsed = await callClaudeJson(
      "admin/grammar-2026/generate-lecture",
      buildPrompt(unitRes.data, manualSegs, drillRes.data ?? []),
    );
    const generated = sanitizeSegments(parsed);
    if (generated.length === 0) {
      return NextResponse.json({ ok: false, error: "유효한 강의 세그먼트가 생성되지 않았습니다." }, { status: 502 });
    }

    // 2) TTS (한글 설명 + 영문 예문 한 목소리, 스톡)
    const voiceId = bodyVoiceId || process.env.LESSON_VOICE_ID || undefined;
    let audioCount = 0;
    const failures: number[] = [];

    const kept = manualSegs.map((s: any, i: number) => ({
      id: s.id, unit_id: unitId, order_index: i, type: s.type, content: s.content,
      narration: s.narration ?? null, audio_url: s.audio_url ?? null, source: "manual",
    }));
    const fresh = [];
    for (let i = 0; i < generated.length; i++) {
      const seg = generated[i];
      let audio_url: string | null = null;
      // 빈칸 문제: AI 대본은 정답을 말해버릴 수 있어 고정 안내로 대체
      const narration = seg.type === "blank"
        ? "빈칸에 들어갈 알맞은 말을 직접 써 보세요."
        : (seg.narration ?? "").trim();
      if (narration) {
        try {
          const { url } = await generateMixedSpeech(prepareNarrationForTts(narration), {
            voiceId,
            modelId: "eleven_multilingual_v2",
            stability: 0.7,
          });
          audio_url = url;
          audioCount++;
        } catch (e) {
          console.error(`generate-lecture TTS 실패 (seg ${i}):`, e);
          failures.push(i);
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      fresh.push({
        id: randomUUID(), unit_id: unitId, order_index: kept.length + i,
        type: seg.type, content: seg.content, narration, audio_url, source: "ai",
      });
    }
    const rows = [...kept, ...fresh];

    // 3) 교체 (ai만; manual은 위에서 kept로 다시 넣음)
    const del = await db.from("grammar_2026_explanation_segments").delete().eq("unit_id", unitId);
    if (del.error) throw new Error(del.error.message);
    const ins = await insertDroppingMissing(db, "grammar_2026_explanation_segments", rows);
    if (ins.error) throw new Error(ins.error.message);

    return NextResponse.json({
      ok: true,
      segmentCount: rows.length,
      keptManual: kept.length,
      audioCount,
      failures,
      voiceId: voiceId ?? "(스톡 기본)",
      segments: rows.map((r) => ({
        id: r.id, unit_id: r.unit_id, order_index: r.order_index, type: r.type,
        content: r.content, narration: r.narration, audio_url: r.audio_url, source: r.source,
      })),
    });
  } catch (e: any) {
    console.error("GENERATE-LECTURE ERROR", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
