export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/auth/requireTeacherOrAdmin";
import { getServiceSupabase } from "@/lib/supabase/service";

/** GET /api/teacher/vocab-exams/meta — 출제 폼에 필요한 트랙(Day 범위)/반/학생 */
export async function GET() {
  try {
    await requireTeacherOrAdmin();
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    const status = msg.startsWith("403") ? 403 : msg.startsWith("401") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }

  const db = getServiceSupabase();
  const [tracksRes, setsRes, classesRes, membersRes, studentsRes] = await Promise.all([
    db.from("vocab_tracks").select("id, title").order("created_at", { ascending: false }),
    db.from("vocab_sets").select("track_id, order_index").not("track_id", "is", null).not("order_index", "is", null).limit(20000),
    db.from("academy_classes").select("id, name").order("name"),
    db.from("academy_class_students").select("class_id, student_id").limit(20000),
    db
      .from("academy_students")
      .select("id, display_name, grade, school, auth_user_id, user_id, profile_id")
      .eq("is_active", true)
      .order("display_name"),
  ]);

  const maxDay = new Map<string, number>();
  const minDay = new Map<string, number>();
  for (const s of setsRes.data ?? []) {
    const t = String((s as any).track_id);
    const d = Number((s as any).order_index);
    maxDay.set(t, Math.max(maxDay.get(t) ?? 0, d));
    minDay.set(t, Math.min(minDay.get(t) ?? Infinity, d));
  }

  const tracks = (tracksRes.data ?? [])
    .filter((t: any) => maxDay.has(String(t.id)))
    .map((t: any) => ({
      id: String(t.id),
      title: t.title ?? "(제목 없음)",
      minDay: minDay.get(String(t.id)) ?? 1,
      maxDay: maxDay.get(String(t.id)) ?? 1,
    }));

  const byClass = new Map<string, string[]>();
  for (const m of membersRes.data ?? []) {
    const list = byClass.get((m as any).class_id) ?? [];
    list.push((m as any).student_id);
    byClass.set((m as any).class_id, list);
  }
  const classes = (classesRes.data ?? []).map((c: any) => ({
    id: String(c.id),
    name: c.name as string,
    studentIds: byClass.get(c.id) ?? [],
  }));

  // 로그인 계정(auth uid)이 연결된 학생만 응시 대상이 될 수 있다
  const students = (studentsRes.data ?? [])
    .map((s: any) => ({
      authId: (s.auth_user_id ?? s.user_id ?? s.profile_id) as string | null,
      name: (s.display_name ?? "(이름 없음)") as string,
      grade: (s.grade ?? null) as string | null,
      school: (s.school ?? null) as string | null,
    }))
    .filter(s => !!s.authId);

  return NextResponse.json({ tracks, classes, students });
}
