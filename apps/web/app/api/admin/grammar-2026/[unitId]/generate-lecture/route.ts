export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";
import { generateSpeech, saveSpeechAudio } from "@/lib/elevenlabs/generate-speech";
import { synthesizeNarration } from "@/lib/elevenlabs/synthesize";
import { stripTags } from "@/lib/elevenlabs/mixedText";
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
- "blank": 학생이 직접 채우는 빈칸. content = { "prompt": "___ 문장", "answer": "정답", "hint_ko"?: "힌트" }

## narration (필수, 모든 세그먼트)
강사의 말. 한국어. 1~4문장.
**한국어 문장 안에 들어가는 영어 단어·표현·예문은 반드시 [en]...[/en] 로 감싸세요.** 음성 합성이 영어 구간만 미국 원어민 발음으로 읽도록 하기 위한 표시입니다.
- 단어: "[en]he[/en]는 '그는'이라는 뜻이에요."
- 예문 전체: "예를 들어 [en]The cost of living is high.[/en] 이 문장에서 주어는 cost예요." → 마지막 "cost"도 영어이므로 "[en]cost[/en]예요"처럼 감쌉니다.
- 영어를 한글로 풀어 쓰지 마세요. 한국어 조사(는/이/가/를 등)는 [en] 바깥에 붙이세요.

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
    let bodyEnVoiceId: string | undefined;
    let bodyModelId: string | undefined;
    let splitEnglish = true; // 한국어 설명 속 영어 구간을 따로 영어로 읽힌다 (기본 켜짐)
    try {
      const body = await req.json();
      if (body?.voiceId && typeof body.voiceId === "string") bodyVoiceId = body.voiceId.trim();
      if (body?.enVoiceId && typeof body.enVoiceId === "string") bodyEnVoiceId = body.enVoiceId.trim();
      if (body?.modelId && typeof body.modelId === "string") bodyModelId = body.modelId.trim();
      if (body?.splitEnglish === false) splitEnglish = false;
    } catch {
      /* 바디 없음 */
    }
    const idOk = (v?: string) => !v || /^[A-Za-z0-9]{8,40}$/.test(v);
    if (!idOk(bodyVoiceId) || !idOk(bodyEnVoiceId))
      return NextResponse.json({ ok: false, error: "Voice ID 형식이 올바르지 않습니다." }, { status: 400 });
    if (bodyModelId && !/^[A-Za-z0-9_.\-]{3,60}$/.test(bodyModelId))
      return NextResponse.json({ ok: false, error: "모델 ID 형식이 올바르지 않습니다." }, { status: 400 });

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
    const enVoiceId = bodyEnVoiceId || process.env.LESSON_VOICE_ID_EN || undefined;
    const modelId = bodyModelId || process.env.LESSON_TTS_MODEL_ID || "eleven_multilingual_v2";
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
      // narrationTagged: [en] 표시가 있는 음성용 대본 / narration: 자막으로 저장할 표시 없는 대본
      const narrationTagged = (seg.narration ?? "").trim();
      const narration = stripTags(narrationTagged).replace(/\s+/g, " ").trim();
      if (narration) {
        try {
          if (splitEnglish && voiceId) {
            // 표시가 있으면 그 구간대로, 없으면 알파벳 구간을 자동으로 찾아 영어로 읽힌다
            const mode = /\[en\]/i.test(narrationTagged) ? "tags" : "auto";
            const synth = await synthesizeNarration(narrationTagged, { koVoiceId: voiceId, enVoiceId, modelId, mode });
            const saved = await saveSpeechAudio(synth.audio);
            audio_url = saved.url;
          } else {
            const { url } = await generateSpeech(narration, { voiceId, modelId });
            audio_url = url;
          }
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
      enVoiceId: splitEnglish && voiceId ? (enVoiceId ?? "(한국어 목소리와 동일)") : null,
      modelId,
      splitEnglish: splitEnglish && !!voiceId,
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
