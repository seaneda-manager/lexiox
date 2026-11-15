export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isStaffRole } from "@/lib/workout/perk";
import { isGameStyle } from "@/lib/workout/gameCatalog";

/**
 * 선생님의 게임 배정.
 *  GET              배정 목록(진행 현황 포함) + 학생 명단 + 단어 과정/Day 목록
 *  POST   { studentIds[], style, setId, mode?, level?, targetPlays?, dueDate?, note? }   (학생마다 한 건씩 생성)
 *  DELETE ?id=      배정 취소(기록은 남는다)
 * 학생 ID 는 academy_students.id.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MODES = ["en-en", "ko-en", "en-ko", "spelling"];
const LEVELS = ["easy", "normal", "hard"];

async function requireStaff() {
  const authed = await getServerSupabase();
  const {
    data: { user },
  } = await authed.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: profile } = await authed.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !isStaffRole(profile.role as string)) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user };
}

export async function GET() {
  const gate = await requireStaff();
  if ("error" in gate) return gate.error;
  const db = getServiceSupabase();

  const [rosterRes, asgRes, tracksRes, setsRes] = await Promise.all([
    db.from("academy_students").select("id, display_name, grade, school").eq("is_active", true).order("display_name"),
    db
      .from("game_assignments")
      .select("id, student_id, style, set_id, mode, level, target_plays, due_date, note, created_at, cancelled_at")
      .is("cancelled_at", null)
      .order("created_at", { ascending: false })
      .limit(300),
    db.from("vocab_tracks").select("id, title").order("title"),
    db.from("vocab_sets").select("id, track_id, order_index").not("order_index", "is", null).order("order_index", { ascending: true }),
  ]);
  if (rosterRes.error) return NextResponse.json({ error: rosterRes.error.message }, { status: 500 });

  const roster = (rosterRes.data ?? []).map((r) => ({ id: String(r.id), name: (r.display_name as string | null) ?? "(이름 없음)", grade: r.grade as string | null, school: r.school as string | null }));
  const nameBy = new Map(roster.map((r) => [r.id, r.name]));
  const trackTitle = new Map((tracksRes.data ?? []).map((t) => [t.id as string, t.title as string]));
  const setLabel = new Map((setsRes.data ?? []).map((s) => [s.id as string, `${trackTitle.get(s.track_id as string) ?? "단어"} Day ${s.order_index}`]));

  const ids = (asgRes.data ?? []).map((a) => a.id as string);
  const attRes = ids.length ? await db.from("game_attempts").select("assignment_id, score, created_at").in("assignment_id", ids) : { data: [] as { assignment_id: string; score: number; created_at: string }[] };
  const plays = new Map<string, number>();
  const best = new Map<string, number>();
  const last = new Map<string, string>();
  for (const a of attRes.data ?? []) {
    const k = a.assignment_id as string;
    plays.set(k, (plays.get(k) ?? 0) + 1);
    best.set(k, Math.max(best.get(k) ?? 0, (a.score as number) ?? 0));
    if (!last.get(k) || (a.created_at as string) > last.get(k)!) last.set(k, a.created_at as string);
  }

  const assignments = (asgRes.data ?? []).map((a) => ({
    id: a.id as string,
    studentId: a.student_id as string,
    studentName: nameBy.get(a.student_id as string) ?? "(비활성/알 수 없음)",
    style: a.style as string,
    setLabel: a.set_id ? (setLabel.get(a.set_id as string) ?? "단어장") : null,
    mode: a.mode as string,
    level: a.level as string,
    targetPlays: a.target_plays as number,
    dueDate: (a.due_date as string | null) ?? null,
    note: (a.note as string | null) ?? "",
    createdAt: a.created_at as string,
    plays: plays.get(a.id as string) ?? 0,
    bestScore: best.get(a.id as string) ?? 0,
    lastPlayedAt: last.get(a.id as string) ?? null,
  }));

  const tracks = (tracksRes.data ?? [])
    .map((t) => ({
      id: t.id as string,
      title: t.title as string,
      sets: (setsRes.data ?? []).filter((s) => s.track_id === t.id).map((s) => ({ id: s.id as string, day: s.order_index as number })),
    }))
    .filter((t) => t.sets.length > 0);

  return NextResponse.json({ ok: true, students: roster, assignments, tracks });
}

export async function POST(req: Request) {
  const gate = await requireStaff();
  if ("error" in gate) return gate.error;

  const b = (await req.json().catch(() => ({}))) as {
    studentIds?: unknown;
    style?: unknown;
    setId?: unknown;
    mode?: unknown;
    level?: unknown;
    targetPlays?: unknown;
    dueDate?: unknown;
    note?: unknown;
  };
  const studentIds = Array.isArray(b.studentIds) ? Array.from(new Set(b.studentIds.filter((v): v is string => typeof v === "string" && UUID.test(v)))) : [];
  if (studentIds.length === 0) return NextResponse.json({ error: "학생을 고르세요" }, { status: 400 });
  if (studentIds.length > 200) return NextResponse.json({ error: "한 번에 200명까지" }, { status: 400 });
  if (typeof b.style !== "string" || !isGameStyle(b.style)) return NextResponse.json({ error: "게임을 고르세요" }, { status: 400 });
  if (typeof b.setId !== "string" || !UUID.test(b.setId)) return NextResponse.json({ error: "단어 범위(Day)를 고르세요" }, { status: 400 });
  const mode = typeof b.mode === "string" && MODES.includes(b.mode) ? b.mode : "en-en";
  const level = typeof b.level === "string" && LEVELS.includes(b.level) ? b.level : "normal";
  const target = Math.min(20, Math.max(1, Math.round(Number(b.targetPlays ?? 1)) || 1));
  const due = typeof b.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.dueDate) ? b.dueDate : null;
  const note = typeof b.note === "string" && b.note.trim() ? b.note.trim().slice(0, 200) : null;

  const db = getServiceSupabase();
  const { data: set } = await db.from("vocab_sets").select("id").eq("id", b.setId).maybeSingle();
  if (!set) return NextResponse.json({ error: "단어 범위를 찾을 수 없어요" }, { status: 404 });
  const { data: valid } = await db.from("academy_students").select("id").in("id", studentIds);
  const validIds = (valid ?? []).map((v) => String(v.id));
  if (validIds.length === 0) return NextResponse.json({ error: "유효한 학생이 없어요" }, { status: 404 });

  const { error } = await db.from("game_assignments").insert(
    validIds.map((sid) => ({ student_id: sid, style: b.style as string, set_id: b.setId as string, mode, level, target_plays: target, due_date: due, note, assigned_by: gate.user.id })),
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, created: validIds.length });
}

export async function DELETE(req: Request) {
  const gate = await requireStaff();
  if ("error" in gate) return gate.error;
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !UUID.test(id)) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  const db = getServiceSupabase();
  const { error } = await db.from("game_assignments").update({ cancelled_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
