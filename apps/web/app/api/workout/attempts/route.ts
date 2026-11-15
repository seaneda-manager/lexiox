export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";
import { resolveAcademyStudentId } from "@/lib/workout/perk";
import { isGameStyle } from "@/lib/workout/gameCatalog";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const int = (v: unknown, max = 1_000_000) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0;
};

/**
 * POST /api/workout/attempts
 * 게임 한 판이 끝날 때 결과를 기록한다. 학원 학생 계정만(직원 미리보기는 기록하지 않음).
 * body: { style, setId?, assignmentId?, mode?, level?, correct, total, score, detail? }
 */
export async function POST(req: Request) {
  const authed = await getServerSupabase();
  const {
    data: { user },
  } = await authed.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof b.style !== "string" || !isGameStyle(b.style)) return NextResponse.json({ error: "style 오류" }, { status: 400 });

  const db = getServiceRoleClient();
  const academyId = await resolveAcademyStudentId(user.id);
  if (!academyId) return NextResponse.json({ ok: true, skipped: true });

  let assignmentId: string | null = null;
  if (typeof b.assignmentId === "string" && UUID.test(b.assignmentId)) {
    const { data: a } = await db.from("game_assignments").select("id").eq("id", b.assignmentId).eq("student_id", academyId).is("cancelled_at", null).maybeSingle();
    if (a) assignmentId = a.id as string;
  }
  const setId = typeof b.setId === "string" && UUID.test(b.setId) ? b.setId : null;
  const detail = b.detail && typeof b.detail === "object" ? b.detail : null;

  const { error } = await db.from("game_attempts").insert({
    student_id: academyId,
    assignment_id: assignmentId,
    style: b.style,
    set_id: setId,
    mode: typeof b.mode === "string" ? b.mode.slice(0, 20) : null,
    level: typeof b.level === "string" ? b.level.slice(0, 20) : null,
    correct: int(b.correct),
    total: int(b.total),
    score: int(b.score),
    detail,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
