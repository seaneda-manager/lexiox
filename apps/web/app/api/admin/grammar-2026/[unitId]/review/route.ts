export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

import { NextResponse } from "next/server";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";
import { callClaudeJson, sanitizeSegments, sanitizeDrills } from "@/lib/ai/grammarGen";

function buildPrompt(unit: any, segments: any[], drills: any[]): string {
  const segText = segments
    .map((s, i) => `[segment#${i}] source=${s.source ?? "ai"} type=${s.type}\n${JSON.stringify(s.content)}`)
    .join("\n\n");
  const drillText = drills
    .map(
      (d, i) =>
        `[drill#${i}] type=${d.type}\n문장: ${d.sentence}\n정답: ${d.answer}\n오답: ${JSON.stringify(d.distractors)}\n레이블: ${JSON.stringify(
          (d.grammar_labels ?? []).map((l: any) => ({ ko: l.label_ko, correct: l.is_correct })),
        )}`,
    )
    .join("\n\n");

  return `당신은 두 가지 역할을 동시에 맡습니다:
(A) 경력 많은 영어 문법 **검수자** — 설명이 문법적으로 정확한지, 예문이 자연스러운 원어민 영어이고 해당 문법을 실제로 보여주는지, 빠진 핵심 포인트가 없는지, board 세그먼트의 emphasis(강조 문자범위)가 엉뚱한 자리를 가리키지 않는지, 레벨(${unit.level}) 대비 난이도가 적절한지.
(B) 이 레벨의 **표준~하위권 학생** — blank 세그먼트와 드릴을 정답을 모른 채 실제로 풀어봄. 문맥·설명만으로 정답이 유일하게 확정되는지, 오답 보기가 부당하게 정답처럼 보이지 않는지.

## 유닛
${unit.label_ko} (${unit.label_en}) · 레벨 ${unit.level}
관리자 메모: ${unit.admin_note ?? "(없음)"}

## 설명 세그먼트
${segText || "(없음)"}

## 드릴
${drillText || "(없음)"}

## 할 일
1. 문제점을 issues 배열로. 각 { "target": "segment#N" | "drill#N" | "overall", "severity": "high"|"med"|"low", "note": "한국어 한두 문장" }.
2. 지적한 문제를 실제로 고친 **수정본**을 revised에 넣으세요.
   - revised.segments: 문제가 있으면 **전체 설명 세그먼트 배열**을 고쳐서 (없으면 생략). 형식은 입력의 세그먼트와 동일 (type/content[/narration]). source=manual 세그먼트는 **절대 바꾸지 말고 그대로** 포함.
   - revised.drills: 드릴에 문제가 있으면 **전체 드릴 배열**을 고쳐서 (없으면 생략). 각 { type, sentence, answer, distractors[3], grammar_labels[4] }.
   - 문제가 전혀 없으면 revised는 {} 로.

## 출력: 이 JSON만 (다른 텍스트/코드블록 없이)
{ "issues": [ { "target": "...", "severity": "...", "note": "..." } ],
  "revised": { "segments": [...], "drills": [...] } }`;
}

export async function POST(req: Request, { params }: { params: Promise<{ unitId: string }> }) {
  try {
    const { unitId } = await params;

    const authed = await getServerSupabase();
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const segments: any[] = Array.isArray(body?.segments) ? body.segments : [];
    const drills: any[] = Array.isArray(body?.drills) ? body.drills : [];
    if (segments.length === 0 && drills.length === 0) {
      return NextResponse.json({ ok: false, error: "검수할 콘텐츠가 없습니다." }, { status: 400 });
    }

    const db = getServiceRoleClient();
    const { data: unit } = await db.from("grammar_2026_units").select("*").eq("id", unitId).single();
    if (!unit) return NextResponse.json({ ok: false, error: "유닛을 찾을 수 없습니다." }, { status: 404 });

    const parsed = await callClaudeJson("admin/grammar-2026/review", buildPrompt(unit, segments, drills), 16000);

    const issues = Array.isArray(parsed?.issues)
      ? parsed.issues
          .filter((x: any) => x && x.note)
          .map((x: any) => ({
            target: String(x.target ?? "overall"),
            severity: ["high", "med", "low"].includes(x.severity) ? x.severity : "med",
            note: String(x.note),
          }))
      : [];

    // revised 검증 — 파서를 통과한 것만 반환
    const revised: { segments?: any[]; drills?: any[] } = {};
    if (parsed?.revised?.segments) {
      const s = sanitizeSegments({ segments: parsed.revised.segments });
      if (s.length > 0) revised.segments = s;
    }
    if (parsed?.revised?.drills) {
      const d = sanitizeDrills({ drills: parsed.revised.drills });
      if (d.length > 0) revised.drills = d;
    }

    return NextResponse.json({ ok: true, issues, revised });
  } catch (e: any) {
    console.error("GRAMMAR-REVIEW ERROR", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
