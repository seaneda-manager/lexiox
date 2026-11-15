export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";
import { resolveAcademyStudentId } from "@/lib/workout/perk";

/**
 * GET /api/workout/assignments
 * 로그인한 학생에게 선생님이 내준 게임(취소되지 않은 것)과 진행 현황.
 * 직원이거나 학원 학생 계정이 아니면 빈 목록.
 */
export async function GET() {
  const authed = await getServerSupabase();
  const {
    data: { user },
  } = await authed.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getServiceRoleClient();
  const academyId = await resolveAcademyStudentId(user.id);
  if (!academyId) return NextResponse.json({ assignments: [] });

  const { data: rows, error } = await db
    .from("game_assignments")
    .select("id, style, set_id, mode, level, target_plays, due_date, note, created_at")
    .eq("student_id", academyId)
    .is("cancelled_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const list = rows ?? [];
  if (list.length === 0) return NextResponse.json({ assignments: [] });

  const ids = list.map((r) => r.id as string);
  const setIds = Array.from(new Set(list.map((r) => r.set_id as string | null).filter((v): v is string => !!v)));
  const [attRes, setRes] = await Promise.all([
    db.from("game_attempts").select("assignment_id, score").in("assignment_id", ids),
    setIds.length ? db.from("vocab_sets").select("id, order_index, track_id").in("id", setIds) : Promise.resolve({ data: [] as { id: string; order_index: number | null; track_id: string }[] }),
  ]);
  const trackIds = Array.from(new Set((setRes.data ?? []).map((s) => s.track_id as string)));
  const trackRes = trackIds.length ? await db.from("vocab_tracks").select("id, title").in("id", trackIds) : { data: [] as { id: string; title: string }[] };
  const trackTitle = new Map((trackRes.data ?? []).map((t) => [t.id as string, t.title as string]));
  const setLabel = new Map((setRes.data ?? []).map((s) => [s.id as string, `${trackTitle.get(s.track_id as string) ?? "단어"} Day ${s.order_index ?? "?"}`]));

  const plays = new Map<string, number>();
  const best = new Map<string, number>();
  for (const a of attRes.data ?? []) {
    const k = a.assignment_id as string;
    plays.set(k, (plays.get(k) ?? 0) + 1);
    best.set(k, Math.max(best.get(k) ?? 0, (a.score as number) ?? 0));
  }

  const assignments = list.map((r) => {
    const p = plays.get(r.id as string) ?? 0;
    return {
      id: r.id as string,
      style: r.style as string,
      setId: (r.set_id as string | null) ?? null,
      setLabel: r.set_id ? (setLabel.get(r.set_id as string) ?? "단어장") : null,
      mode: r.mode as string,
      level: r.level as string,
      targetPlays: r.target_plays as number,
      dueDate: (r.due_date as string | null) ?? null,
      note: (r.note as string | null) ?? "",
      plays: p,
      bestScore: best.get(r.id as string) ?? 0,
      done: p >= (r.target_plays as number),
    };
  });
  return NextResponse.json({ assignments });
}
