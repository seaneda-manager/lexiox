export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

import { NextResponse } from "next/server";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";
import { callClaudeJson, sanitizeDrills, existingSegmentsBlock } from "@/lib/ai/grammarGen";

function unitContext(unit: any, segs: any[]): string {
  return `## 문법 유닛 맥락
- 주제: ${unit.label_ko} (${unit.label_en}) · 레벨 ${unit.level}
- 관리자 메모: ${unit.admin_note ?? "(없음)"}
- 설명 세그먼트:
${existingSegmentsBlock(segs)}`;
}

const DRILL_SPEC = `각 드릴은 grammar_2026_drills 행. **type은 반드시 fill 또는 judgment 둘 중 하나** (reorder/correction 금지):
- **fill (빈칸 선택)**: sentence에 정답 위치를 정확히 "___"로 표시 (정답 단어를 문장에 절대 넣지 말 것).
  answer=빈칸에 들어갈 말. distractors=그럴듯한 오답 3개 (같은 품사/범주, 정답과 안 겹치게).
- **judgment (정오 판단)**: sentence는 완전한 문장. answer는 "correct" 또는 "incorrect" 만.
  distractors=[] (빈 배열).
- grammar_labels: 정확히 4개 = 정답 문법개념 레이블 1개(is_correct:true) + 그럴듯한 오답 레이블 3개(false).
  각 { label_ko, label_en, is_correct }. 정답 레이블은 이 유닛의 문법 개념.

출력은 이 JSON만:
{ "drills": [
  { "type":"fill", "sentence":"The book ___ I read was good.", "answer":"that", "distractors":["who","whom","what"],
    "grammar_labels":[{"label_ko":"목적격 관계대명사","label_en":"Objective Relative Pronoun","is_correct":true},
    {"label_ko":"주격 관계대명사","label_en":"Subjective RP","is_correct":false}, ...] },
  { "type":"judgment", "sentence":"The man who I met was kind.", "answer":"correct", "distractors":[],
    "grammar_labels":[ ... ] }
] }`;

export async function POST(req: Request, { params }: { params: Promise<{ unitId: string }> }) {
  try {
    const { unitId } = await params;

    const authed = await getServerSupabase();
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const seed: string = String(body?.seed ?? "").trim();
    const count: number = Math.max(1, Math.min(Number(body?.count) || 4, 12));
    const partial = body?.partial; // 개별 드릴 "AI 완성"용

    const db = getServiceRoleClient();
    const [unitRes, segRes] = await Promise.all([
      db.from("grammar_2026_units").select("*").eq("id", unitId).single(),
      db.from("grammar_2026_explanation_segments").select("type,content").eq("unit_id", unitId).order("order_index"),
    ]);
    if (unitRes.error || !unitRes.data) {
      return NextResponse.json({ ok: false, error: "유닛을 찾을 수 없습니다." }, { status: 404 });
    }
    const ctx = unitContext(unitRes.data, segRes.data ?? []);

    let prompt: string;
    if (partial && partial.sentence) {
      prompt = `${ctx}

아래 드릴의 빈 필드를 채워 완성하세요 (type/sentence는 유지, answer·distractors·grammar_labels 채우기).
현재: ${JSON.stringify(partial)}

${DRILL_SPEC}
반드시 "drills"에 1개만.`;
    } else {
      if (!seed) return NextResponse.json({ ok: false, error: "seed(문장/포인트/유형)를 입력하세요." }, { status: 400 });
      prompt = `${ctx}

관리자가 정한 드릴 재료(문장 목록 / 문법 포인트 / 원하는 유형):
"""
${seed}
"""

이 재료로 드릴 ${count}개를 만드세요. 관리자가 준 문장은 그대로 살리되, 문제화(빈칸·보기)는 당신이.

${DRILL_SPEC}`;
    }

    const parsed = await callClaudeJson("admin/grammar-2026/generate-drills", prompt, 12000);
    const drills = sanitizeDrills(parsed);
    if (drills.length === 0) {
      return NextResponse.json({ ok: false, error: "유효한 드릴이 생성되지 않았습니다." }, { status: 502 });
    }

    // 저장하지 않고 클라이언트에 반환 (편집기 state에 병합 후 "전체 저장"으로 영속화)
    return NextResponse.json({ ok: true, drills });
  } catch (e: any) {
    console.error("GENERATE-DRILLS ERROR", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
