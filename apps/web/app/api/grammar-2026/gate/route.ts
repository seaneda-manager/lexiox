export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { awardPoints } from "@/lib/gamification/awardPoints";
import { GATE_POINTS } from "@/lib/grammar/gate";

/**
 * POST /api/grammar-2026/gate  { unit_id, segment_id, kind: "correct" | "penalty" }
 * 문법 관문(팝업 퀴즈) 결과를 포인트에 반영한다.
 *  - correct: 주관식 정답 → 만점 적립
 *  - penalty: 객관식 오답 → Grammar point 총점에서 감점 (0점 아래로는 내려가지 않음)
 * 같은 빈칸은 하루에 한 번만 반영한다 (새로고침/반복으로 점수 쌓기 방지).
 * 포인트 규칙/함수가 아직 DB에 없으면(마이그레이션 전) 조용히 건너뛴다 — 학습 진행은 막지 않는다.
 */
export async function POST(req: Request) {
  try {
    const { unit_id, segment_id, kind } = await req.json();
    if (!unit_id || !segment_id || (kind !== "correct" && kind !== "penalty")) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }

    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); // KST
    const sourceRef = `gate:${kind}:${unit_id}:${segment_id}:${today}`;

    const admin = getServiceSupabase();
    const { data: dup } = await admin
      .from("student_point_ledger")
      .select("id")
      .eq("student_id", user.id)
      .eq("source_ref", sourceRef)
      .limit(1);
    if (dup && dup.length > 0) return NextResponse.json({ ok: true, applied: 0, duplicate: true });

    if (kind === "correct") {
      const r = await awardPoints({ studentId: user.id, ruleId: "grammar_gate_correct", sourceRef });
      return NextResponse.json({ ok: true, applied: r?.pointsEarned ?? 0 });
    }

    const { data, error } = await admin.rpc("apply_grammar_gate_penalty", {
      p_student_id: user.id,
      p_points: GATE_POINTS.penalty,
      p_source_ref: sourceRef,
      p_metadata: JSON.stringify({ unit_id, segment_id }),
    });
    if (error) return NextResponse.json({ ok: true, applied: 0, skipped: "penalty function missing" });
    return NextResponse.json({ ok: true, applied: -(data as number ?? 0) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
