export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";
import { callClaudeJson, sanitizeSegments, existingSegmentsBlock, insertDroppingMissing } from "@/lib/ai/grammarGen";

function buildPrompt(unit: any, manualSegs: any[]): string {
  return `당신은 한국 학원의 베테랑 영어 문법 강사입니다. 아래 문법 유닛의 **설명 콘텐츠**(설명 + 예문 + 설명 빈칸 팝업퀴즈)를 만드세요.

## 유닛
- 제목(한): ${unit.label_ko}
- 제목(영): ${unit.label_en}
- 설명: ${unit.description ?? "(없음)"}
- 레벨: ${unit.level}
- 관리자 메모(반드시 반영): ${unit.admin_note ?? "(없음)"}

## 관리자가 이미 직접 넣어 유지 중인 세그먼트 (이것과 중복되지 않게, 자연스럽게 이어지도록)
${existingSegmentsBlock(manualSegs)}

## 만들 것: 세그먼트 6~10개
흐름: ①제목/개요 → ②문법 핵심 설명(규칙·형태) → ③예문 2~3개 walkthrough → ④설명 빈칸 팝업퀴즈 2~3개 → ⑤한 줄 요약.

세그먼트 타입:
- "text": 짧은 설명/전환/요약 문단. content = { "text": "한국어 짧은 문장" }
- "board": 칠판 판서(영어 예문/공식). content = { "title"?: "소제목", "lines": [{ "text": "영어 문장 등", "emphasis"?: [{ "from": 문자시작index, "to": 문자끝index, "kind": "highlight"|"circle"|"underline" }] }] }
  - 강조할 핵심 부분(관계사/어미/연결어 등)에 정확한 문자 인덱스로 emphasis.
- "blank": 학생이 직접 채우는 팝업 퀴즈. content = { "prompt": "___ 가 들어간 문장(설명 확인용)", "answer": "정답", "hint_ko"?: "힌트" }

## narration (모든 세그먼트, 필수)
강사가 그 세그먼트를 설명하는 말. 한국어로 자연스럽게. 영어 예문·표현은 그대로 영어로. 1~4문장.

## 출력: 이 JSON만 (다른 텍스트/코드블록 없이)
{ "segments": [ { "type": "board", "narration": "...", "content": { "lines": [{ "text": "...", "emphasis": [] }] } } ] }`;
}

export async function POST(_req: Request, { params }: { params: Promise<{ unitId: string }> }) {
  try {
    const { unitId } = await params;

    const authed = await getServerSupabase();
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const db = getServiceRoleClient();
    const [unitRes, segRes] = await Promise.all([
      db.from("grammar_2026_units").select("*").eq("id", unitId).single(),
      db.from("grammar_2026_explanation_segments").select("*").eq("unit_id", unitId).order("order_index"),
    ]);
    if (unitRes.error || !unitRes.data) {
      return NextResponse.json({ ok: false, error: "유닛을 찾을 수 없습니다." }, { status: 404 });
    }

    const allSegs = segRes.data ?? [];
    const manualSegs = allSegs.filter((s: any) => s.source === "manual");

    const parsed = await callClaudeJson(
      "admin/grammar-2026/generate-explanation",
      buildPrompt(unitRes.data, manualSegs),
    );
    const generated = sanitizeSegments(parsed);
    if (generated.length === 0) {
      return NextResponse.json({ ok: false, error: "유효한 세그먼트가 생성되지 않았습니다." }, { status: 502 });
    }

    // manual 세그먼트는 유지, ai 세그먼트만 교체. manual을 앞에, 생성분을 뒤에 이어붙이고 재정렬.
    const kept = manualSegs.map((s: any, i: number) => ({
      id: s.id,
      unit_id: unitId,
      order_index: i,
      type: s.type,
      content: s.content,
      narration: s.narration ?? null,
      audio_url: s.audio_url ?? null,
      source: "manual",
    }));
    const fresh = generated.map((seg, i) => ({
      id: randomUUID(),
      unit_id: unitId,
      order_index: kept.length + i,
      type: seg.type,
      content: seg.content,
      narration: seg.narration ?? null,
      audio_url: null,
      source: "ai",
    }));
    const rows = [...kept, ...fresh];

    const del = await db.from("grammar_2026_explanation_segments").delete().eq("unit_id", unitId);
    if (del.error) throw new Error(del.error.message);
    const ins = await insertDroppingMissing(db, "grammar_2026_explanation_segments", rows);
    if (ins.error) throw new Error(ins.error.message);

    return NextResponse.json({
      ok: true,
      segmentCount: rows.length,
      keptManual: kept.length,
      segments: rows.map((r) => ({
        id: r.id, unit_id: r.unit_id, order_index: r.order_index, type: r.type,
        content: r.content, narration: r.narration, audio_url: r.audio_url, source: r.source,
      })),
    });
  } catch (e: any) {
    console.error("GENERATE-EXPLANATION ERROR", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
